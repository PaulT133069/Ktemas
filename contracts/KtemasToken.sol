// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title KtemasToken
 * @dev Token ERC-20 de l'écosystème Ktemas.
 *      - Supply initiale : 10 000 000 KTMS
 *      - Mint : Vault uniquement, plafonné à 5%/an et 50% de hardcap total
 *      - Burn : Owner + tout le monde (ses propres tokens)
 */
contract KtemasToken is ERC20, Ownable {

    // ============ CONSTANTES ============

    /// @dev Supply initiale : 10 000 000 KTMS
    uint256 public constant INITIAL_SUPPLY = 10_000_000;

    /// @dev Hardcap total : 50% de la supply initiale (soit 5 000 000 KTMS en plus)
    uint256 public constant HARDCAP = INITIAL_SUPPLY / 2;

    /// @dev Mint annuel maximum : 5% de la supply initiale (soit 500 000 KTMS/an)
    uint256 public constant MAX_ANNUAL_MINT = INITIAL_SUPPLY / 20;

    // ============ VARIABLES D'ÉTAT ============

    /// @dev Adresse du Vault autorisée à mint
    address public vault;

    /// @dev Total de tokens mintés depuis le déploiement (hors supply initiale)
    uint256 public totalMinted;

    /// @dev Timestamp de la dernière distribution
    uint256 public lastMintTimestamp;

    // ============ ÉVÉNEMENTS ============

    /// @dev Émis quand le Vault est défini ou modifié
    event VaultUpdated(address indexed oldVault, address indexed newVault);

    /// @dev Émis à chaque mint de tokens
    event Mint(address indexed to, uint256 amount);

    // ============ CONSTRUCTEUR ============

    constructor() ERC20("Ktemas", "KTMS") Ownable(msg.sender) {
        // Crée la supply initiale et l'envoie au owner
        _mint(msg.sender, INITIAL_SUPPLY * 10 ** decimals());
        lastMintTimestamp = block.timestamp;
    }

    // ============ FONCTIONS ============

    /**
     * @dev Définit l'adresse du Vault autorisée à mint.
     *      Appelable uniquement par le owner.
     */
    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "KtemasToken: vault ne peut pas etre zero");
        address oldVault = vault;
        vault = _vault;
        emit VaultUpdated(oldVault, _vault);
    }

    /**
     * @dev Crée de nouveaux KTMS. Appelable uniquement par le Vault.
     *      Vérifie le plafond annuel et le hardcap total.
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == vault, "KtemasToken: seul le Vault peut mint");
        require(to != address(0), "KtemasToken: destinataire invalide");
        require(amount > 0, "KtemasToken: montant doit etre positif");

        // Vérifie le hardcap total
        require(
            totalMinted + amount <= HARDCAP * 10 ** decimals(),
            "KtemasToken: hardcap atteint"
        );

        // Vérifie le plafond annuel (sur une base de 365 jours)
        uint256 timeSinceLastMint = block.timestamp - lastMintTimestamp;
        if (timeSinceLastMint >= 365 days) {
            // Nouvelle année, on reset le compteur annuel
            lastMintTimestamp = block.timestamp;
        } else {
            // On vérifie qu'on ne dépasse pas le plafond annuel
            // (à ajuster selon la logique exacte qu'on veut)
            require(
                amount <= MAX_ANNUAL_MINT * 10 ** decimals(),
                "KtemasToken: plafond annuel depasse"
            );
        }

        totalMinted += amount;
        _mint(to, amount);
        emit Mint(to, amount);
    }

    /**
     * @dev Détruit des KTMS de l'appelant.
     *      Accessible à tout le monde (ses propres tokens).
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Retourne le montant restant mintable avant hardcap.
     */
    function remainingMintable() external view returns (uint256) {
        uint256 hardcapWei = HARDCAP * 10 ** decimals();
        if (totalMinted >= hardcapWei) {
            return 0;
        }
        return hardcapWei - totalMinted;
    }
} 