import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("Ktemas - Tests d'intégration", function () {
  it("devrait déployer les 4 contrats et les lier", async function () {
    const { viem } = await network.create();
    const [owner] = await viem.getWalletClients();

    // 1. Déployer le Token
    const ktemas = await viem.deployContract("KtemasToken");
    assert.equal(await ktemas.read.name(), "Ktemas");
    assert.equal(await ktemas.read.symbol(), "KTMS");

    // 2. Déployer la Treasury
    const treasury = await viem.deployContract("KtemasTreasury", [
      ktemas.address,
    ]);

    // 3. Déployer le Vault
    const vault = await viem.deployContract("KtemasVault", [
      ktemas.address,
      treasury.address,
    ]);

    // 4. Déployer le Government
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    // 5. Lier le Vault au Token (le Vault peut mint)
    await ktemas.write.setVault([vault.address]);

    const vaultAddress = await ktemas.read.vault();
    assert.equal(
      vaultAddress.toLowerCase(),
      vault.address.toLowerCase(),
      "Le Vault doit être autorisé à mint"
    );

    // 6. Vérifier que les 4 contrats existent
    assert.ok(ktemas.address, "Token OK");
    assert.ok(treasury.address, "Treasury OK");
    assert.ok(vault.address, "Vault OK");
    assert.ok(government.address, "Government OK");
  });

  it("devrait faire un cycle complet : dépôt → retrait", async function () {
    const { viem } = await network.create();
    const [owner] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [
      ktemas.address,
    ]);
    const vault = await viem.deployContract("KtemasVault", [
      ktemas.address,
      treasury.address,
    ]);
    await ktemas.write.setVault([vault.address]);

    const montant = 1000n * 10n ** 18n;

    // Dépôt
    await ktemas.write.approve([vault.address, montant]);
    await vault.write.deposit([montant]);

    const [depositAmount] = await vault.read.getDeposit([
      owner.account.address,
    ]);
    assert.equal(depositAmount, montant, "Dépôt de 1000 KTMS");

    // Demande de retrait
    await vault.write.requestWithdrawal([montant]);

    const [reqAmount, , active] = await vault.read.getWithdrawalRequest([
      owner.account.address,
    ]);
    assert.equal(reqAmount, montant, "Demande de 1000 KTMS");
    assert.equal(active, true, "Demande active");
  });

  it("devrait lier le Government au Token", async function () {
    const { viem } = await network.create();
    const [owner] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    // Le owner a 10M KTMS, donc peut voter et proposer
    const canVote = await government.read.canVote([owner.account.address]);
    const canPropose = await government.read.canPropose([owner.account.address]);

    assert.equal(canVote, true, "Le owner peut voter");
    assert.equal(canPropose, true, "Le owner peut proposer");
  });

  it("devrait permettre une proposition et un vote", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    // Créer une proposition
    await government.write.propose(["Augmenter le seuil du Vault", false]);

    // Voter pour
    await government.write.vote([0n, true]);

    // Vérifier
    const proposal = await government.read.getProposal([0n]);
    assert.equal(proposal[1], "Augmenter le seuil du Vault");
    assert.ok(proposal[2] > 0n, "Votes pour > 0");
  });

  it("devrait activer la gouvernance à 100 holders", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    assert.equal(
      await government.read.communityGovernanceActive(),
      false,
      "Pas active au début"
    );

    await government.write.updateHolderCount([100n]);

    assert.equal(
      await government.read.communityGovernanceActive(),
      true,
      "Active après 100 holders"
    );
  });

  it("devrait vérifier la cohérence des seuils", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const vault = await viem.deployContract("KtemasVault", [
      ktemas.address,
      "0x0000000000000000000000000000000000000001",
    ]);
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    // Vérifier que les seuils sont cohérents
    const votingThreshold = await government.read.VOTING_THRESHOLD();
    const proposalThreshold = await government.read.PROPOSAL_THRESHOLD();

    assert.equal(votingThreshold, 1000n, "Seuil de vote : 1000 KTMS");
    assert.equal(proposalThreshold, 10000n, "Seuil de proposition : 10 000 KTMS");

    // Le Vault a un seuil minimum (0 par défaut)
    const vaultThreshold = await vault.read.minDepositThreshold();
    assert.equal(vaultThreshold, 0n, "Seuil du Vault : 0 par défaut");
  });
});