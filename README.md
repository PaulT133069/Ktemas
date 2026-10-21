# Ktemas (KTMS)

> Un écosystème crypto complet : token ERC-20, coffre-fort, trésorerie et gouvernance décentralisée.

## 📖 À propos

Ktemas est un projet d'apprentissage et de construction dans l'écosystème blockchain. Il vise à créer un **coffre-fort numérique communautaire** où les détenteurs de KTMS peuvent déposer leurs tokens, recevoir des récompenses et participer à la gouvernance du projet.

**Statut :** En construction (testnet uniquement).

## 🏗️ Architecture

Le projet est composé de **4 contrats intelligents** :

| Contrat | Rôle |
|---|---|
| **`KtemasToken.sol`** | Token ERC-20 (KTMS) avec hardcap et mint contrôlé |
| **`KtemasTreasury.sol`** | Trésorerie sécurisée (reçoit les frais, timelock 48h) |
| **`KtemasVault.sol`** | Coffre-fort (dépôts, retraits 48h/0,5%, récompenses) |
| **`KtemasGovernment.sol`** | Gouvernance (propositions, votes, transition communautaire) |

## 🚀 Informations rapides

| Champ | Valeur |
|---|---|
| **Nom** | Ktemas |
| **Symbole** | KTMS |
| **Supply** | 10 000 000 KTMS |
| **Réseau (test)** | Ethereum Sepolia + Base Sepolia |
| **Standard** | ERC-20 |
| **Tests** | 42 tests (unitaires, intégration, Fork) ✅ |

## 🛠️ Stack technique

- **Solidity** `^0.8.20`
- **OpenZeppelin Contracts** v5
- **Hardhat 3** (compilation, tests, déploiement)
- **Viem** (interaction avec la blockchain)
- **TypeScript**
- **Slither** (audit de sécurité)

## 📁 Structure du projet

Ktemas/
├── contracts/
│ ├── KtemasToken.sol
│ ├── KtemasTreasury.sol
│ ├── KtemasVault.sol
│ └── KtemasGovernment.sol
├── scripts/
│ └── deploy.ts
├── test/
│ ├── KtemasToken.ts
│ ├── KtemasTreasury.ts
│ ├── KtemasVault.ts
│ ├── KtemasVaultWithdrawal.ts
│ ├── KtemasVaultRewards.ts
│ ├── KtemasGovernment.ts
│ ├── KtemasIntegration.ts
│ └── KtemasFork.ts
├── hardhat.config.ts
└── KTEMAS_INFO.md

## 🔗 Liens utiles

- **Ethereum Sepolia** : [Voir le token](https://sepolia.etherscan.io/token/0x95a1c641acd3ee27354012a7e2d48a313b8ef639)
- **Base Sepolia** : [Voir le token](https://sepolia.basescan.org/address/0x733d20aec0b4d1cc1ee649b8353f511ae42d77fd)

## 🛡️ Sécurité

- **Audit Slither** : 0 faille critique, 0 faille moyenne
- **Tests** : 42 tests (unitaires, intégration, Fork)

## 📜 Licence

MIT