import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("KtemasVault - Retraits", function () {
  it("devrait permettre de demander un retrait", async function () {
    const { viem } = await network.create();
    const [owner] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [ktemas.address]);
    const vault = await viem.deployContract("KtemasVault", [ktemas.address, treasury.address]);

    const montant = 1000n * 10n ** 18n;

    await ktemas.write.approve([vault.address, montant]);
    await vault.write.deposit([montant]);
    await vault.write.requestWithdrawal([montant]);

    const [requestAmount, , active] = await vault.read.getWithdrawalRequest([owner.account.address]);
    assert.equal(requestAmount, montant, "La demande doit être de 1000 KTMS");
    assert.equal(active, true, "La demande doit être active");
  });

  it("devrait empêcher une double demande active", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [ktemas.address]);
    const vault = await viem.deployContract("KtemasVault", [ktemas.address, treasury.address]);

    const montant = 1000n * 10n ** 18n;

    await ktemas.write.approve([vault.address, montant]);
    await vault.write.deposit([montant]);
    await vault.write.requestWithdrawal([montant]);

    await assert.rejects(
      async () => {
        await vault.write.requestWithdrawal([montant]);
      },
      /demande deja active/,
      "Une double demande doit échouer"
    );
  });

  it("devrait empêcher un retrait avant le délai", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [ktemas.address]);
    const vault = await viem.deployContract("KtemasVault", [ktemas.address, treasury.address]);

    const montant = 1000n * 10n ** 18n;

    await ktemas.write.approve([vault.address, montant]);
    await vault.write.deposit([montant]);
    await vault.write.requestWithdrawal([montant]);

    await assert.rejects(
      async () => {
        await vault.write.executeWithdrawal();
      },
      /delai non ecoule/,
      "Le retrait doit échouer avant 48h"
    );
  });

  it("devrait permettre d'annuler une demande", async function () {
    const { viem } = await network.create();
    const [owner] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [ktemas.address]);
    const vault = await viem.deployContract("KtemasVault", [ktemas.address, treasury.address]);

    const montant = 1000n * 10n ** 18n;

    await ktemas.write.approve([vault.address, montant]);
    await vault.write.deposit([montant]);
    await vault.write.requestWithdrawal([montant]);
    await vault.write.cancelWithdrawal();

    const [, , active] = await vault.read.getWithdrawalRequest([owner.account.address]);
    assert.equal(active, false, "La demande doit être inactive");
  });

  it("devrait empêcher un retrait supérieur au dépôt", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [ktemas.address]);
    const vault = await viem.deployContract("KtemasVault", [ktemas.address, treasury.address]);

    const montant = 1000n * 10n ** 18n;

    await ktemas.write.approve([vault.address, montant]);
    await vault.write.deposit([montant]);

    await assert.rejects(
      async () => {
        await vault.write.requestWithdrawal([2000n * 10n ** 18n]);
      },
      /solde insuffisant/,
      "Un retrait supérieur au dépôt doit échouer"
    );
  });
});