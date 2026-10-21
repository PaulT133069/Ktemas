import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";
import hardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatNetworkHelpers],
  solidity: {
    profiles: {
      default: { version: "0.8.34" },
      production: { version: "0.8.34", settings: { optimizer: { enabled: true, runs: 200 } } },
    },
  },
  networks: {
    hardhatMainnet: { type: "edr-simulated", chainType: "l1" },
    hardhatOp: { type: "edr-simulated", chainType: "op" },
    sepolia: {
      type: "http", chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    baseSepolia: {
      type: "http", chainType: "op",
      url: configVariable("BASE_SEPOLIA_RPC_URL"),
      accounts: [configVariable("BASE_SEPOLIA_PRIVATE_KEY")],
    },
    hardhatFork: {
      type: "edr-simulated",
      chainType: "generic",
      chainId: 84532,
      forking: {
        url: process.env.BASE_SEPOLIA_RPC_URL || "",
      },
    },
  },
  verify: {
    etherscan: { apiKey: configVariable("ETHERSCAN_API_KEY") },
    blockscout: {
      enabled: true,
      apiKey: configVariable("BLOCKSCOUT_API_KEY"),
    },
  },
  chainDescriptors: {
    84532: {
      name: "Base Sepolia",
      blockExplorers: {
        blockscout: {
          name: "Blockscout",
          url: "https://base-sepolia.blockscout.com",
          apiUrl: "https://base-sepolia.blockscout.com/api",
        },
      },
    },
  },
});