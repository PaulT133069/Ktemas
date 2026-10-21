// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title KtemasTreasury
 * @dev Trésorerie de l'écosystème Ktemas.
 *      - Reçoit les frais de retrait du Vault (en KTMS)
 *      - Permet au owner de retirer les fonds après un délai de 48h (timelock)
 *      - Émet des événements pour chaque mouvement
 */
contract KtemasTreasury is Ownable {

    // ============ CONSTANTES ============

    /// @dev Délai de timelock : 48 heures
    uint256 public constant TIMELOCK_DURATION = 48 hours;

    // ============ VARIABLES D'ÉTAT ============

    /// @dev Token KTMS accepté par la trésorerie
    IERC20 public immutable ktmsToken;

    /// @dev Structure pour une demande de retrait en attente
    struct WithdrawalRequest {
        address to;
        uint256 amount;
        uint256 executeAfter;
        bool executed;
    }

    /// @dev Compteur de demandes de retrait
    uint256 public withdrawalRequestCount;

    /// @dev Mapping des demandes de retrait
    mapping(uint256 => WithdrawalRequest) public withdrawalRequests;

    // ============ ÉVÉNEMENTS ============

    /// @dev Émis quand la trésorerie reçoit des frais
    event FeesReceived(address indexed from, uint256 amount);

    /// @dev Émis quand une demande de retrait est créée
    event WithdrawalRequested(
        uint256 indexed requestId,
        address indexed to,
        uint256 amount,
        uint256 executeAfter
    );

    /// @dev Émis quand un retrait est exécuté
    event FeesWithdrawn(
        uint256 indexed requestId,
        address indexed to,
        uint256 amount
    );

    // ============ CONSTRUCTEUR ============

    constructor(address _ktmsToken) Ownable(msg.sender) {
        require(_ktmsToken != address(0), "KtemasTreasury: token invalide");
        ktmsToken = IERC20(_ktmsToken);
    }

    // ============ FONCTIONS ============

    /**
     * @dev Reçoit des frais. Appelable par n'importe qui (typiquement le Vault).
     *      Le transfert doit être fait en amont via `approve` + `transferFrom`.
     */
    function receiveFees(uint256 amount) external {
        require(amount > 0, "KtemasTreasury: montant doit etre positif");

        // Transfert des KTMS depuis l'appelant vers la trésorerie
        bool success = ktmsToken.transferFrom(msg.sender, address(this), amount);
        require(success, "KtemasTreasury: transfert echoue");

        emit FeesReceived(msg.sender, amount);
    }

    /**
     * @dev Crée une demande de retrait. Le owner doit attendre 48h avant d'exécuter.
     */
    function requestWithdrawal(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "KtemasTreasury: destinataire invalide");
        require(amount > 0, "KtemasTreasury: montant doit etre positif");
        require(
            ktmsToken.balanceOf(address(this)) >= amount,
            "KtemasTreasury: solde insuffisant"
        );

        uint256 requestId = withdrawalRequestCount++;
        uint256 executeAfter = block.timestamp + TIMELOCK_DURATION;

        withdrawalRequests[requestId] = WithdrawalRequest({
            to: to,
            amount: amount,
            executeAfter: executeAfter,
            executed: false
        });

        emit WithdrawalRequested(requestId, to, amount, executeAfter);
    }

    /**
     * @dev Exécute une demande de retrait après le délai de 48h.
     */
    function executeWithdrawal(uint256 requestId) external onlyOwner {
        WithdrawalRequest storage request = withdrawalRequests[requestId];

        require(request.to != address(0), "KtemasTreasury: demande inexistante");
        require(!request.executed, "KtemasTreasury: deja executee");
        require(
            block.timestamp >= request.executeAfter,
            "KtemasTreasury: timelock non ecoule"
        );

        request.executed = true;

        bool success = ktmsToken.transfer(request.to, request.amount);
        require(success, "KtemasTreasury: transfert echoue");

        emit FeesWithdrawn(requestId, request.to, request.amount);
    }

    /**
     * @dev Retourne le solde de KTMS de la trésorerie.
     */
    function balance() external view returns (uint256) {
        return ktmsToken.balanceOf(address(this));
    }
}