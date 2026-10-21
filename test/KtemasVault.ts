import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("KtemasVault - Dépôts", function () {
  it("devrait déployer le Vault avec les bonnes infos", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [
      ktemas.address,
    ]);
    const vault = await viem.deployContract("KtemasVault", [
      ktemas.address,
      treasury.address,
    ]);

    const tokenAddress = await vault.read.ktmsToken();
    assert.equal(
      tokenAddress.toLowerCase(),
      ktemas.address.toLowerCase(),
      "Le token doit être KtemasToken"
    );

    const treasuryAddress = await vault.read.treasury();
    assert.equal(
      treasuryAddress.toLowerCase(),
      treasury.address.toLowerCase(),
      "La trésorerie doit être KtemasTreasury"
    );
  });

  it("devrait permettre un dépôt", async function () {
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

    const montant = 1000n * 10n ** 18n;

    // Approuver le Vault
    await ktemas.write.approve([vault.address, montant]);

    // Déposer
    await vault.write.deposit([montant]);

    // Vérifier le dépôt
    const [depositAmount] = await vault.read.getDeposit([
      owner.account.address,
    ]);
    assert.equal(depositAmount, montant, "Le dépôt doit être de 1000 KTMS");

    // Vérifier le solde du Vault
    const vaultBalance = await vault.read.vaultBalance();
    assert.equal(vaultBalance, montant, "Le Vault doit avoir 1000 KTMS");
  });

  it("devrait permettre plusieurs dépôts", async function () {
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

    const montant1 = 1000n * 10n ** 18n;
    const montant2 = 500n * 10n ** 18n;

    // Approuver
    await ktemas.write.approve([vault.address, montant1 + montant2]);

    // Déposer 2 fois
    await vault.write.deposit([montant1]);
    await vault.write.deposit([montant2]);

    // Vérifier le total
    const [depositAmount] = await vault.read.getDeposit([
      owner.account.address,
    ]);
    assert.equal(
      depositAmount,
      montant1 + montant2,
      "Le dépôt total doit être de 1500 KTMS"
    );
  });

  it("devrait refuser un dépôt de 0", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [
      ktemas.address,
    ]);
    const vault = await viem.deployContract("KtemasVault", [
      ktemas.address,
      treasury.address,
    ]);

    await assert.rejects(
      async () => {
        await vault.write.deposit([0n]);
      },
      /montant doit etre positif/,
      "Un dépôt de 0 doit échouer"
    );
  });

  it("devrait mettre à jour le total des dépôts", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [
      ktemas.address,
    ]);
    const vault = await viem.deployContract("KtemasVault", [
      ktemas.address,
      treasury.address,
    ]);

    const montant = 1000n * 10n ** 18n;

    await ktemas.write.approve([vault.address, montant]);
    await vault.write.deposit([montant]);

    const total = await vault.read.totalDeposits();
    assert.equal(total, montant, "Le total des dépôts doit être de 1000 KTMS");
  });
});