// scripts/deployNFT.js
// ============================================================
//  Despliegue ViveroNFT en localhost o sepolia
//
//  CORRECCIONES:
//  ✅ Lee la dirección del .env ANTES de validar
//  ✅ Usa ZeroAddress si el .env tiene placeholder
//  ✅ No intenta resolver strings inválidos como direcciones
//
//  Ejecutar:
//  npx hardhat run scripts/deployNFT.js --network localhost
//  npx hardhat run scripts/deployNFT.js --network sepolia
// ============================================================

const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network    = hre.network.name;

  console.log(`🚀 Desplegando ViveroNFT en ${network}...`);
  console.log("   Cuenta:", deployer.address);

  // ── Leer dirección del .env ───────────────────────────────
  const envAddress = network === "sepolia"
    ? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA
    : process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_GANACHE;

  // ✅ CORREGIDO: validar que sea una dirección real (empieza con 0x y 42 chars)
  const esAddressValida = (addr) =>
    addr && addr.startsWith("0x") && addr.length === 42 && !addr.includes("_");

  let viveroAddress;

  if (esAddressValida(envAddress)) {
    viveroAddress = envAddress;
    console.log("   Conectando a Vivero en:", viveroAddress);
  } else {
    // ✅ CORREGIDO: usar ZeroAddress en vez del string placeholder
    viveroAddress = hre.ethers.ZeroAddress;
    console.log("   ⚠️  Sin dirección válida en .env — usando ZeroAddress.");
    console.log("   Actualiza con actualizarViveroContrato() después del deploy.");
  }

  // ── Desplegar ViveroNFT ───────────────────────────────────
  const NFTFactory  = await hre.ethers.getContractFactory("ViveroNFT");
  const nftContrato = await NFTFactory.deploy(viveroAddress);
  await nftContrato.waitForDeployment();

  const nftAddress = await nftContrato.getAddress();
  const nombre     = await nftContrato.name();
  const symbol     = await nftContrato.symbol();

  console.log("✅ ViveroNFT desplegado en:", nftAddress);
  console.log(`   Nombre: ${nombre} | Symbol: ${symbol}`);

  console.log("\n" + "=".repeat(60));
  console.log("📋 Copia esto en tu .env:");
  console.log("=".repeat(60));

  if (network === "sepolia") {
    console.log("NEXT_PUBLIC_NFT_ADDRESS_SEPOLIA=" + nftAddress);
    console.log("\n📌 Ver en OpenSea testnet:");
    console.log("   https://testnets.opensea.io/assets/sepolia/" + nftAddress);
  } else {
    console.log("NEXT_PUBLIC_NFT_ADDRESS_GANACHE=" + nftAddress);
  }

  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });