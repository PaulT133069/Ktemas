# Ktemas (KTMS)

## Informations générales

| Champ | Valeur |
|---|---|
| **Nom** | Ktemas |
| **Symbole** | KTMS |
| **Supply totale** | 10 000 000 KTMS |
| **Décimales** | 18 |
| **Standard** | ERC-20 |
| **Hardcap** | 50% de la supply initiale (5 000 000 KTMS max en plus) |
| **Mint annuel max** | 5% de la supply initiale (500 000 KTMS/an) |

## Écosystème (4 contrats)

L'écosystème Ktemas est composé de 4 contrats intelligents qui travaillent ensemble :

| Contrat | Rôle | Adresse (Ethereum Sepolia) |
|---|---|---|
| **KtemasToken** | Token ERC-20 (KTMS) | `0xc7b1690b4821812c224b93720f8ccb3505f0ce41` |
| **KtemasTreasury** | Trésorerie (reçoit les frais, timelock 48h) | `0x3c6996514a7296f74a4031f36ce6960dbf701ec1` |
| **KtemasVault** | Coffre-fort (dépôts, retraits 48h/0,5%, récompenses) | `0xaf82f9bae4bf76b40201370619fec2f8f1a84077` |
| **KtemasGovernment** | Gouvernance (propositions, votes) | `0x20857f35acb43488772594d93d61c2f9b1440327` |

## Déploiement

| Champ | Valeur |
|---|---|
| **Réseau** | Ethereum Sepolia (testnet) |
| **Chain ID** | 11155111 |
| **Date de déploiement** | 20 octobre 2026 |
| **Vérifié sur Etherscan** | ✅ Oui (les 4 contrats) |

**Liens Etherscan :**
- [Token](https://sepolia.etherscan.io/address/0xc7b1690b4821812c224b93720f8ccb3505f0ce41)
- [Treasury](https://sepolia.etherscan.io/address/0x3c6996514a7296f74a4031f36ce6960dbf701ec1)
- [Vault](https://sepolia.etherscan.io/address/0xaf82f9bae4bf76b40201370619fec2f8f1a84077)
- [Government](https://sepolia.etherscan.io/address/0x20857f35acb43488772594d93d61c2f9b1440327)

## Tests

| Catégorie | Nombre de tests | Statut |
|---|---|---|
| KtemasToken | 6 | ✅ |
| KtemasTreasury | 5 | ✅ |
| KtemasVault | 14 | ✅ |
| KtemasGovernment | 8 | ✅ |
| Intégration | 6 | ✅ |
| Fork | 3 | ✅ |
| **TOTAL** | **42** | ✅ **Tous passent** |

## Fonctionnalités clés

### Token (KtemasToken)
- **`transfer`** : Transférer des KTMS
- **`burn(amount)`** : Détruire ses propres KTMS
- **`mint(to, amount)`** : Créer des KTMS (réservé au **Vault**)

### Vault (KtemasVault)
- **`deposit(amount)`** : Déposer des KTMS
- **`requestWithdrawal(amount)`** : Demander un retrait (délai 48h)
- **`executeWithdrawal()`** : Exécuter le retrait (frais 0,5%)
- **`claimRewards()`** : Réclamer les récompenses de staking

### Trésorerie (KtemasTreasury)
- Reçoit les frais de retrait (0,5%)
- Timelock de 48h sur les retraits du owner

### Gouvernance (KtemasGovernment)
- **`propose(description, isCritical)`** : Créer une proposition
- **`vote(proposalId, support)`** : Voter sur une proposition
- **`executeProposal(proposalId)`** : Exécuter une proposition après le vote
- Transition communautaire automatique à 100 holders

## Propriété

- **Owner** : `0x7F40E9D5DeD4d0C034dafB26E2BBF6a5112CFd5B`
- Le owner peut transférer la propriété via `transferOwnership`
- Le owner peut renoncer à la propriété via `renounceOwnership`

## Historique

- **4 octobre 2026** : Déploiement initial (ancien KTS, obsolète)
- **14 octobre 2026** : Nouveau contrat `KtemasToken.sol` (10M KTMS) déployé
- **16 octobre 2026** : 42 tests unitaires + intégration + Fork passent
- **20 octobre 2026** : Déploiement complet des 4 contrats (Token, Treasury, Vault, Government) sur Ethereum Sepolia
- **20 octobre 2026** : Vérification des 4 contrats sur Etherscan

## Audit de sécurité

| Outil | Version | High | Medium | Low | Informational |
|---|---|---|---|---|---|
| **Slither** | 0.11.6 | **0** | **0** | 15 | 19 |

**Résultat :** ✅ Aucune faille critique ou moyenne détectée.

**Date de l'audit :** 20 octobre 2026

**Contrats analysés :** 4 (KtemasToken, KtemasTreasury, KtemasVault, KtemasGovernment)

**Lignes de code (SLOC) :** 465