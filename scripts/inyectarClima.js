const hre = require("hardhat");
const fs = require("fs");

// Intentar cargar .env tradicional o .env.local de Next.js
if (fs.existsSync(".env.local")) {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config();
}

async function main() {
  console.log("🌍 Leyendo configuración del oráculo local...");
  const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("   Cuenta oráculo (Dueño):", deployer.address);

  // LÍNEA DE DIAGNÓSTICO
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY?.trim();
  if (!apiKey) {
    console.log("❌ ALERTA: La variable NEXT_PUBLIC_OPENWEATHER_API_KEY está vacía.");
  } else {
    console.log(`✅ Clave detectada en el entorno (Primeros 6 caracteres): ${apiKey.substring(0, 6)}...`);
  }

  // 1. Llamada a la API real
  console.log("\n📡 Obteniendo clima satelital...");
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${config.lat}&lon=${config.lon}&appid=${apiKey}&units=metric`;
  
  const response = await fetch(url);
  const datos = await response.json();

  if (datos.cod !== 200) {
      throw new Error("❌ Error de API: " + datos.message);
  }

  // 2. Procesar los datos
  const temperatura = BigInt(Math.round(datos.main.temp * 10));
  const humedad = BigInt(datos.main.humidity);
  const lluvia1h = datos.rain && datos.rain["1h"] ? datos.rain["1h"] : 0;
  const precipitacion = BigInt(Math.round(lluvia1h * 10));
  const horasLuz = BigInt(Math.round((1 - datos.clouds.all / 100) * 12));
  const timestamp = BigInt(Math.floor(Date.now() / 1000));

  console.log(`   🌡️ Temp: ${Number(temperatura)/10}°C | 💧 Humedad: ${humedad}%`);

  // 3. Empaquetar corregido (Se quitó el error de asignación interna)
  const coder = new hre.ethers.AbiCoder();
  const reporteEncoded = coder.encode(
    ["int256", "uint256", "uint256", "uint256", "uint256"],
    [temperatura, humedad, precipitacion, horasLuz, timestamp]
  );

  // 4. Inyectar con permisos de administrador
  console.log(`\n🚀 Conectando con el contrato: ${config.receptorAddress}...`);
  const Receptor = await hre.ethers.getContractAt("ViveroClimaReceptorCRE", config.receptorAddress);

  console.log("   🔑 (1/3) Abriendo bóveda (Permiso temporal a tu wallet)...");
  let tx = await Receptor.actualizarForwarder(deployer.address);
  await tx.wait();

  console.log("   💉 (2/3) Inyectando telemetría en la blockchain...");
  tx = await Receptor.fulfillReport(config.semillaId, reporteEncoded);
  await tx.wait();

  console.log("   🔒 (3/3) Cerrando bóveda (Devolviendo control a Chainlink)...");
  const chainlinkOficial = "0xF8344CFd5c43616a4366C34E3EEE75af79a74482";
  tx = await Receptor.actualizarForwarder(chainlinkOficial);
  await tx.wait();
  
  console.log("\n✅ ¡MISION CUMPLIDA! Datos inyectados y seguridad restaurada.");
}

main().catch((error) => {
  console.error("❌ Error en la ejecución:", error);
  process.exitCode = 1;
});