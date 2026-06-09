// types/vivero.ts
// ============================================================
//  Tipos Centrales y Mapeo EVM — EcoChain Vivero v2.1.0
//  Versión Limpia de Producción (Direct Wallet Ownership)
// ============================================================

import { ethers } from "ethers";

export type Language = "es" | "en" | "fr" | "de";

export type Semilla = {
  id: bigint;
  especie: string;
  responsable: string;
  latitudInicial: bigint;
  longitudInicial: bigint;
  altitud: bigint;
  comentariosIniciales: string;
  adoptante: string;
  contratoGemelo: string;
  fechaAdopcion: bigint;
};

export type ReporteClimatico = {
  temperatura: bigint;
  humedadRelativa: bigint;
  precipitacion: bigint;
  horasLuzSolar: bigint;
  timestamp: bigint;
};

export type Traslado = {
  semillaId: bigint;
  latitud: bigint;
  longitud: bigint;
  altitud: bigint;
  responsable: string;
  comentarios: string;
  timestamp: bigint;
};

export type FaseCrecimiento = {
  semillaId: bigint;
  estado: string;
  observaciones: string;
  timestamp: bigint;
};

export type EspecieNativa = {
  id: bigint;
  nombre: string;
  descripcion: string;
  poblacionEstimada: bigint;
  timestamp: bigint;
};

export type EventoClimatico = {
  id: bigint;
  tipo: string;
  temperatura: bigint;
  precipitacion: bigint;
  semillaId: bigint;
  timestamp: bigint;
};

export type EstadisticasParamo = {
  totalSemillas: number;
  totalPlantas: number;
  totalEspeciesNativas: number;
  totalEventosClimaticos: number;
};

export type RedConfig = {
  nombre: string;
  tieneOracle: boolean;
  contractAddress: string;
  oracleAddress: string;
  nftAddress: string;
  abi: unknown[];
};

export interface ViveroInterface extends ethers.BaseContract {
  owner: () => Promise<string>;
  paused: () => Promise<boolean>;
  walletONG: () => Promise<string>;
  walletDesarrollador: () => Promise<string>;
  totalSemillasRegistradas: () => Promise<bigint>;
  totalPlantasTrasladadasGlobal: () => Promise<bigint>;
  totalEspeciesNativas: () => Promise<bigint>;
  totalEventosClimaticos: () => Promise<bigint>;

  obtenerSemilla: (id: number | bigint) => Promise<Semilla>;
  obtenerUltimoClima: (id: number | bigint) => Promise<ReporteClimatico>;
  obtenerHistorialClimatico: (id: number | bigint) => Promise<ReporteClimatico[]>;
  obtenerHistorialTraslados: (id: number | bigint) => Promise<Traslado[]>;
  obtenerFasesCrecimiento: (id: number | bigint) => Promise<FaseCrecimiento[]>;
  obtenerEspecieNativa: (id: number | bigint) => Promise<EspecieNativa>;
  obtenerEventoClimatico: (id: number | bigint) => Promise<EventoClimatico>;
  obtenerTodasLasSemillas: () => Promise<Semilla[]>;
  buscarSemillasPorResponsable: (responsable: string) => Promise<[bigint[], Semilla[]]>;
  obtenerLeaderboard: (semillaId: number | bigint) => Promise<[string[], bigint[], bigint[]]>;
  obtenerEstadisticasParamo: () => Promise<[bigint, bigint, bigint, bigint, bigint, bigint]>;
  obtenerResumen: (id: number | bigint) => Promise<[bigint, string, string, bigint, bigint, bigint, bigint, bigint, bigint, bigint, string, string]>;

  eliminarSemilla: {
    (idSemilla: number | bigint): Promise<ethers.ContractTransactionResponse>;
    estimateGas: (idSemilla: number | bigint) => Promise<bigint>;
  };

  eliminarPlanta: {
    (idPlanta: number | bigint): Promise<ethers.ContractTransactionResponse>;
    estimateGas: (idPlanta: number | bigint) => Promise<bigint>;
  };
  
  registrarSemilla: {
    (
      especie: string,
      responsable: string,
      latitud: number | bigint,
      longitud: number | bigint,
      altitud: number | bigint,
      comentarios: string,
      contratoGemelo: string,
      adoptante: string
    ): Promise<ethers.ContractTransactionResponse>;
    estimateGas: (
      especie: string,
      responsable: string,
      latitud: number | bigint,
      longitud: number | bigint,
      altitud: number | bigint,
      comentarios: string,
      contratoGemelo: string,
      adoptante: string
    ) => Promise<bigint>;
  };

  registrarTraslado: {
    (
      semillaId: number | bigint,
      latitud: number | bigint,
      longitud: number | bigint,
      altitud: number | bigint,
      responsable: string,
      comentarios: string
    ): Promise<ethers.ContractTransactionResponse>;
    estimateGas: (
      semillaId: number | bigint,
      latitud: number | bigint,
      longitud: number | bigint,
      altitud: number | bigint,
      responsable: string,
      comentarios: string
    ) => Promise<bigint>;
  };

  inyectarClima: {
    (
      semillaId: number | bigint,
      temperatura: number | bigint,
      humedadRelativa: number | bigint,
      precipitacion: number | bigint,
      horasLuzSolar: number | bigint
    ): Promise<ethers.ContractTransactionResponse>;
    estimateGas: (
      semillaId: number | bigint,
      temperatura: number | bigint,
      humedadRelativa: number | bigint,
      precipitacion: number | bigint,
      horasLuzSolar: number | bigint
    ) => Promise<bigint>;
  };

  actualizarFaseCrecimiento: (
    semillaId: number | bigint,
    estado: string,
    observaciones: string
  ) => Promise<ethers.ContractTransactionResponse>;

  registrarEspecieNativa: (
    nombre: string,
    descripcion: string,
    poblacionEstimada: number | bigint
  ) => Promise<ethers.ContractTransactionResponse>;

  registrarEventoClimatico: (
    tipo: string,
    temperatura: number | bigint,
    precipitacion: number | bigint,
    semillaId?: number | bigint   // Ganache: 4 params; Sepolia: 3 params (omitir)
  ) => Promise<ethers.ContractTransactionResponse>;

  transferirPropiedad: (nuevoDueno: string) => Promise<ethers.ContractTransactionResponse>;
  agregarAdministrador: (admin: string) => Promise<ethers.ContractTransactionResponse>;
  removerAdministrador: (admin: string) => Promise<ethers.ContractTransactionResponse>;
  pausar: () => Promise<ethers.ContractTransactionResponse>;
  despausar: () => Promise<ethers.ContractTransactionResponse>;
  rescatarETH: () => Promise<ethers.ContractTransactionResponse>;
}