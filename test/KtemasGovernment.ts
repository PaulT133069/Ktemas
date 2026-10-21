import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("KtemasGovernment", function () {
  it("devrait déployer avec le bon token", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    const tokenAddress = await government.read.ktmsToken();
    assert.equal(
      tokenAddress.toLowerCase(),
      ktemas.address.toLowerCase(),
      "Le token doit être KtemasToken"
    );
  });

  it("devrait permettre de voter avec 1000 KTMS", async function () {
    const { viem } = await network.create();
    const [owner] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    // Le owner a 10M KTMS au déploiement, donc peut voter
    const canVote = await government.read.canVote([owner.account.address]);
    assert.equal(canVote, true, "Le owner doit pouvoir voter");
  });

  it("devrait permettre de proposer avec 10 000 KTMS", async function () {
    const { viem } = await network.create();
    const [owner] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    const canPropose = await government.read.canPropose([owner.account.address]);
    assert.equal(canPropose, true, "Le owner doit pouvoir proposer");
  });

  it("devrait créer une proposition", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    await government.write.propose(["Test proposition", false]);

    const count = await government.read.proposalCount();
    assert.equal(count, 1n, "Une proposition doit être créée");

    const proposal = await government.read.getProposal([0n]);
    assert.equal(proposal[1], "Test proposition", "La description doit correspondre");
  });

  it("devrait permettre de voter sur une proposition", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    await government.write.propose(["Test", false]);
    await government.write.vote([0n, true]);

    const proposal = await government.read.getProposal([0n]);
    assert.ok(proposal[2] > 0n, "Les votes pour doivent être > 0");
  });

  it("devrait empêcher un double vote", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    await government.write.propose(["Test", false]);
    await government.write.vote([0n, true]);

    await assert.rejects(
      async () => {
        await government.write.vote([0n, true]);
      },
      /deja vote/,
      "Un double vote doit échouer"
    );
  });

  it("devrait activer la gouvernance à 100 holders", async function () {
    const { viem } = await network.create();

    const ktemas = await viem.deployContract("KtemasToken");
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    // Vérifier que la gouvernance n'est pas active au début
    const activeBefore = await government.read.communityGovernanceActive();
    assert.equal(activeBefore, false, "La gouvernance ne doit pas être active au début");

    // Mettre à jour le nombre de holders à 100
    await government.write.updateHolderCount([100n]);

    // Vérifier que la gouvernance est maintenant active
    const activeAfter = await government.read.communityGovernanceActive();
    assert.equal(activeAfter, true, "La gouvernance doit être active après 100 holders");

    // Vérifier la phase de transition
    const phase = await government.read.transitionPhase();
    assert.equal(phase, 1, "La phase doit être 1 (transition)");
  });

  it("devrait empêcher un non-owner de mettre à jour les holders", async function () {
    const { viem } = await network.create();
    const [owner, attaquant] = await viem.getWalletClients();

    const ktemas = await viem.deployContract("KtemasToken");
    const government = await viem.deployContract("KtemasGovernment", [
      ktemas.address,
    ]);

    await assert.rejects(
      async () => {
        await government.write.updateHolderCount([100n], {
          account: attaquant.account,
        });
      },
      /OwnableUnauthorizedAccount/,
      "Seul le owner doit pouvoir mettre à jour le compteur"
    );
  });
});