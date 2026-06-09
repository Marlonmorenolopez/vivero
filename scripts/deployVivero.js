// scripts/deployVivero.js
// ============================================================
//  Deploy del contrato Vivero.sol — v2.1.0 (Direct Wallet Ownership)
//  Reemplaza deployCRE.js para el contrato principal del vivero.
//
//  Ejecutar:
//    npx hardhat run scripts/deployVivero.js --network sepolia
//    npx hardhat run scripts/deployVivero.js --network localhost
// ============================================================

const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const red        = hre.network.name;
  const balance    = await hre.ethers.provider.getBalance(deployer.address);

  console.log("\n🌿 Desplegando Vivero.sol v2.1.0 — Gemelo Digital Unificado");
  console.log("=".repeat(60));
  console.log("   Red:      ", red);
  console.log("   Deployer: ", deployer.address);
  console.log("   Balance:  ", hre.ethers.formatEther(balance), "ETH\n");

  // ── Wallets del constructor ────────────────────────────────────────────────
  // walletONG: recibe donaciones. En producción usa tu segunda wallet real.
  const walletONG = "0x1Ae6Ab11E5bE13Fe3af51ABDd8956b9055A7Afab";

  // walletDesarrollador: también se convierte en el OWNER del contrato (v2.1.0).
  // El servidor/oráculo firma con esta wallet sin bloqueos de gas.
  const walletDesarrollador = deployer.address;

  console.log("   💚 Wallet ONG:          ", walletONG);
  console.log("   💻 Wallet Desarrollador:", walletDesarrollador);
  console.log("   🔑 Owner (v2.1.0):      ", walletDesarrollador, "\n");

  // ── Deploy ────────────────────────────────────────────────────────────────
  console.log("⏳ Compilando y transmitiendo Vivero.sol...");
  const ViveroFactory = await hre.ethers.getContractFactory(
    "contracts/Vivero.sol:Vivero"
  );

  const vivero = await ViveroFactory.deploy(
    walletONG,
    walletDesarrollador
  );
  await vivero.waitForDeployment();

  const address = await vivero.getAddress();

  // ── Verificación básica post-deploy ───────────────────────────────────────
  const owner   = await vivero.owner();
  const ongAddr = await vivero.walletONG();
  const paused  = await vivero.paused();

  console.log("\n✅ Vivero.sol desplegado con éxito!");
  console.log("=".repeat(60));
  console.log("   Dirección del contrato: ", address);
  console.log("   Owner (v2.1.0):         ", owner);
  console.log("   Wallet ONG:             ", ongAddr);
  console.log("   Pausado:                ", paused);

  // ── Instrucciones post-deploy ─────────────────────────────────────────────
  console.log("\n📋 Copia estas variables en tu archivo .env:");
  console.log("=".repeat(60));

  if (red === "sepolia") {
    console.log(`NEXT_PUBLIC_VIVERO_ADDRESS_SEPOLIA=${address}`);
    console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA=${address}`);
    console.log(`\n🔍 Etherscan: https://sepolia.etherscan.io/address/${address}`);
  } else if (red === "localhost" || red === "ganache") {
    console.log(`NEXT_PUBLIC_VIVERO_ADDRESS_LOCAL=${address}`);
    console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS_GANACHE=${address}`);
  }

  console.log("=".repeat(60));
  console.log("\n📌 Próximos pasos:");
  console.log("   1. Copiar la dirección arriba en tu .env");
  console.log("   2. Ejecutar deployNFT.js para conectar el NFT al nuevo vivero");
  console.log("   3. Ejecutar conectarNFT.js para vincular los contratos");
  console.log("   4. Actualizar config.json con la nueva receptorAddress si aplica\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error en el despliegue:", error);
    process.exit(1);
  });
