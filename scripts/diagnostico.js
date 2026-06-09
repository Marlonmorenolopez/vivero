// scripts/diagnostico.js
const { ethers } = require("hardhat");

async function main() {
  const FACTORY = "0x570A57b25B51FBD862AEB70B5dB9296Dc82086af";
  const VIVERO  = "0x6731F7E44e96ff97Eb0C66714abA3502007A97b2";

  const FACTORY_ABI = [
    "function totalSemillasAdoptadas() external view returns (uint256)",
    "function owner() external view returns (address)",
    "function precioAdopcion() external view returns (uint256)",
    "function buscarContratoPorId(uint256) external view returns (address)",
  ];
  const VIVERO_ABI = [
    "function totalSemillasRegistradas() external view returns (uint256)",
    "function totalPlantasRegistradas() external view returns (uint256)",
    "function owner() external view returns (address)",
    "function administradores(address) external view returns (bool)",
  ];

  const factory = await ethers.getContractAt(FACTORY_ABI, FACTORY);
  const vivero  = await ethers.getContractAt(VIVERO_ABI,  VIVERO);

  console.log("\n=== FACTORY ===");
  const totalAdoptadas = await factory.totalSemillasAdoptadas();
  const ownerFactory   = await factory.owner();
  const precio         = await factory.precioAdopcion();
  console.log("totalSemillasAdoptadas:", totalAdoptadas.toString());
  console.log("owner:                 ", ownerFactory);
  console.log("precioAdopcion (wei):  ", precio.toString());

  // Intentar leer viveroContrato (solo existe en v2.1.0)
  try {
    const vcABI = ["function viveroContrato() external view returns (address)"];
    const fc2   = await ethers.getContractAt(vcABI, FACTORY);
    const vc    = await fc2.viveroContrato();
    console.log("viveroContrato:        ", vc);
  } catch(e) {
    console.log("viveroContrato:         ❌ funcion no existe — Factory es version ANTERIOR a v2.1.0");
  }

  console.log("\n=== VIVERO ===");
  const totalRegistradas = await vivero.totalSemillasRegistradas();
  const totalPlantas     = await vivero.totalPlantasRegistradas();
  const ownerVivero      = await vivero.owner();
  const esAdmin          = await vivero.administradores(FACTORY);
  console.log("totalSemillasRegistradas:", totalRegistradas.toString());
  console.log("totalPlantasRegistradas: ", totalPlantas.toString());
  console.log("owner:                   ", ownerVivero);
  console.log("Factory es admin:        ", esAdmin);

  console.log("\n=== DIAGNÓSTICO ===");
  console.log(`Semillas adoptadas en Factory : ${totalAdoptadas}`);
  console.log(`Semillas registradas en Vivero: ${totalRegistradas}`);
  if (Number(totalAdoptadas) > 0 && Number(totalRegistradas) === 0) {
    console.log("⚠️  Hay adopciones pero Vivero.sol tiene 0 — enlace nunca funcionó");
  }
  if (!esAdmin) {
    console.log("❌ Factory NO es admin en Vivero.sol");
  } else {
    console.log("✅ Factory ya ES admin en Vivero.sol");
  }
}

main().catch(console.error);