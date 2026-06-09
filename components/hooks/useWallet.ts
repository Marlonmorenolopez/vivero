// components/hooks/useWallet.ts
// ─── Hook de conexión a MetaMask / ethers v6 ─────────────────────────────────
"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { ViveroInterface, EstadisticasParamo, RedConfig } from "@/types/vivero";
import contractABI_ganache from "@/abis/contractABI_ganache.json";
import contractABI_sepolia from "@/abis/contractABI_sepolia.json";
import oracleABI from "@/abis/oracleABI.json";

// ─── Configuración de redes ───────────────────────────────────────────────────
const REDES: Record<number, RedConfig> = {
  31337: {
    nombre: "Hardhat Local",
    tieneOracle: false,
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_GANACHE ?? "",
    oracleAddress: "",
    nftAddress: process.env.NEXT_PUBLIC_NFT_ADDRESS_GANACHE ?? "",
    abi: contractABI_ganache,
  },
  11155111: {
    nombre: "Sepolia Testnet",
    tieneOracle: true,
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA ?? "",
    oracleAddress: process.env.NEXT_PUBLIC_ORACLE_ADDRESS_SEPOLIA ?? "",
    nftAddress: process.env.NEXT_PUBLIC_NFT_ADDRESS_SEPOLIA ?? "",
    abi: contractABI_sepolia,
  },
};

const getViveroContract = (
  address: string,
  signer: ethers.Signer,
  abi: unknown[]
) =>
  new ethers.Contract(address, abi as ethers.InterfaceAbi, signer) as unknown as ViveroInterface;

const getOracleContract = (address: string, signer: ethers.Signer) =>
  new ethers.Contract(address, oracleABI as ethers.InterfaceAbi, signer);

export function useWallet() {
  const [contract, setContract] = useState<ViveroInterface | null>(null);
  const [oracleContract, setOracleContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [nftAddress, setNftAddress] = useState<string>("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [networkName, setNetworkName] = useState<string>("");
  const [chainId, setChainId] = useState<number>(0);
  const [tieneOracle, setTieneOracle] = useState(false);
  const [accountAddress, setAccountAddress] = useState<string>("");
  const [totalSemillas, setTotalSemillas] = useState(0);
  const [totalPlantas, setTotalPlantas] = useState(0);
  const [estadisticasParamo, setEstadisticasParamo] =
    useState<EstadisticasParamo | null>(null);

  const actualizarEstadisticasParamo = useCallback(
    async (c: ViveroInterface | null = contract) => {
      if (!c) return;
      try {
        const stats = await c.obtenerEstadisticasParamo();
        setEstadisticasParamo({
          totalSemillas: Number(stats[0]),
          totalPlantas: Number(stats[1]),
          totalEspeciesNativas: Number(stats[2]),
          totalEventosClimaticos: Number(stats[3]),
        });
      } catch (e) {
        console.error("Error estadísticas páramo:", e);
      }
    },
    [contract]
  );

  const actualizarTotales = useCallback(
    async (c: ViveroInterface | null = contract) => {
      if (!c) return;
      try {
        // ✅ Fix: cuando Factory está activa, el contador real de semillas viene de
        // Factory.totalSemillasAdoptadas(). Vivero.sol solo se usa como fallback legacy
        // porque la Factory v2.0.0 ya desplegada no sincroniza con Vivero.sol.
        const factoryAddr = process.env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA;
        let semillasFinal = 0;

        if (factoryAddr) {
          try {
            const factoryContract = new ethers.Contract(
              factoryAddr,
              [
                "function totalSemillasAdoptadas() external view returns (uint256)",
              ],
              (c as ethers.BaseContract).runner as ethers.Provider
            );
            semillasFinal = Number(await factoryContract.totalSemillasAdoptadas());
          } catch {
            // Factory no disponible, leer de Vivero.sol como fallback
            const legacy = await c.totalSemillasRegistradas();
            semillasFinal = Number(legacy);
          }
        } else {
          const legacy = await c.totalSemillasRegistradas();
          semillasFinal = Number(legacy);
        }

        // ✅ Fix: contar traslados sumando todos los gemelos individuales de la Factory.
        // Vivero.sol.totalPlantasTrasladadasGlobal() = 0 porque los traslados se hacen
        // directamente en SemillaIndividual (Gemelo), no en Vivero.sol.
        let plantasFinal = 0;
        if (factoryAddr && semillasFinal > 0) {
          try {
            const factoryForPlantas = new ethers.Contract(
              factoryAddr,
              [
                "function buscarContratoPorId(uint256) external view returns (address)",
              ],
              (c as ethers.BaseContract).runner as ethers.Provider
            );
            const GEMELO_RESUMEN_ABI = [
              "function obtenerResumen() external view returns (uint256, string, string, int256, int256, uint256, uint256, uint256, uint256, uint256)"
            ];
            let totalTraslados = 0;
            for (let i = 1; i <= semillasFinal; i++) {
              try {
                const gemeloDireccion = await factoryForPlantas.buscarContratoPorId(i);
                if (gemeloDireccion && gemeloDireccion !== ethers.ZeroAddress) {
                  const gemelo  = new ethers.Contract(gemeloDireccion, GEMELO_RESUMEN_ABI, (c as ethers.BaseContract).runner as ethers.Provider);
                  const resumen = await gemelo.obtenerResumen();
                  totalTraslados += Number(resumen[7]); // índice 7 = totalTraslados en obtenerResumen (0:id,1:especie,2:responsable,3:lat,4:lon,5:altitud,6:totalReportes,7:totalTraslados)
                }
              } catch { /* gemelo no responde, ignorar */ }
            }
            plantasFinal = totalTraslados;
          } catch {
            // Fallback: leer de Vivero.sol
            const plantas = await c.totalPlantasTrasladadasGlobal();
            plantasFinal = Number(plantas);
          }
        } else {
          const plantas = await c.totalPlantasTrasladadasGlobal();
          plantasFinal = Number(plantas);
        }

        setTotalSemillas(semillasFinal);
        setTotalPlantas(plantasFinal);
      } catch (e) {
        console.error("Error actualizando totales:", e);
      }
    },
    [contract]
  );

  const resetState = useCallback(() => {
    setWalletConnected(false);
    setContract(null);
    setOracleContract(null);
    setSigner(null);
    setNftAddress("");
    setConnectionStatus("");
    setNetworkName("");
    setChainId(0);
    setTieneOracle(false);
    setAccountAddress("");
    setTotalSemillas(0);
    setTotalPlantas(0);
    setEstadisticasParamo(null);
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask no está instalado");
      }

      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const id = Number(network.chainId);

      if (!REDES[id])
        throw new Error(
          "Red no soportada. Conecta con Hardhat Local (31337) o Sepolia (11155111)"
        );

      const redConfig = REDES[id];
      if (!redConfig.contractAddress)
        throw new Error(
          "No hay dirección de contrato para esta red. Verifica tu .env"
        );

      const _signer = await provider.getSigner();
      const address = await _signer.getAddress();

      const contractInstance = getViveroContract(
        redConfig.contractAddress,
        _signer,
        redConfig.abi
      );

      setSigner(_signer);
      setNftAddress(redConfig.nftAddress);
      setAccountAddress(address);
      setNetworkName(redConfig.nombre);
      setChainId(id);
      setTieneOracle(redConfig.tieneOracle);
      setContract(contractInstance);
      setOracleContract(
        redConfig.tieneOracle && redConfig.oracleAddress
          ? getOracleContract(redConfig.oracleAddress, _signer)
          : null
      );
      setWalletConnected(true);
      setConnectionStatus("Wallet conectada");

      // Cargar datos iniciales
      await Promise.all([
        actualizarTotales(contractInstance),
        actualizarEstadisticasParamo(contractInstance),
      ]);
    } catch (error: unknown) {
      setConnectionStatus(
        "Error: " + (error instanceof Error ? error.message : "Desconocido")
      );
    }
  }, [actualizarTotales, actualizarEstadisticasParamo]);

  // Listener de cambio de red
  useEffect(() => {
    if (typeof window.ethereum === "undefined") return;
    const handler = () => resetState();
    window.ethereum.on("chainChanged", handler);
    return () => window.ethereum.removeListener?.("chainChanged", handler);
  }, [resetState]);

  return {
    contract,
    oracleContract,
    signer,
    nftAddress,
    walletConnected,
    connectionStatus,
    networkName,
    chainId,
    tieneOracle,
    accountAddress,
    totalSemillas,
    totalPlantas,
    estadisticasParamo,
    connectWallet,
    actualizarTotales: () => actualizarTotales(),
    actualizarEstadisticasParamo: () => actualizarEstadisticasParamo(),
    REDES,
  };
}