import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("Ktemas - Tests Fork", function () {
  it("devrait déployer les 4 contrats sur un Fork de Base Sepolia", async function () {
    const { viem, networkHelpers } = await network.create("hardhatFork");
    await networkHelpers.mine
    const [owner] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");

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

    // 5. Lier le Vault au Token
    await ktemas.write.setVault([vault.address]);

    // Vérifications
    assert.equal(await ktemas.read.name(), "Ktemas");
    assert.equal(await ktemas.read.symbol(), "KTMS");

    const vaultAddress = await ktemas.read.vault();
    assert.equal(
      vaultAddress.toLowerCase(),
      vault.address.toLowerCase(),
      "Le Vault doit être lié au Token"
    );

    const tokenAddress = await government.read.ktmsToken();
    assert.equal(
      tokenAddress.toLowerCase(),
      ktemas.address.toLowerCase(),
      "Le Government doit être lié au Token"
    );
  });

  it("devrait faire un cycle complet sur Fork", async function () {
    const { viem, networkHelpers } = await network.create("hardhatFork");
    await networkHelpers.mine();
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

  it("devrait vérifier les seuils sur Fork", async function () {
    const { viem, networkHelpers } = await network.create("hardhatFork");
    await networkHelpers.mine();
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

    // Vérifier les seuils
    const votingThreshold = await government.read.VOTING_THRESHOLD();
    const proposalThreshold = await government.read.PROPOSAL_THRESHOLD();

    assert.equal(votingThreshold, 1000n);
    assert.equal(proposalThreshold, 10000n);
  });
});