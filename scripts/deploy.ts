import { network } from "hardhat";

// 🎯 Choisis le réseau ici : "sepolia" ou "baseSepolia"
const NETWORK = "sepolia";

async function main() {
  console.log(`🚀 Déploiement complet de l'écosystème Ktemas sur ${NETWORK}\n`);

  // 1. Connexion au réseau
  const { viem } = await network.connect(NETWORK);
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log(`📍 Déployeur : ${deployer.account.address}`);

  // 2. Vérification du solde
  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  });
  console.log(`💰 Solde : ${Number(balance) / 10 ** 18} ETH\n`);

  if (balance === 0n) {
    console.error("❌ Solde à 0. Va récupérer des ETH de test !");
    process.exit(1);
  }

  // 3. Déploiement du Token
  console.log("⏳ [1/4] Déploiement de KtemasToken...");
  const ktemasToken = await viem.deployContract("KtemasToken");
  console.log(`✅ KtemasToken : ${ktemasToken.address}`);

  // 4. Déploiement de la Treasury
  console.log("⏳ [2/4] Déploiement de KtemasTreasury...");
  const ktemasTreasury = await viem.deployContract("KtemasTreasury", [
    ktemasToken.address,
  ]);
  console.log(`✅ KtemasTreasury : ${ktemasTreasury.address}`);

  // 5. Déploiement du Vault
  console.log("⏳ [3/4] Déploiement de KtemasVault...");
  const ktemasVault = await viem.deployContract("KtemasVault", [
    ktemasToken.address,
    ktemasTreasury.address,
  ]);
  console.log(`✅ KtemasVault : ${ktemasVault.address}`);

  // 6. Déploiement du Government
  console.log("⏳ [4/4] Déploiement de KtemasGovernment...");
  const ktemasGovernment = await viem.deployContract("KtemasGovernment", [
    ktemasToken.address,
  ]);
  console.log(`✅ KtemasGovernment : ${ktemasGovernment.address}\n`);

  // 7. Liaison : autoriser le Vault à mint
  console.log("🔗 Liaison Token ↔ Vault (setVault)...");
  const tx = await ktemasToken.write.setVault([ktemasVault.address]);
  await publicClient.waitForTransactionReceipt({ hash: tx });
  console.log("✅ Vault autorisé à mint sur le Token\n");

  // 8. Affichage final
  console.log("📊 Récapitulatif :");
  console.log(`   Token        : ${ktemasToken.address}`);
  console.log(`   Treasury     : ${ktemasTreasury.address}`);
  console.log(`   Vault        : ${ktemasVault.address}`);
  console.log(`   Government   : ${ktemasGovernment.address}\n`);

  // 9. Infos du token
  const name = await ktemasToken.read.name();
  const symbol = await ktemasToken.read.symbol();
  const totalSupply = await ktemasToken.read.totalSupply();
  const decimals = await ktemasToken.read.decimals();
  const myBalance = await ktemasToken.read.balanceOf([deployer.account.address]);

  console.log("📊 Informations du token :");
  console.log(`   Nom          : ${name}`);
  console.log(`   Symbole      : ${symbol}`);
  console.log(`   Décimales    : ${decimals}`);
  console.log(`   Supply totale: ${Number(totalSupply) / 10 ** Number(decimals)} ${symbol}`);
  console.log(`   Ton solde    : ${Number(myBalance) / 10 ** Number(decimals)} ${symbol}\n`);

  console.log("🎉 Déploiement complet terminé !");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});