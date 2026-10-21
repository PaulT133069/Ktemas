import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("KtemasVault - Récompenses", function () {
  it("devrait retourner 0 récompense avant 90 jours", async function () {
    const { viem } = await network.create();
    const [owner] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [ktemas.address]);
    const vault = await viem.deployContract("KtemasVault", [ktemas.address, treasury.address]);

    const montant = 1000n * 10n ** 18n;

    await ktemas.write.approve([vault.address, montant]);
    await vault.write.deposit([montant]);

    const rewards = await vault.read.calculateRewards([owner.account.address]);
    assert.equal(rewards, 0n, "Pas de récompense avant 90 jours");
  });

  it("devrait permettre au owner de distribuer les récompenses", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [ktemas.address]);
    const vault = await viem.deployContract("KtemasVault", [ktemas.address, treasury.address]);

    // La première distribution est autorisée (lastDistributionTimestamp = 0)
    await vault.write.distributeRewards();

    const lastDistribution = await vault.read.lastDistributionTimestamp();
    assert.ok(lastDistribution > 0n, "La distribution doit être enregistrée");
  });

  it("devrait empêcher un non-owner de distribuer", async function () {
    const { viem } = await network.create();
    const [owner, attaquant] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [ktemas.address]);
    const vault = await viem.deployContract("KtemasVault", [ktemas.address, treasury.address]);

    await assert.rejects(
      async () => {
        await vault.write.distributeRewards({
          account: attaquant.account,
        });
      },
      /OwnableUnauthorizedAccount/,
      "Seul le owner doit pouvoir distribuer"
    );
  });

  it("devrait empêcher de réclamer sans récompense", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const treasury = await viem.deployContract("KtemasTreasury", [ktemas.address]);
    const vault = await viem.deployContract("KtemasVault", [ktemas.address, treasury.address]);

    await assert.rejects(
      async () => {
        await vault.write.claimRewards();
      },
      /aucune recompense/,
      "Réclamer sans récompense doit échouer"
    );
  });
});