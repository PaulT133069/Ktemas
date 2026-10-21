// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title KtemasGovernment
 * @dev Gouvernance de l'écosystème Ktemas.
 *      - Vote pour les détenteurs de KTMS (seuil min 1000)
 *      - Proposition pour les détenteurs de KTMS (seuil min 10000)
 *      - Transition progressive vers une gouvernance communautaire
 */
contract KtemasGovernment is Ownable {

    // ============ CONSTANTES ============

    /// @dev Seuil minimum pour voter : 1 000 KTMS
    uint256 public constant VOTING_THRESHOLD = 1_000;

    /// @dev Seuil minimum pour proposer : 10 000 KTMS
    uint256 public constant PROPOSAL_THRESHOLD = 10_000;

    /// @dev Durée d'un vote : 7 jours
    uint256 public constant VOTING_DURATION = 7 days;

    /// @dev Quorum : 10% (en basis points : 1000 = 10%)
    uint256 public constant QUORUM_BPS = 1000;

    /// @dev Majorité simple : 50% + 1
    uint256 public constant SIMPLE_MAJORITY_BPS = 5001;

    /// @dev Majorité qualifiée : 66%
    uint256 public constant QUALIFIED_MAJORITY_BPS = 6600;

    /// @dev Base pour les basis points (10000 = 100%)
    uint256 public constant BPS_DENOMINATOR = 10000;

    /// @dev Nombre de holders pour déclencher la transition
    uint256 public constant HOLDERS_TRANSITION_THRESHOLD = 100;

    // ============ VARIABLES D'ÉTAT ============

    /// @dev Token KTMS utilisé pour la gouvernance
    IERC20 public immutable ktmsToken;

    /// @dev Nombre de holders actuel (mis à jour via snapshot off-chain)
    uint256 public holderCount;

    /// @dev La gouvernance communautaire est-elle activée ?
    bool public communityGovernanceActive;

    /// @dev Phase de transition (0 = owner seul, 1 = transition, 2 = communautaire)
    uint8 public transitionPhase;

    /// @dev Timestamp de l'activation de la gouvernance communautaire
    uint256 public communityGovernanceActivatedAt;

    /// @dev Structure d'une proposition
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool isCritical;
    }

    /// @dev Compteur de propositions
    uint256 public proposalCount;

    /// @dev Nombre total de votants (mis à jour via snapshot)
    uint256 public totalVoters;

    /// @dev Mapping des propositions
    mapping(uint256 => Proposal) public proposals;

    /// @dev Mapping des votes : proposition => votant => a voté
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // ============ ÉVÉNEMENTS ============

    /// @dev Émis quand le nombre de holders est mis à jour
    event HolderCountUpdated(uint256 oldCount, uint256 newCount);

    /// @dev Émis quand la gouvernance communautaire est activée
    event CommunityGovernanceActivated(uint256 timestamp);

    /// @dev Émis quand la phase de transition change
    event TransitionPhaseChanged(uint8 oldPhase, uint8 newPhase);

    /// @dev Émis quand une proposition est créée
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        bool isCritical
    );

    /// @dev Émis quand un vote est enregistré
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );

    /// @dev Émis quand une proposition est exécutée
    event ProposalExecuted(uint256 indexed proposalId, bool passed);

    // ============ CONSTRUCTEUR ============

    constructor(address _ktmsToken) Ownable(msg.sender) {
        require(_ktmsToken != address(0), "KtemasGovernment: token invalide");
        ktmsToken = IERC20(_ktmsToken);
        transitionPhase = 0;
        communityGovernanceActive = false;
    }

    // ============ FONCTIONS DE COMPTAGE ============

    /**
     * @dev Met à jour le nombre de holders (appelé par le owner via snapshot off-chain).
     */
    function updateHolderCount(uint256 _newCount) external onlyOwner {
        uint256 oldCount = holderCount;
        holderCount = _newCount;

        emit HolderCountUpdated(oldCount, _newCount);

        // Vérifie si on atteint le seuil de transition
        if (_newCount >= HOLDERS_TRANSITION_THRESHOLD && !communityGovernanceActive) {
            _activateCommunityGovernance();
        }
    }

    /**
     * @dev Active la gouvernance communautaire (interne).
     */
    function _activateCommunityGovernance() internal {
        communityGovernanceActive = true;
        communityGovernanceActivatedAt = block.timestamp;

        // Phase 1 : transition (le owner garde encore du pouvoir)
        transitionPhase = 1;
        emit TransitionPhaseChanged(0, 1);
        emit CommunityGovernanceActivated(block.timestamp);
    }

    /**
     * @dev Fait passer à la phase suivante (appelable par le owner).
     */
    function advanceTransitionPhase() external onlyOwner {
        require(communityGovernanceActive, "KtemasGovernment: gouvernance non active");
        require(transitionPhase < 2, "KtemasGovernment: phase maximale atteinte");

        uint8 oldPhase = transitionPhase;
        transitionPhase = oldPhase + 1;

        emit TransitionPhaseChanged(oldPhase, transitionPhase);
    }

    // ============ FONCTIONS DE VÉRIFICATION ============

    /**
     * @dev Vérifie si une adresse peut voter.
     */
    function canVote(address user) external view returns (bool) {
        return ktmsToken.balanceOf(user) >= VOTING_THRESHOLD * 10 ** 18;
    }

    /**
     * @dev Vérifie si une adresse peut proposer.
     */
    function canPropose(address user) external view returns (bool) {
        return ktmsToken.balanceOf(user) >= PROPOSAL_THRESHOLD * 10 ** 18;
    }

    // ============ FONCTIONS DE PROPOSITION ============

    /**
     * @dev Crée une nouvelle proposition.
     */
    function propose(string memory description, bool isCritical) external {
        require(
            ktmsToken.balanceOf(msg.sender) >= PROPOSAL_THRESHOLD * 10 ** 18,
            "KtemasGovernment: seuil de proposition non atteint"
        );
        require(bytes(description).length > 0, "KtemasGovernment: description vide");

        uint256 proposalId = proposalCount++;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + VOTING_DURATION,
            executed: false,
            isCritical: isCritical
        });

        emit ProposalCreated(proposalId, msg.sender, description, isCritical);
    }

    // ============ FONCTIONS DE VOTE ============

    /**
     * @dev Vote sur une proposition.
     */
    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.proposer != address(0), "KtemasGovernment: proposition inexistante");
        require(block.timestamp >= proposal.startTime, "KtemasGovernment: vote pas encore ouvert");
        require(block.timestamp < proposal.endTime, "KtemasGovernment: vote termine");
        require(!proposal.executed, "KtemasGovernment: deja executee");
        require(!hasVoted[proposalId][msg.sender], "KtemasGovernment: deja vote");

        uint256 weight = ktmsToken.balanceOf(msg.sender);
        require(weight >= VOTING_THRESHOLD * 10 ** 18, "KtemasGovernment: seuil de vote non atteint");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /**
     * @dev Retourne les détails d'une proposition.
     */
    function getProposal(uint256 proposalId)
        external
        view
        returns (
            address proposer,
            string memory description,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 startTime,
            uint256 endTime,
            bool executed,
            bool isCritical
        )
    {
        Proposal memory p = proposals[proposalId];
        return (
            p.proposer,
            p.description,
            p.forVotes,
            p.againstVotes,
            p.startTime,
            p.endTime,
            p.executed,
            p.isCritical
        );
    }

    // ============ FONCTIONS D'EXÉCUTION ============

    /**
     * @dev Vérifie si le quorum est atteint pour une proposition.
     */
    function hasReachedQuorum(uint256 proposalId) public view returns (bool) {
        Proposal memory p = proposals[proposalId];
        uint256 totalVotes = p.forVotes + p.againstVotes;

        if (totalVoters == 0) {
            return false;
        }

        // Quorum : 10% des votants
        uint256 quorumRequired = (totalVoters * QUORUM_BPS) / BPS_DENOMINATOR;
        return totalVotes >= quorumRequired;
    }

    /**
     * @dev Vérifie si une proposition est passée.
     */
    function isPassed(uint256 proposalId) public view returns (bool) {
        Proposal memory p = proposals[proposalId];

        if (!hasReachedQuorum(proposalId)) {
            return false;
        }

        uint256 totalVotes = p.forVotes + p.againstVotes;
        if (totalVotes <= 0) {
            return false;
        }

        uint256 majorityRequired = p.isCritical
            ? QUALIFIED_MAJORITY_BPS
            : SIMPLE_MAJORITY_BPS;

        uint256 forPercentage = (p.forVotes * BPS_DENOMINATOR) / totalVotes;
        return forPercentage >= majorityRequired;
    }

    /**
     * @dev Exécute une proposition après la fin du vote.
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];

        require(p.proposer != address(0), "KtemasGovernment: proposition inexistante");
        require(block.timestamp >= p.endTime, "KtemasGovernment: vote en cours");
        require(!p.executed, "KtemasGovernment: deja executee");

        p.executed = true;

        bool passed = isPassed(proposalId);

        emit ProposalExecuted(proposalId, passed);
    }

    /**
     * @dev Met à jour le nombre total de votants (via snapshot off-chain).
     */
    function updateTotalVoters(uint256 _newCount) external onlyOwner {
        totalVoters = _newCount;
    }

}