// scripts/conectarNFT.js
// ============================================================
//  Conecta el contrato ViveroNFT con Vivero
//  Ejecutar UNA SOLA VEZ después de desplegar ambos contratos:
//  npx hardhat run scripts/conectarNFT.js --network ganache
// ============================================================

const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network    = hre.network.name;

  console.log(`🔗 Conectando contratos en ${network}...`);
  console.log("   Cuenta:", deployer.address);

  // Leer direcciones del .env según la red
  const viveroAddress = network === "sepolia"
    ? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA
    : process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_GANACHE;

  const nftAddress = network === "sepolia"
    ? process.env.NEXT_PUBLIC_NFT_ADDRESS_SEPOLIA
    : process.env.NEXT_PUBLIC_NFT_ADDRESS_GANACHE;

  if (!viveroAddress || viveroAddress.includes("pegar")) {
    throw new Error("❌ Falta NEXT_PUBLIC_CONTRACT_ADDRESS en el .env");
  }
  if (!nftAddress || nftAddress.includes("pegar")) {
    throw new Error("❌ Falta NEXT_PUBLIC_NFT_ADDRESS en el .env");
  }

  console.log("   Vivero:", viveroAddress);
  console.log("   ViveroNFT:   ", nftAddress);

  // Conectar al contrato NFT ya desplegado
  const ViveroNFT   = await hre.ethers.getContractFactory("ViveroNFT");
  const nftContrato = ViveroNFT.attach(nftAddress);

  // Llamar actualizarViveroContrato para vincularlos
  const tx = await nftContrato.actualizarViveroContrato(viveroAddress);
  await tx.wait();

  console.log("✅ ¡Contratos conectados exitosamente!");
  console.log("   El NFT ahora acepta acuñaciones desde Vivero.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err.message);
    process.exit(1);
  });