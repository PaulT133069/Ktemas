import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("KtemasTreasury", function () {
  it("devrait déployer avec le bon token", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [
      ktemas.address,
    ]);

    const tokenAddress = await treasury.read.ktmsToken();
    assert.equal(
      tokenAddress.toLowerCase(),
      ktemas.address.toLowerCase(),
      "Le token doit être KtemasToken"
    );
  });

  it("devrait recevoir des frais", async function () {
    const { viem } = await network.create();
    const [owner] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [
      ktemas.address,
    ]);

    const montant = 1000n * 10n ** 18n;

    // Approuver la trésorerie
    await ktemas.write.approve([treasury.address, montant]);

    // Envoyer les frais
    await treasury.write.receiveFees([montant]);

    const balance = await treasury.read.balance();
    assert.equal(balance, montant, "La trésorerie doit avoir 1000 KTMS");
  });

  it("devrait permettre au owner de demander un retrait", async function () {
    const { viem } = await network.create();
    const [owner] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [
      ktemas.address,
    ]);

    const montant = 1000n * 10n ** 18n;

    // Approvisionner la trésorerie
    await ktemas.write.approve([treasury.address, montant]);
    await treasury.write.receiveFees([montant]);

    // Demander un retrait
    await treasury.write.requestWithdrawal([owner.account.address, montant]);

    const count = await treasury.read.withdrawalRequestCount();
    assert.equal(count, 1n, "Une demande doit être créée");
  });

  it("devrait empêcher un non-owner de demander un retrait", async function () {
    const { viem } = await network.create();
    const [owner, attaquant] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [
      ktemas.address,
    ]);

    await assert.rejects(
      async () => {
        await treasury.write.requestWithdrawal(
          [attaquant.account.address, 1000n * 10n ** 18n],
          { account: attaquant.account }
        );
      },
      /OwnableUnauthorizedAccount/,
      "Seul le owner doit pouvoir demander un retrait"
    );
  });

  it("devrait empêcher un non-owner d'exécuter un retrait", async function () {
    const { viem } = await network.create();
    const [owner, attaquant] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [
      ktemas.address,
    ]);

    await assert.rejects(
      async () => {
        await treasury.write.executeWithdrawal([0n], {
          account: attaquant.account,
        });
      },
      /OwnableUnauthorizedAccount/,
      "Seul le owner doit pouvoir exécuter un retrait"
    );
  });
});