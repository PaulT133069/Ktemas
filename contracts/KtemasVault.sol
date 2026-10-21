// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title KtemasVault
 * @dev Coffre-fort de l'écosystème Ktemas.
 *      - Dépôts de KTMS
 *      - Retraits avec délai (48h/72h)
 *      - Récompenses de staking
 */
contract KtemasVault is Ownable, ReentrancyGuard {

    // ============ CONSTANTES ============

    /// @dev Délai de retrait : 48 heures
    uint256 public constant WITHDRAWAL_DELAY = 48 hours;

    /// @dev Frais de retrait : 0,5% (en basis points : 50 = 0,5%)
    uint256 public constant WITHDRAWAL_FEE_BPS = 50;

    /// @dev Base pour les basis points (10000 = 100%)
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @dev Taux de récompense annuel : 5% (en basis points : 500 = 5%)
    uint256 public constant ANNUAL_REWARD_BPS = 500;

    /// @dev Durée minimum de staking : 90 jours
    uint256 public constant MIN_STAKING_DURATION = 90 days;

    /// @dev Seuil minimum de dépôt (ajustable par le owner)
    uint256 public minDepositThreshold;

    // ============ VARIABLES D'ÉTAT ============

    /// @dev Token KTMS accepté par le Vault
    IERC20 public immutable ktmsToken;

    /// @dev Adresse de la trésorerie (reçoit les frais)
    address public treasury;

    /// @dev Structure d'un dépôt
    struct Deposit {
        uint256 amount;
        uint256 timestamp;
    }
    /// @dev Structure d'une demande de retrait
    struct WithdrawalRequest {
        uint256 amount;
        uint256 requestTimestamp;
        bool active;
    }
    /// @dev Mapping des dépôts par adresse
    mapping(address => Deposit) public deposits;
    
    /// @dev Mapping des demandes de retrait par adresse
    mapping(address => WithdrawalRequest) public withdrawalRequests;
    
    /// @dev Total des KTMS déposés dans le Vault
    uint256 public totalDeposits;
    
    /// @dev Timestamp de la dernière distribution
    uint256 public lastDistributionTimestamp;

    /// @dev Total des récompenses distribuées
    uint256 public totalRewardsDistributed;

    /// @dev Récompenses en attente par utilisateur
    mapping(address => uint256) public pendingRewards;

    // ============ ÉVÉNEMENTS ============

    /// @dev Émis à chaque dépôt
    event DepositMade(address indexed user, uint256 amount, uint256 timestamp);

    /// @dev Émis quand la trésorerie est mise à jour
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    /// @dev Émis quand le seuil minimum est modifié
    event MinDepositThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    /// @dev Émis quand une demande de retrait est créée
    event WithdrawalRequested(address indexed user, uint256 amount, uint256 executeAfter);

    /// @dev Émis quand un retrait est exécuté
    event WithdrawalExecuted(address indexed user, uint256 amount, uint256 fee);

    /// @dev Émis quand une demande de retrait est annulée
    event WithdrawalCancelled(address indexed user, uint256 amount);

    /// @dev Émis quand des récompenses sont distribuées
    event RewardsDistributed(uint256 totalAmount, uint256 timestamp);

    /// @dev Émis quand un utilisateur réclame ses récompenses
    event RewardsClaimed(address indexed user, uint256 amount);

    // ============ CONSTRUCTEUR ============

    constructor(address _ktmsToken, address _treasury) Ownable(msg.sender) {
        require(_ktmsToken != address(0), "KtemasVault: token invalide");
        require(_treasury != address(0), "KtemasVault: tresorerie invalide");
        ktmsToken = IERC20(_ktmsToken);
        treasury = _treasury;
        minDepositThreshold = 0; // À ajuster plus tard
    }

    // ============ FONCTIONS OWNER ============

    /**
     * @dev Met à jour l'adresse de la trésorerie.
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "KtemasVault: tresorerie invalide");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @dev Met à jour le seuil minimum de dépôt.
     */
    function setMinDepositThreshold(uint256 _threshold) external onlyOwner {
        uint256 oldThreshold = minDepositThreshold;
        minDepositThreshold = _threshold;
        emit MinDepositThresholdUpdated(oldThreshold, _threshold);
    }

    // ============ FONCTIONS DE DÉPÔT ============

    /**
     * @dev Dépose des KTMS dans le Vault.
     *      L'utilisateur doit d'abord approuver le Vault.
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "KtemasVault: montant doit etre positif");
        require(
            amount >= minDepositThreshold,
            "KtemasVault: montant inferieur au seuil minimum"
        );

        // Transfert des KTMS de l'utilisateur vers le Vault
        bool success = ktmsToken.transferFrom(msg.sender, address(this), amount);
        require(success, "KtemasVault: transfert echoue");

        // Mise à jour du dépôt
        deposits[msg.sender].amount += amount;
        deposits[msg.sender].timestamp = block.timestamp;
        totalDeposits += amount;

        emit DepositMade(msg.sender, amount, block.timestamp);
    }

    // ============ FONCTIONS DE RETRAIT ============

    /**
     * @dev Demande un retrait. Le retrait sera exécutable après 48h.
     */
    function requestWithdrawal(uint256 amount) external nonReentrant {
        require(amount > 0, "KtemasVault: montant doit etre positif");
        require(
            deposits[msg.sender].amount >= amount,
            "KtemasVault: solde insuffisant"
        );
        require(
            !withdrawalRequests[msg.sender].active,
            "KtemasVault: demande deja active"
        );

        uint256 executeAfter = block.timestamp + WITHDRAWAL_DELAY;

        withdrawalRequests[msg.sender] = WithdrawalRequest({
            amount: amount,
            requestTimestamp: block.timestamp,
            active: true
        });

        emit WithdrawalRequested(msg.sender, amount, executeAfter);
    }

    /**
     * @dev Exécute un retrait après le délai de 48h.
     *      Les frais de 0,5% sont envoyés à la trésorerie.
     */
    function executeWithdrawal() external nonReentrant {
        WithdrawalRequest storage request = withdrawalRequests[msg.sender];

        require(request.active, "KtemasVault: aucune demande active");
        require(
            block.timestamp >= request.requestTimestamp + WITHDRAWAL_DELAY,
            "KtemasVault: delai non ecoule"
        );

        uint256 amount = request.amount;
        uint256 fee = (amount * WITHDRAWAL_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountAfterFee = amount - fee;

        // Mise à jour du dépôt
        deposits[msg.sender].amount -= amount;
        totalDeposits -= amount;

        // Désactivation de la demande
        request.active = false;
        request.amount = 0;

        // Transfert des frais à la trésorerie
        if (fee > 0) {
            bool feeSuccess = ktmsToken.transfer(treasury, fee);
            require(feeSuccess, "KtemasVault: transfert des frais echoue");
        }

        // Transfert du montant net à l'utilisateur
        bool success = ktmsToken.transfer(msg.sender, amountAfterFee);
        require(success, "KtemasVault: transfert echoue");

        emit WithdrawalExecuted(msg.sender, amountAfterFee, fee);
    }

    /**
     * @dev Annule une demande de retrait en attente.
     */
    function cancelWithdrawal() external nonReentrant {
        WithdrawalRequest storage request = withdrawalRequests[msg.sender];

        require(request.active, "KtemasVault: aucune demande active");

        request.active = false;
        request.amount = 0;

        emit WithdrawalCancelled(msg.sender, request.amount);
    }

    /**
     * @dev Retourne la demande de retrait d'une adresse.
     */
    function getWithdrawalRequest(address user)
        external
        view
        returns (uint256, uint256, bool)
    {
        WithdrawalRequest memory r = withdrawalRequests[user];
        return (r.amount, r.requestTimestamp, r.active);
    }

    /**
     * @dev Retourne le dépôt d'une adresse.
     */
    function getDeposit(address user) external view returns (uint256, uint256) {
        Deposit memory d = deposits[user];
        return (d.amount, d.timestamp);
    }

    /**
     * @dev Retourne le solde de KTMS du Vault.
     */
    function vaultBalance() external view returns (uint256) {
        return ktmsToken.balanceOf(address(this));
    }

    // ============ FONCTIONS DE RÉCOMPENSES ============

    /**
     * @dev Calcule les récompenses d'un utilisateur.
     */
    function calculateRewards(address user) public view returns (uint256) {
        Deposit memory d = deposits[user];
        if (d.amount == 0 || d.timestamp == 0) {
            return 0;
        }

        uint256 stakingDuration = block.timestamp - d.timestamp;
        if (stakingDuration < MIN_STAKING_DURATION) {
            return 0;
        }

        // Calcul : amount * taux * durée / (365 jours * 10000)
        uint256 rewards = (d.amount * ANNUAL_REWARD_BPS * stakingDuration) /
            (365 days * BPS_DENOMINATOR);

        return rewards;
    }

    /**
     * @dev Distribue les récompenses à tous les déposants.
     *      Appelable uniquement par le owner.
     *      Le Vault doit être autorisé à mint sur le token.
     */
    function distributeRewards() external onlyOwner nonReentrant {
        require(
            block.timestamp >= lastDistributionTimestamp + 90 days,
            "KtemasVault: distribution trop frequente"
        );

        // Calcul du total des récompenses à distribuer
        uint256 totalRewards = 0;
        // Note : dans une vraie implémentation, on itérerait sur les utilisateurs.
        // Pour l'instant, on se contente de marquer la distribution.

        lastDistributionTimestamp = block.timestamp;
        totalRewardsDistributed += totalRewards;

        emit RewardsDistributed(totalRewards, block.timestamp);
    }

    /**
     * @dev Permet à un utilisateur de réclamer ses récompenses.
     *      (Fonction simplifiée pour l'instant)
     */
    function claimRewards() external nonReentrant {
        uint256 rewards = pendingRewards[msg.sender];
        require(rewards > 0, "KtemasVault: aucune recompense");

        pendingRewards[msg.sender] = 0;

        emit RewardsClaimed(msg.sender, rewards);
    }
}