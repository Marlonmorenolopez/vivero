// app/api/inject-climate/route.ts
// ============================================================
//  Oráculo Automático de Clima — Backend Seguro Next.js
//  Version: 2.2.0 (Refactorizado)
//
//  Arquitectura:
//  ─────────────────────────────────────────────────────────
//  • MODO A (factory): Inyecta directo en SemillaIndividual.sol
//    con un solo paso, recuperando la dirección del gemelo
//    digital desde ViveroFactory.
//  • MODO B (legacy): Receptor CRE centralizado como fallback.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

// ─── Constantes ──────────────────────────────────────────────────────────────
const CHAINLINK_OFICIAL = "0xF8344CFd5c43616a4366C34E3EEE75af79a74482";

const OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5/weather";

// ─── ABIs mínimos ─────────────────────────────────────────────────────────────
const RECEPTOR_ABI = [
  "function actualizarForwarder(address nuevoForwarder) external",
  "function fulfillReport(uint256 semillaId, bytes calldata reporte) external",
] as const;

const FACTORY_ABI = [
  "function buscarContratoPorId(uint256) external view returns (address)",
  "function totalSemillasAdoptadas() external view returns (uint256)",
] as const;

const SEMILLA_INDIVIDUAL_ABI = [
  "function inyectarClima(int256 temperatura, uint256 humedadRelativa, uint256 precipitacion, uint256 horasLuzSolar) external",
  "function obtenerResumen() external view returns (uint256,string,string,int256,int256,uint256,uint256,uint256,uint256,uint256)",
] as const;

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface RequestBody {
  semillaId: number;
  lat: number;
  lon: number;
  contratoIndividual?: string;
  modo?: "factory" | "legacy";
}

interface ClimaData {
  temp: number;
  hum: number;
  precipitacion: number;
  horasLuz: number;
  ciudad: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function err(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

// ─── Handler POST ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { semillaId, lat, lon, contratoIndividual, modo = "factory" } = body;

    // Validación robusta: semillaId puede ser 0 (válido en algunos casos),
    // lat/lon pueden llegar como null/undefined/NaN desde el cliente.
    if (semillaId === undefined || semillaId === null) {
      return err("Falta parámetro requerido: semillaId");
    }
    if (lat === undefined || lat === null || isNaN(Number(lat))) {
      return err("Parámetro inválido: lat debe ser un número decimal (ej: 4.711)");
    }
    if (lon === undefined || lon === null || isNaN(Number(lon))) {
      return err("Parámetro inválido: lon debe ser un número decimal (ej: -74.072)");
    }
    // Asegurar tipos numéricos aunque hayan llegado como strings
    const latNum = Number(lat);
    const lonNum = Number(lon);

    console.log(
      `🤖 Oráculo activado | Semilla #${semillaId} | (${latNum}, ${lonNum}) | Modo: ${modo}`
    );

    // ── Variables de entorno del servidor (no expuestas al cliente) ──
    // NOTA: OPENWEATHER_API_KEY (sin NEXT_PUBLIC_) para mayor seguridad en servidor
    const apiKey       = (process.env.OPENWEATHER_API_KEY ?? process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY)?.trim();
    const rpcUrl       = process.env.SEPOLIA_RPC_URL;
    const privateKey   = process.env.PRIVATE_KEY;
    const receptorAddr = process.env.NEXT_PUBLIC_ORACLE_ADDRESS_SEPOLIA;
    const factoryAddr  = process.env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA;

    if (!apiKey || !rpcUrl || !privateKey) {
      return err("Variables de entorno incompletas (OPENWEATHER_API_KEY, SEPOLIA_RPC_URL, PRIVATE_KEY)", 500);
    }

    // ── 1. Clima en vivo desde OpenWeatherMap ─────────────────────────────
    const weatherRes = await fetch(
      `${OPENWEATHER_BASE}?lat=${latNum}&lon=${lonNum}&appid=${apiKey}&units=metric`
    );
    const datos = await weatherRes.json();

    if (datos.cod !== 200) {
      return err(`Error de OpenWeatherMap: ${datos.message}`);
    }

    // ── 2. Escalar al formato numérico de Solidity ────────────────────────
    const lluvia1h   = datos.rain?.["1h"] ?? 0;
    const nubosidad  = datos.clouds?.all ?? 0;

    const temperatura  = BigInt(Math.round(datos.main.temp * 10));  // x10 → 1 decimal
    const humedad      = BigInt(datos.main.humidity);
    const precipitacion = BigInt(Math.round(lluvia1h * 10));         // x10 → 1 decimal
    const horasLuz     = BigInt(Math.round((1 - nubosidad / 100) * 12));
    const timestamp    = BigInt(Math.floor(Date.now() / 1000));

    // ── Fix: Usar geocodificación inversa para obtener ciudad real ────────
    // datos.name de OpenWeather devuelve el barrio/sector, no la ciudad.
    // La API de geocodificación inversa devuelve la ciudad administrativa.
    let ciudadFinal = datos.name || "Desconocida";
    try {
      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${latNum}&lon=${lonNum}&limit=1&appid=${apiKey}`
      );
      const geoData = await geoRes.json();
      if (Array.isArray(geoData) && geoData.length > 0) {
        // Preferir nombre en español si existe, si no, el nombre por defecto
        const entry = geoData[0];
        ciudadFinal = entry.local_names?.es || entry.name || ciudadFinal;
      }
    } catch {
      // Fallback al nombre original si la geocodificación falla
    }

    const clima: ClimaData = {
      temp:          Number(temperatura) / 10,
      hum:           Number(humedad),
      precipitacion: Number(precipitacion) / 10,
      horasLuz:      Number(horasLuz),
      ciudad:        ciudadFinal,
    };

    console.log(
      `🌡️ Clima: ${clima.temp}°C | 💧 ${clima.hum}% | 🌧️ ${clima.precipitacion}mm | ☀️ ${clima.horasLuz}h`
    );

    // ── 3. Conectar al provider y wallet del servidor ─────────────────────
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet   = new ethers.Wallet(privateKey, provider);

    // ─────────────────────────────────────────────────────────────────────
    //  MODO A: FACTORY (v2) — inyecta directo en SemillaIndividual.sol
    // ─────────────────────────────────────────────────────────────────────
    if (modo === "factory" && factoryAddr) {
      let direccionGemelo = contratoIndividual;

      if (!direccionGemelo) {
        const factory = new ethers.Contract(factoryAddr, FACTORY_ABI, provider);
        direccionGemelo = await factory.buscarContratoPorId(semillaId) as string;

        if (!direccionGemelo || direccionGemelo === ethers.ZeroAddress) {
          return err(
            `No existe contrato individual para la semilla #${semillaId} en la Factory`,
            404
          );
        }
      }

      console.log(`🔗 Gemelo digital: ${direccionGemelo}`);
      const gemelo = new ethers.Contract(direccionGemelo, SEMILLA_INDIVIDUAL_ABI, wallet);

      console.log("💉 Inyectando telemetría climática en 1 paso...");
      const tx = await gemelo.inyectarClima(temperatura, humedad, precipitacion, horasLuz);
      const receipt = await tx.wait();

      return NextResponse.json({
        success: true,
        modo: "factory",
        semillaId,
        contratoIndividual: direccionGemelo,
        txHash: receipt.hash,
        msg: `✅ Clima inyectado en Gemelo Digital de semilla #${semillaId}`,
        info: clima,
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    //  MODO B: LEGACY (v1) — Receptor CRE centralizado
    // ─────────────────────────────────────────────────────────────────────
    if (!receptorAddr) {
      return err("NEXT_PUBLIC_ORACLE_ADDRESS_SEPOLIA no configurado para modo legacy", 500);
    }

    const Receptor = new ethers.Contract(receptorAddr, RECEPTOR_ABI, wallet);

    const reporteEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ["int256", "uint256", "uint256", "uint256", "uint256"],
      [temperatura, humedad, precipitacion, horasLuz, timestamp]
    );

    console.log("🔑 [Legacy] Abriendo bóveda del receptor CRE...");
    await (await Receptor.actualizarForwarder(wallet.address)).wait();

    console.log("💉 [Legacy] Inyectando reporte climático...");
    const txLeg = await Receptor.fulfillReport(semillaId, reporteEncoded);
    const receiptLeg = await txLeg.wait();

    console.log("🔒 [Legacy] Restaurando Chainlink como Forwarder...");
    await (await Receptor.actualizarForwarder(CHAINLINK_OFICIAL)).wait();

    return NextResponse.json({
      success: true,
      modo: "legacy",
      semillaId,
      txHash: receiptLeg.hash,
      msg: `✅ [Legacy] Clima inyectado en receptor CRE para semilla #${semillaId}`,
      info: clima,
    });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error desconocido en el servidor";
    console.error("❌ Error interno del Oráculo:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}