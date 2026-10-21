import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("KtemasToken", function () {
  it("devrait déployer le token avec les bonnes infos", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");

    const name = await ktemas.read.name();
    const symbol = await ktemas.read.symbol();
    const totalSupply = await ktemas.read.totalSupply();
    const decimals = await ktemas.read.decimals();

    assert.equal(name, "Ktemas", "Le nom doit être Ktemas");
    assert.equal(symbol, "KTMS", "Le symbole doit être KTMS");
    assert.equal(decimals, 18, "Les décimales doivent être 18");
    assert.equal(
      totalSupply,
      10_000_000n * 10n ** 18n,
      "La supply doit être de 10 000 000 KTMS"
    );
  });

  it("devrait permettre de transférer des KTMS", async function () {
    const { viem } = await network.create();
    const [owner, destinataire] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");

    const montant = 1000n * 10n ** 18n;
    await ktemas.write.transfer([destinataire.account.address, montant]);

    const balance = await ktemas.read.balanceOf([destinataire.account.address]);
    assert.equal(balance, montant, "Le destinataire doit avoir 1000 KTMS");
  });

  it("devrait permettre de brûler ses KTMS", async function () {
    const { viem } = await network.create();
    const [owner] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");

    const supplyInitiale = await ktemas.read.totalSupply();
    const montant = 1000n * 10n ** 18n;

    await ktemas.write.burn([montant]);

    const supplyFinale = await ktemas.read.totalSupply();
    assert.equal(
      supplyFinale,
      supplyInitiale - montant,
      "La supply doit diminuer de 1000 KTMS"
    );
  });

  it("devrait empêcher un non-Vault de mint", async function () {
    const { viem } = await network.create();
    const [owner, attaquant] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");

    // Tentative de mint par un non-Vault (doit échouer)
    await assert.rejects(
      async () => {
        await ktemas.write.mint(
          [attaquant.account.address, 1000n * 10n ** 18n],
          { account: attaquant.account }
        );
      },
      /seul le Vault peut mint/,
      "Seul le Vault doit pouvoir mint"
    );
  });

  it("devrait permettre au owner de définir le Vault", async function () {
    const { viem } = await network.create();
    const [owner, vault] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");

    await ktemas.write.setVault([vault.account.address]);

    const vaultAddress = await ktemas.read.vault();
    assert.equal(
      vaultAddress.toLowerCase(),
      vault.account.address.toLowerCase(),
      "Le Vault doit être défini"
    );
  });

  it("devrait empêcher un non-owner de définir le Vault", async function () {
    const { viem } = await network.create();
    const [owner, attaquant] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");

    await assert.rejects(
      async () => {
        await ktemas.write.setVault(
          [attaquant.account.address],
          { account: attaquant.account }
        );
      },
      /OwnableUnauthorizedAccount/,
      "Seul le owner doit pouvoir définir le Vault"
    );
  });
});