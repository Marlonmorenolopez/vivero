// scripts/deployFactory.js
// ============================================================
//  Despliega ViveroFactory.sol v2.1.0 y la conecta con Vivero.sol
//
//  Ejecutar en Sepolia:
//    npx hardhat run scripts/deployFactory.js --network sepolia
//
//  Ejecutar en local (Ganache / hardhat node):
//    npx hardhat run scripts/deployFactory.js --network localhost
//
//  Prerequisito: Vivero.sol ya desplegado y su dirección en .env:
//    NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA=0x...   (para Sepolia)
//    NEXT_PUBLIC_CONTRACT_ADDRESS_GANACHE=0x...   (para local)
// ============================================================

const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const red        = hre.network.name;
  const balance    = await hre.ethers.provider.getBalance(deployer.address);

  console.log("\n🏭 Desplegando ViveroFactory.sol v2.1.0");
  console.log("=".repeat(60));
  console.log("   Red:      ", red);
  console.log("   Deployer: ", deployer.address);
  console.log("   Balance:  ", hre.ethers.formatEther(balance), "ETH\n");

  // ── Dirección de Vivero.sol ya desplegado ──────────────────────────────
  const viveroAddress = (red === "sepolia")
    ? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA
    : process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_GANACHE;

  if (!viveroAddress || !viveroAddress.startsWith("0x")) {
    throw new Error(
      "❌ Falta la dirección de Vivero.sol en el .env.\n" +
      "   Sepolia → NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA=0x...\n" +
      "   Local   → NEXT_PUBLIC_CONTRACT_ADDRESS_GANACHE=0x..."
    );
  }

  // ── Parámetros del constructor ─────────────────────────────────────────
  const walletONG           = "0x1Ae6Ab11E5bE13Fe3af51ABDd8956b9055A7Afab";
  const walletDesarrollador = deployer.address;   // misma wallet que firma el deploy
  const precioAdopcion      = hre.ethers.parseEther("0.01");  // 0.01 ETH

  console.log("   💚 Wallet ONG:          ", walletONG);
  console.log("   💻 Wallet Desarrollador:", walletDesarrollador);
  console.log("   🌿 Vivero.sol en:       ", viveroAddress);
  console.log("   💰 Precio adopción:      0.01 ETH\n");

  // ── 1. Desplegar ViveroFactory ─────────────────────────────────────────
  console.log("⏳ Desplegando ViveroFactory...");
  const FactoryArtifact = await hre.ethers.getContractFactory("ViveroFactory");
  const factory = await FactoryArtifact.deploy(
    walletONG,
    walletDesarrollador,
    precioAdopcion,
    viveroAddress   // ← nuevo parámetro en v2.1.0
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ ViveroFactory desplegada en:", factoryAddress);

  // ── 2. Registrar Factory como administrador en Vivero.sol ─────────────
  //      Necesario para que IVivero.registrarSemilla() no revierte
  //      con "Solo admin o dueno".
  console.log("\n⏳ Registrando Factory como admin en Vivero.sol...");

  const viveroABI = [
    "function agregarAdministrador(address _admin) external",
    "function administradores(address) external view returns (bool)"
  ];
  const vivero  = new hre.ethers.Contract(viveroAddress, viveroABI, deployer);
  const txAdmin = await vivero.agregarAdministrador(factoryAddress);
  await txAdmin.wait();

  // Verificación
  const esAdmin = await vivero.administradores(factoryAddress);
  if (!esAdmin) {
    throw new Error("❌ La Factory no quedó registrada como admin en Vivero.sol");
  }
  console.log("✅ Factory registrada como admin en Vivero.sol:", esAdmin);

  // ── 3. Resultado final ─────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Deploy completo. Copia estas variables en tu .env:");
  console.log("=".repeat(60));

  if (red === "sepolia") {
    console.log(`NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA=${factoryAddress}`);
    console.log(`\n🔍 Etherscan: https://sepolia.etherscan.io/address/${factoryAddress}`);
  } else {
    console.log(`NEXT_PUBLIC_FACTORY_ADDRESS_GANACHE=${factoryAddress}`);
  }

  console.log("=".repeat(60));
  console.log("\n📌 Próximos pasos:");
  console.log("   1. Copia la variable de arriba en tu .env.local");
  console.log("   2. Reinicia el frontend: npm run dev  (o pnpm dev)");
  console.log("   3. La Factory ya puede llamar adoptarSemilla() y");
  console.log("      sincronizar automáticamente con Vivero.sol\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Error en el deploy:", err.message);
    process.exit(1);
  });