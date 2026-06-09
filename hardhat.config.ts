import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true, // 🚀 SOLUCIÓN: Rompe el límite de memoria de la EVM para compilar la Factory
    },
  },
  networks: {
    // ✅ Red local Hardhat — reemplaza Ganache, soporta Cancun + OZ v5
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // ✅ Ganache — se deja por compatibilidad pero OZ v5 no funciona aquí
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337,
    },

    // ✅ Sepolia Testnet
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [`0x${process.env.PRIVATE_KEY}`] : [],
      chainId: 11155111,
    },
  },
};

export default config;