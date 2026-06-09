// components/Tabs/Registro.tsx
// ============================================================
//  Pestaña de Registro — v2.0.0 (Factory Pattern)
//
//  Novedades respecto a v1:
//  ─────────────────────────────────────────────────────────
//  • Botón de adopción apunta a ViveroFactory.adoptarSemilla()
//  • Calcula y envía el precio base de adopción en ETH
//  • Tras confirmación on-chain dispara /api/inject-climate
//    pasando semillaId + coordenadas + dirección del gemelo
//  • Mantiene el modo manual (Ganache / registrarSemilla)
//    100% intacto como fallback
//  • Registrar traslado sigue usando Vivero (sin cambio)
// ============================================================

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Truck, Sprout, History } from 'lucide-react';
import { ResultCard } from "@/components/ui/ResultCard";
import { ViveroInterface } from '../EcoChainComponent';
import { ethers } from 'ethers';
import SeedSelectionModal from '../SeedSelectionModal';
import PlantTransferModal  from '../PlantTransferModal';
import SeedAdoptionModal   from '../SeedAdoptionModal';

const SEED_TYPES = ["Frailejon", "Cardones", "Macolla", "Bambues"];

// ─── ABI mínimo de la Factory para la pestaña de Registro ────────────────
const FACTORY_ABI_MINIMO = [
  "function adoptarSemilla(string especie, string responsable, int256 latitud, int256 longitud, uint256 altitud, string comentariosIniciales) external payable returns (uint256 semillaId, address contratoIndividual)",
  "function precioAdopcion() external view returns (uint256)",
  "function totalSemillasAdoptadas() external view returns (uint256)",
  "function buscarContratoPorId(uint256) external view returns (address)",
  "event SemillaAdoptada(uint256 indexed semillaId, address indexed contratoIndividual, address indexed adoptante, string especie, string responsable, int256 latitud, int256 longitud, uint256 altitud, uint256 montoONG, uint256 montoPlataforma, uint256 timestamp)"
];

interface RegistroProps {
  contract:          ViveroInterface | null;
  oracleContract:    ethers.Contract | null;
  chainId:           number;
  tieneOracle:       boolean;
  signer:            ethers.Signer | null;
  nftAddress:        string;
  setResultado:      React.Dispatch<React.SetStateAction<string>>;
  setGasEstimate:    React.Dispatch<React.SetStateAction<string>>;
  walletConnected:   boolean;
  actualizarTotales: (latitud?: number, longitud?: number) => Promise<void>;
  language:          'es' | 'en' | 'fr' | 'de';
}

// ── DarkSectionR ─────────────────────────────────────────────
const DS_TOKENS_R: Record<string, { accent: string; border: string; bg: string; titleColor: string }> = {
  purple: { accent: "#a78bfa", border: "rgba(139,92,246,0.22)", bg: "rgba(139,92,246,0.06)", titleColor: "#c4b5fd" },
  orange: { accent: "#fb923c", border: "rgba(249,115,22,0.22)", bg: "rgba(249,115,22,0.06)", titleColor: "#fdba74" },
};
const DarkSectionR: React.FC<{
  color: keyof typeof DS_TOKENS_R;
  icon: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
}> = ({ color, icon, title, children }) => {
  const tk = DS_TOKENS_R[color] ?? DS_TOKENS_R.purple;
  return (
    <div style={{
      borderRadius: 14, border: `1px solid ${tk.border}`,
      borderLeft: `3px solid ${tk.accent}`,
      background: "rgba(15,18,28,0.82)",
      backdropFilter: "blur(12px)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "10px 14px", borderBottom: `1px solid ${tk.border}`,
        background: tk.bg,
      }}>
        <span style={{ color: tk.accent, display: "flex", alignItems: "center", flexShrink: 0 }}>{icon}</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: tk.titleColor }}>{title}</span>
      </div>
      <div style={{ padding: "14px" }}>{children}</div>
    </div>
  );
};


const Registro: React.FC<RegistroProps> = ({
  contract,
  oracleContract,
  chainId,
  tieneOracle,
  signer,
  nftAddress,
  setResultado,
  setGasEstimate,
  walletConnected,
  actualizarTotales,
  language
}) => {
  const [isDialogOpen,             setIsDialogOpen]             = useState(false);
  const [selectedItem,             setSelectedItem]             = useState<string | null>(null);
  const [isPlantTransferModalOpen,  setIsPlantTransferModalOpen]  = useState(false);
  const [isSeedAdoptionModalOpen,   setIsSeedAdoptionModalOpen]   = useState(false);
  const [semillaId,                setSemillaId]                = useState<string>('');

  // Estado para modal de traslado
  const [ultimaPlanta, setUltimaPlanta] = useState<{
    idPlanta:              number;
    idSemilla:             number;
    especie:               string;
    responsable:           string;
    latitud:               number;
    longitud:              number;
    temperatura:           number;
    humedad:               number;
    altitud:               number;
    contratoIndividual?:   string; // ← dirección del gemelo recién creado
  } | null>(null);

  // Estado para modal de adopción (independiente del traslado)
  const [ultimaAdopcion, setUltimaAdopcion] = useState<{
    semillaIdFactory: number;
    semillaId:        string;
    especie:          string;
    responsable:      string;
    latitud:          number;
    longitud:         number;
    temperatura:      number;
    humedad:          number;
    altitud:          number;
    contratoIndividual: string;
    ciudad:           string;
    precipitacion:    number;
    horasLuz:         number;
    comentarios:      string;
    txHash:           string;
  } | null>(null);

  const [formLatitud,     setFormLatitud]     = useState('');
  const [formLongitud,    setFormLongitud]    = useState('');
  const [formTipo,        setFormTipo]        = useState('');
  const [formResponsable, setFormResponsable] = useState('');
  const [trasResponsable, setTrasResponsable] = useState('');

  // Precio de adopción leído de la Factory
  const [precioAdopcionWei, setPrecioAdopcionWei] = useState<bigint>(BigInt(0));
  const [precioAdopcionETH, setPrecioAdopcionETH] = useState<string>('');

  // Resultados inline por Card
  const [resultAdopcion,  setResultAdopcion]  = useState<{ ok: boolean; lines: { label: string; value: string }[] } | null>(null);
  const [resultTraslado,  setResultTraslado]  = useState<{ ok: boolean; lines: { label: string; value: string }[] } | null>(null);

  const translations = {
    es: {
      registerSeed: "Adoptar Semilla (Factory — Gemelo Digital)",
      registerSeedLegacy: "Registrar Semilla (Modo Automatizado CRE)",
      seedType: "Tipo de Semilla",
      selectSeedType: "Seleccionar Tipo de Semilla",
      responsible: "Responsable",
      selectResponsible: "Responsable de Quien Registra la Semilla",
      latitude: "Latitud (Coordenada)",
      longitude: "Longitud (Coordenada)",
      temperature: "Temperatura (°C)",
      relativeHumidity: "Humedad Relativa (%)",
      precipitation: "Precipitación (mm)",
      sunlightHours: "Horas de Luz Solar",
      altitude: "Altitud (m)",
      careComments: "Comentarios de Cuidado",
      adoptButton: "🌱 Adoptar Semilla (crea Gemelo Digital)",
      registerSeedButton: "Registrar Semilla en Blockchain",
      registerPlantTransfer: "Registrar Traslado de Planta",
      seedId: "ID de la Semilla",
      transferResponsible: "Responsable del Traslado",
      selectTransferResponsible: "Responsable de Quien Realiza el Traslado",
      registerTransferButton: "Registrar Traslado",
      walletNotConnected: "Por favor, conecta tu billetera para poder registrar semillas o trasladar plantas.",
      modoFactory: "🏭 Factory Activa (Gemelos Digitales)",
      modoOracle: "🔗 Automatización Activa (Chainlink CRE)",
      modoManual: "✏️ Modo Manual (Local)",
      infoFactory: "Modo Factory: Cada semilla adoptada despliega su propio contrato inteligente independiente. El 95% del valor va a la ONG y el 5% a la plataforma.",
      infoOracle: "Ecosistema Chainlink CRE: Las condiciones climáticas del Páramo se gestionarán asíncronamente en el contrato receptor mediante la infraestructura de nodos.",
      loadingPrice: "Cargando precio...",
      seedTypes: {
        Frailejon: "Frailejón",
        Cardones: "Cardones",
        Macolla: "Macolla",
        Bambues: "Bambúes"
      },
    },
    en: {
      registerSeed: "Adopt Seed (Factory — Digital Twin)",
      registerSeedLegacy: "Register Seed (CRE Automated Mode)",
      seedType: "Seed Type",
      selectSeedType: "Select Seed Type",
      responsible: "Responsible",
      selectResponsible: "Person Registering the Seed",
      latitude: "Latitude",
      longitude: "Longitude",
      temperature: "Temperature (°C)",
      relativeHumidity: "Relative Humidity (%)",
      precipitation: "Precipitation (mm)",
      sunlightHours: "Sunlight Hours",
      altitude: "Altitude (m)",
      careComments: "Care Comments",
      adoptButton: "🌱 Adopt Seed (creates Digital Twin)",
      registerSeedButton: "Register Seed on Blockchain",
      registerPlantTransfer: "Register Plant Transfer",
      seedId: "Seed ID",
      transferResponsible: "Transfer Responsible",
      selectTransferResponsible: "Person Performing the Transfer",
      registerTransferButton: "Register Transfer",
      walletNotConnected: "Please connect your wallet to register seeds or transfer plants.",
      modoFactory: "🏭 Factory Active (Digital Twins)",
      modoOracle: "🔗 Automation Active (Chainlink CRE)",
      modoManual: "✏️ Manual Mode",
      infoFactory: "Factory Mode: Each adopted seed deploys its own independent smart contract. 95% goes to the NGO, 5% to the platform.",
      infoOracle: "Chainlink CRE Ecosystem: Climate parameters are handled asynchronously via contract integration with core nodes.",
      loadingPrice: "Loading price...",
      seedTypes: {
        Frailejon: "Frailejón (Espeletia)",
        Cardones: "Cardones (Cacti)",
        Macolla: "Macolla (Bunch Grass)",
        Bambues: "Bambúes (Bamboo)"
      },
    },
    fr: {
      registerSeed: "Adopter la Graine (Factory — Jumeau Numérique)",
      registerSeedLegacy: "Enregistrer la Graine (Mode CRE)",
      seedType: "Type de Graine",
      selectSeedType: "Sélectionner le Type de Graine",
      responsible: "Responsable",
      selectResponsible: "Responsable de l'Enregistrement",
      latitude: "Latitude",
      longitude: "Longitude",
      temperature: "Température (°C)",
      relativeHumidity: "Humidité Relative (%)",
      precipitation: "Précipitations (mm)",
      sunlightHours: "Heures d'Ensoleillement",
      altitude: "Altitude (m)",
      careComments: "Commentaires de Soin",
      adoptButton: "🌱 Adopter la Graine (crée un Jumeau Numérique)",
      registerSeedButton: "Enregistrer la Graine",
      registerPlantTransfer: "Enregistrer le Transfert",
      seedId: "ID de la Graine",
      transferResponsible: "Responsable du Transfert",
      selectTransferResponsible: "Responsable du Transfert",
      registerTransferButton: "Enregistrer le Transfert",
      walletNotConnected: "Veuillez connecter votre portefeuille.",
      modoFactory: "🏭 Factory Active (Jumeaux Numériques)",
      modoOracle: "🔗 Mode Automatisé (Chainlink CRE)",
      modoManual: "✏️ Mode Manuel",
      infoFactory: "Mode Factory: Chaque graine adoptée déploie son propre contrat indépendant. 95% va à l'ONG, 5% à la plateforme.",
      infoOracle: "Écosystème Chainlink CRE: Les données climatiques seront transmises de façon asynchrone.",
      loadingPrice: "Chargement du prix...",
      seedTypes: {
        Frailejon: "Frailejón (Espeletia)",
        Cardones: "Cardones (Cactus)",
        Macolla: "Macolla (Herbe en touffe)",
        Bambues: "Bambúes (Bambou)"
      },
    },
    de: {
      registerSeed: "Samen adoptieren (Factory — Digitaler Zwilling)",
      registerSeedLegacy: "Samen registrieren (CRE-Modus)",
      seedType: "Samentyp",
      selectSeedType: "Samentyp auswählen",
      responsible: "Verantwortlicher",
      selectResponsible: "Verantwortlicher für die Samenregistrierung",
      latitude: "Breitengrad",
      longitude: "Längengrad",
      temperature: "Temperatur (°C)",
      relativeHumidity: "Relative Luftfeuchtigkeit (%)",
      precipitation: "Niederschlag (mm)",
      sunlightHours: "Sonnenstunden",
      altitude: "Höhe (m)",
      careComments: "Pflegekommentare",
      adoptButton: "🌱 Samen adoptieren (erstellt Digitalen Zwilling)",
      registerSeedButton: "Samen registrieren",
      registerPlantTransfer: "Pflanzentransfer registrieren",
      seedId: "Samen-ID",
      transferResponsible: "Verantwortlicher für den Transfer",
      selectTransferResponsible: "Verantwortlicher für den Transfer",
      registerTransferButton: "Transfer registrieren",
      walletNotConnected: "Bitte verbinden Sie Ihr Wallet.",
      modoFactory: "🏭 Factory Aktiv (Digitale Zwillinge)",
      modoOracle: "🔗 Automatisierung Aktiv (Chainlink CRE)",
      modoManual: "✏️ Manueller Modus",
      infoFactory: "Factory-Modus: Jeder adoptierte Samen erstellt einen eigenen unabhängigen Smart Contract. 95% geht an die NGO, 5% an die Plattform.",
      infoOracle: "Chainlink CRE-Ökosystem: Klimadaten werden asynchron übertragen.",
      loadingPrice: "Preis wird geladen...",
      seedTypes: {
        Frailejon: "Frailejón (Espeletia)",
        Cardones: "Cardones (Kakteen)",
        Macolla: "Macolla (Büschelgras)",
        Bambues: "Bambúes (Bambus)"
      },
    },
  };

  const t = translations[language];

  // ─── Determinar si estamos en modo Factory (Sepolia con Factory configurada) ──
  const tieneFactory = tieneOracle &&
    Boolean(process.env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA);

  // ─── Obtener precio de adopción de la Factory ──────────────────────────
  const cargarPrecioAdopcion = async () => {
    if (!signer || !tieneFactory) return;
    try {
      const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA!;
      const factory = new ethers.Contract(factoryAddress, FACTORY_ABI_MINIMO, signer);
      const precio  = await factory.precioAdopcion();
      setPrecioAdopcionWei(precio);
      setPrecioAdopcionETH(ethers.formatEther(precio));
    } catch (e) {
      console.warn("No se pudo cargar precio de adopción:", e);
    }
  };

  const handleItemSelect = (value: string) => {
    setSelectedItem(value);
    setFormTipo(value);
    setIsDialogOpen(true);
    // Cargar el precio cuando el usuario selecciona una especie
    cargarPrecioAdopcion();
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  MODO FACTORY: adoptarSemilla() → ViveroFactory
  //  Despliega un SemillaIndividual y hace split 95/5 inmediato
  // ─────────────────────────────────────────────────────────────────────────
  const adoptarSemillaFactory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signer || !walletConnected) return;

    const formData             = new FormData(event.currentTarget);
    const tipo                 = formData.get('tipo') as string || formTipo;
    const responsable          = formData.get('responsable') as string || formResponsable;
    const comentariosDeCuidado = formData.get('comentariosDeCuidado') as string;
    const altitud              = parseFloat(formData.get('altitud') as string);
    const latitudExacta        = parseFloat(formLatitud);
    const longitudExacta       = parseFloat(formLongitud);

    if (!tipo || !responsable) {
      setResultado("❌ Completa el tipo de semilla y el responsable.");
      return;
    }

    try {
      setResultado("⏳ Conectando con la Factory... obteniendo precio de adopción...");

      const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA!;
      const factory = new ethers.Contract(factoryAddress, FACTORY_ABI_MINIMO, signer);

      // Leer precio actualizado
      const precio = await factory.precioAdopcion();
      setPrecioAdopcionWei(precio);
      setPrecioAdopcionETH(ethers.formatEther(precio));

      setResultado(`⏳ Adoptando semilla de ${tipo}...\n💰 Precio: ${ethers.formatEther(precio)} ETH (95% → ONG | 5% → Plataforma)`);

      // Llamar a adoptarSemilla con el valor exacto
      const latitudSolidity  = BigInt(Math.round(latitudExacta  * 1_000_000));
      const longitudSolidity = BigInt(Math.round(longitudExacta * 1_000_000));
      const altitudSolidity  = BigInt(Math.round(altitud));

      const tx = await factory.adoptarSemilla(
        tipo,
        responsable,
        latitudSolidity,
        longitudSolidity,
        altitudSolidity,
        comentariosDeCuidado,
        { value: precio }
      );

      setResultado(prev => prev + `\n⏳ Transacción enviada: ${tx.hash}\nEsperando confirmación en Sepolia...`);
      const receipt = await tx.wait();

      // ── Fix: Parsear AMBOS eventos del mismo receipt ──────────────────────
      // SemillaAdoptada  → ID en ViveroFactory  (mostrar en UI)
      // SemillaRegistrada → ID en Vivero.sol    (usar para registrarTraslado)
      let semillaIdCreada: number   = 0;   // ID de ViveroFactory
      let semillaIdVivero: number   = 0;   // ID de Vivero.sol ← el correcto para traslados
      let gemeloDireccion: string   = "";

      const VIVERO_ABI_EVENTO = [
        "event SemillaRegistrada(uint256 indexed semillaId, address indexed contratoGemelo, address indexed adoptante, string especie, string responsable, int256 latitud, int256 longitud, uint256 altitud, uint256 timestamp)"
      ];

      try {
        const ifaceFactory = new ethers.Interface(FACTORY_ABI_MINIMO);
        const ifaceVivero  = new ethers.Interface(VIVERO_ABI_EVENTO);
        for (const log of receipt.logs) {
          try {
            const parsed = ifaceFactory.parseLog(log);
            if (parsed?.name === "SemillaAdoptada") {
              semillaIdCreada = Number(parsed.args.semillaId);
              gemeloDireccion = parsed.args.contratoIndividual;
            }
          } catch { /* log de otro contrato, ignorar */ }
          try {
            const parsed = ifaceVivero.parseLog(log);
            if (parsed?.name === "SemillaRegistrada") {
              semillaIdVivero = Number(parsed.args.semillaId);
            }
          } catch { /* log de otro contrato, ignorar */ }
        }
      } catch (e) {
        console.warn("No se pudo parsear eventos de adopción:", e);
      }

      // ✅ Guardar el ID de Vivero.sol en el campo de traslado
      const idParaTraslado = semillaIdVivero > 0 ? semillaIdVivero : semillaIdCreada;
      setSemillaId(String(idParaTraslado));

      setResultAdopcion({ ok: true, lines: [
        { label: "✅ Estado",           value: "¡Semilla adoptada con éxito!" },
        { label: "🌱 ID Factory",       value: `#${semillaIdCreada}` },
        { label: "📦 ID Vivero",        value: `#${semillaIdVivero}` },
        { label: "🔗 Gemelo",           value: `${gemeloDireccion.slice(0,10)}…${gemeloDireccion.slice(-6)}` },
        { label: "📄 Tx",               value: `${receipt.hash.slice(0,18)}…` },
        { label: "🍃 Especie",          value: tipo },
        { label: "👤 Responsable",      value: responsable },
        { label: "📍 Latitud",          value: `${latitudExacta.toFixed(6)}` },
        { label: "📍 Longitud",         value: `${longitudExacta.toFixed(6)}` },
        { label: "⛰️ Altitud",          value: `${altitud} m` },
        { label: "💬 Comentarios",      value: comentariosDeCuidado },
        { label: "🌡️ Temperatura",      value: "⏳ cargando..." },
        { label: "💧 Humedad",          value: "⏳ cargando..." },
        { label: "🌧️ Precipitación",    value: "⏳ cargando..." },
        { label: "☀️ Horas luz solar",  value: "⏳ cargando..." },
        { label: "🏙️ Ciudad",           value: "⏳ cargando..." },
      ]});
      setResultado(
        `✅ ¡Semilla adoptada con éxito!\n` +
        `🌱 ID Factory: #${semillaIdCreada}  |  ID Vivero: #${semillaIdVivero}\n` +
        `🔗 Gemelo Digital: ${gemeloDireccion}\n` +
        `📦 Tx: ${receipt.hash}\n` +
        `\n⏳ Activando oráculo climático en segundo plano...`
      );

      // ── Abrir modal de adopción (independiente del traslado) ───────────
      setUltimaAdopcion({
        semillaIdFactory:   semillaIdCreada,
        semillaId:          String(idParaTraslado),
        especie:            tipo,
        responsable,
        latitud:            isNaN(latitudExacta)  ? 4.711  : latitudExacta,
        longitud:           isNaN(longitudExacta) ? -74.07 : longitudExacta,
        temperatura:        0,
        humedad:            0,
        altitud:            isNaN(altitud) ? 3200 : altitud,
        contratoIndividual: gemeloDireccion,
        ciudad:             "",
        precipitacion:      0,
        horasLuz:           0,
        comentarios:        comentariosDeCuidado,
        txHash:             receipt.hash,
      });
      setIsSeedAdoptionModalOpen(true);

      // ── Disparar inyección de clima de forma asíncrona ─────────────────
            // Usar el ID correcto: Factory es el que existe on-chain en factory.buscarContratoPorId
            const semillaIdParaOracle = semillaIdCreada > 0 ? semillaIdCreada : semillaIdVivero;
            const latOracle  = isNaN(latitudExacta)  ? 4.711  : latitudExacta;
            const lonOracle  = isNaN(longitudExacta) ? -74.07 : longitudExacta;

            if (semillaIdParaOracle > 0) {
              fetch('/api/inject-climate', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                  semillaId:          semillaIdParaOracle,
                  lat:                latOracle,
                  lon:                lonOracle,
                  contratoIndividual: gemeloDireccion,
                  modo:               "factory"
                })
              })
                .then(r => r.json())
                .then(data => {
                  if (data.success) {
                    setResultado(prev =>
                      prev + `\n\n🌡️ ¡Clima inyectado en el Gemelo Digital!\n` +
                      `Temp: ${Number(data.info.temp).toFixed(1)}°C | Humedad: ${data.info.hum}% | Ciudad: ${data.info.ciudad}`
                    );
                    setResultAdopcion(prev => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        lines: prev.lines.map(l => {
                          if (l.label.includes("Temperatura"))    return { ...l, value: `${Number(data.info.temp).toFixed(1)}°C` };
                          if (l.label.includes("Humedad"))        return { ...l, value: `${data.info.hum}%` };
                          if (l.label.includes("Precipitación"))  return { ...l, value: `${data.info.precipitacion ?? 0} mm` };
                          if (l.label.includes("Horas luz"))      return { ...l, value: `${data.info.horasLuz ?? 0} h` };
                          if (l.label.includes("Ciudad"))         return { ...l, value: data.info.ciudad };
                          return l;
                        })
                      };
                    });
                    // Actualizar temp/humedad en ultimaAdopcion para que
                    // SeedAdoptionModal muestre los datos reales del oráculo
                    setUltimaAdopcion(prev => prev ? {
                      ...prev,
                      temperatura:   Math.round(Number(data.info.temp) * 10),
                      humedad:       Math.round(Number(data.info.hum)),
                      ciudad:        data.info.ciudad ?? "",
                      precipitacion: Math.round(Number(data.info.precipitacion) * 10),
                      horasLuz:      Number(data.info.horasLuz ?? 0),
                    } : prev);
                  } else {
                    setResultado(prev => prev + `\n\n⚠️ Oráculo automático: ${data.error}`);
                  }
                })
                .catch(err => {
                  setResultado(prev => prev + `\n\n⚠️ Error de red al conectar con el oráculo: ${err.message}`);
                });
            }

            // 🔄 Refresca las métricas visuales del dashboard. 
            // Al haber limpiado EcoChainComponent.tsx, esta línea ya no generará duplicados.
            await actualizarTotales(latitudExacta, longitudExacta);

          } catch (error) {
            console.error("Error al adoptar la semilla:", error);
            setResultAdopcion({ ok: false, lines: [{ label: "❌ Error", value: (error as Error).message }] });
            setResultado(`❌ Error al adoptar la semilla: ${(error as Error).message}`);
          }
        };
  // ─────────────────────────────────────────────────────────────────────────
  //  MODO LEGACY: registrarSemilla() → Alineado al nuevo Vivero.sol (v2.1.0)
  //  Se unifica el flujo eliminando el envío manual de parámetros climáticos.
  // ─────────────────────────────────────────────────────────────────────────
  const registrarSemillaLegacy = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contract || !walletConnected || !signer) return;

    const formData             = new FormData(event.currentTarget);
    const tipo                 = formData.get('tipo') as string || formTipo;
    const responsable          = formData.get('responsable') as string || formResponsable;
    const altitud              = parseFloat(formData.get('altitud') as string);
    const comentariosDeCuidado = formData.get('comentariosDeCuidado') as string;
    const latitudExacta        = parseFloat(formLatitud);
    const longitudExacta       = parseFloat(formLongitud);

    try {
      setResultado("⏳ Transmitiendo registro a la red de bloques...");
      
      // Obtenemos la dirección del usuario conectado para el registro manual
      const userAddress = await signer.getAddress();

      // 🛰️ ESCALADO MATEMÁTICO: Coordenadas y altitudes en formato entero para Solidity
      const latitudSolidity  = Math.round(latitudExacta  * 1_000_000);
      const longitudSolidity = Math.round(longitudExacta * 1_000_000);
      const altitudSolidity  = Math.round(altitud);

      // Como es modo manual/local (sin Factory), usamos la wallet del usuario como 
      // gemelo provisional y adoptante para cumplir las reglas de validación on-chain.
      const contratoGemeloDummy = userAddress;
      const adoptanteAddress    = userAddress;

      setResultado("⏳ Estimando costos de gas para el registro...");

      // 🔄 CORREGIDO: estimateGas con los 8 parámetros planos requeridos por la EVM
      const gasEst = await contract.registrarSemilla.estimateGas(
        tipo,
        responsable,
        latitudSolidity,
        longitudSolidity,
        altitudSolidity,
        comentariosDeCuidado,
        contratoGemeloDummy,
        adoptanteAddress
      );
      setGasEstimate(gasEst.toString());

      setResultado("⏳ Esperando la firma de confirmación en MetaMask...");

      // 🔄 CORREGIDO: Llamada oficial con los 8 parámetros planos definitivos
      const tx = await contract.registrarSemilla(
        tipo,
        responsable,
        latitudSolidity,
        longitudSolidity,
        altitudSolidity,
        comentariosDeCuidado,
        contratoGemeloDummy,
        adoptanteAddress
      );
      await tx.wait();

      setResultado(`✅ Semilla registrada con éxito.\nHash: ${tx.hash}`);
      await actualizarTotales(latitudExacta, longitudExacta);

    } catch (error) {
      console.error("Error al registrar la semilla:", error);
      setResultado(`❌ Error al registrar la semilla: ${(error as Error).message}`);
    }
  };

// ─────────────────────────────────────────────────────────────────────────
  //  REGISTRAR TRASLADO — v2.2.0
  //  ✅ Fix: llama a SemillaIndividual.registrarTraslado (el Gemelo Digital)
  //     en lugar de Vivero.sol. Vivero.sol usa su propio ID interno que no
  //     coincide con el ID de la Factory. El Gemelo ya conoce su propio ID.
  //
  //  Flujo:
  //  1. Usuario ingresa el ID de Factory (#24, #25, etc.)
  //  2. Se obtiene la dirección del Gemelo desde Factory.buscarContratoPorId()
  //  3. Se llama gemelo.registrarTraslado(lat, lon, altitud, responsable, comentarios)
  //     — sin semillaId, el gemelo ya sabe quién es.
  // ─────────────────────────────────────────────────────────────────────────
  const registrarTrasladoPlanta = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signer || !walletConnected) return;

    const formData             = new FormData(event.currentTarget);
    const idSemilla            = parseInt(formData.get('idSemilla') as string || semillaId);
    const latitud              = parseFloat(formData.get('latitud') as string);
    const longitud             = parseFloat(formData.get('longitud') as string);
    const responsableTraslado  = formData.get('responsableTraslado') as string || trasResponsable;
    const comentariosDeCuidado = formData.get('comentariosDeCuidado') as string;

    if (!idSemilla || idSemilla <= 0) {
      setResultado("❌ Ingresa un ID de semilla válido (número positivo).");
      return;
    }

    try {
      setResultado("⏳ Buscando Gemelo Digital de la semilla #" + idSemilla + "...");

      // ── 1. Obtener dirección del Gemelo Digital desde la Factory ─────────
      const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA!;
      const FACTORY_ABI_TRASLADO = [
        "function buscarContratoPorId(uint256) external view returns (address)",
        "function totalSemillasAdoptadas() external view returns (uint256)",
      ];
      const factory      = new ethers.Contract(factoryAddress, FACTORY_ABI_TRASLADO, signer);
      const totalAdopt   = Number(await factory.totalSemillasAdoptadas());

      if (idSemilla > totalAdopt) {
        setResultado(`❌ La semilla #${idSemilla} no existe. Total adoptadas: ${totalAdopt}.`);
        return;
      }

      const gemeloDireccion = await factory.buscarContratoPorId(idSemilla) as string;
      if (!gemeloDireccion || gemeloDireccion === ethers.ZeroAddress) {
        setResultado(`❌ No se encontró Gemelo Digital para semilla #${idSemilla}.`);
        return;
      }

      setResultado(`⏳ Gemelo encontrado: ${gemeloDireccion.slice(0,10)}…
Preparando traslado...`);

      // ── 2. ABI mínimo del Gemelo Individual ──────────────────────────────
      const GEMELO_ABI = [
        "function registrarTraslado(int256 _latitud, int256 _longitud, uint256 _altitud, string memory _responsable, string memory _comentarios) external",
        "function obtenerResumen() external view returns (uint256, string, string, int256, int256, uint256, uint256, uint256, uint256, uint256)",
      ];
      const gemelo = new ethers.Contract(gemeloDireccion, GEMELO_ABI, signer);

      // ── 3. Leer altitud original del gemelo ──────────────────────────────
      let altitudSolidity: bigint;
      try {
        const resumen = await gemelo.obtenerResumen();
        altitudSolidity = BigInt(resumen[5]); // altitud está en índice 5
      } catch {
        // Fallback: usar altitud del form si obtenerResumen falla
        const altitudForm = parseFloat((document.getElementById('altitudTraslado') as HTMLInputElement)?.value || '3000');
        altitudSolidity = BigInt(Math.round(altitudForm));
      }

      // ── 4. Escalar coordenadas para Solidity ─────────────────────────────
      const latitudSolidity  = BigInt(Math.round(latitud  * 1_000_000));
      const longitudSolidity = BigInt(Math.round(longitud * 1_000_000));

      setResultado("⏳ Esperando firma de confirmación en MetaMask...");

      // ── 5. Llamar al Gemelo Individual directamente ───────────────────────
      const tx = await gemelo.registrarTraslado(
        latitudSolidity,
        longitudSolidity,
        altitudSolidity,
        responsableTraslado,
        comentariosDeCuidado
      );
      await tx.wait();

      // ── También registrar en Vivero.sol para actualizar totalPlantasRegistradas ──
      try {
        const viveroAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA!;
        const VIVERO_TRASLADO_ABI = [
          "function registroTrasladoPlanta(uint256 _idSemilla, tuple(int256 latitud, int256 longitud) _ubicacionEnParamo, string memory _responsableTraslado, string memory _comentariosDeCuidado) external",
        ];
        const viveroContract = new ethers.Contract(viveroAddress, VIVERO_TRASLADO_ABI, signer);

        const VIVERO_ID_ABI = ["function totalSemillasRegistradas() external view returns (uint256)"];
        const viveroRead = new ethers.Contract(viveroAddress, VIVERO_ID_ABI, signer);
        const totalVivero = Number(await viveroRead.totalSemillasRegistradas());

        if (idSemilla <= totalVivero) {
          const tx2 = await viveroContract.registroTrasladoPlanta(
            idSemilla,
            { latitud: latitudSolidity, longitud: longitudSolidity },
            responsableTraslado,
            comentariosDeCuidado
          );
          await tx2.wait();
        }
      } catch (e) {
        console.warn("Traslado registrado en Gemelo pero no en Vivero.sol:", e);
      }

      await actualizarTotales();

      // ── 6. Leer clima previo si existe ───────────────────────────────────
      let temperatura = 0, humedad = 0;
      try {
        const GEMELO_CLIMA_ABI = [
          "function obtenerUltimoClima() external view returns (int256 temperatura, uint256 humedadRelativa, uint256 precipitacion, uint256 horasLuzSolar, uint256 timestamp)"
        ];
        const gemeloClima = new ethers.Contract(gemeloDireccion, GEMELO_CLIMA_ABI, signer);
        const clima = await gemeloClima.obtenerUltimoClima();
        temperatura = Number(clima[0]) / 10;  // índice 0 = temperatura (struct devuelto como array)
        humedad     = Number(clima[1]);        // índice 1 = humedadRelativa
      } catch { /* No hay clima inyectado aún */ }

      // Especie desde el resumen del gemelo
      let especieGemelo = "Planta";
      try {
        const resumen = await gemelo.obtenerResumen();
        especieGemelo = resumen[1] || "Planta";
      } catch { /* ignorar */ }

      setUltimaPlanta({
        idPlanta:    idSemilla,
        idSemilla,
        especie:     especieGemelo,
        responsable: responsableTraslado,
        latitud,
        longitud,
        temperatura,
        humedad,
        altitud:     Number(altitudSolidity),
      });

      setResultTraslado({ ok: true, lines: [
        { label: "✅ Estado",       value: "Traslado registrado con éxito" },
        { label: "🌱 Semilla",      value: `#${idSemilla}` },
        { label: "📍 Latitud",      value: `${latitud.toFixed(6)}°` },
        { label: "📍 Longitud",     value: `${longitud.toFixed(6)}°` },
        { label: "⛰️ Altitud",     value: `${altitudSolidity} msnm` },
        { label: "👤 Responsable",  value: responsableTraslado },
        { label: "🔗 Gemelo",       value: `${gemeloDireccion.slice(0,10)}…` },
        { label: "📄 Tx",           value: `${tx.hash.slice(0,18)}…` },
      ]});
      setResultado(`✅ Traslado registrado con éxito en Gemelo #${idSemilla}.\nGemelo: ${gemeloDireccion.slice(0,10)}…\nHash: ${tx.hash}`);
      setIsPlantTransferModalOpen(true);

    } catch (error) {
      console.error("Error al registrar el traslado:", error);
      setResultTraslado({ ok: false, lines: [{ label: "❌ Error", value: (error as Error).message }] });
      setResultado(`❌ Error al registrar el traslado: ${(error as Error).message}`);
    }
  };

  // ─── Determinar qué formulario de semilla mostrar ──────────────────────
  const handleSubmitSemilla = tieneFactory
    ? adoptarSemillaFactory
    : registrarSemillaLegacy;

  return (
    <div className="space-y-4 md:space-y-6 pt-2 md:pt-0">

      {!walletConnected && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
          <p className="font-bold">Atención</p>
          <p>{t.walletNotConnected}</p>
        </div>
      )}

      {walletConnected && (
        <div className={`text-center text-xs font-semibold py-1 px-3 rounded-full inline-block ${
          tieneFactory
            ? "bg-purple-100 text-purple-700 border border-purple-300"
            : tieneOracle
              ? "bg-blue-100 text-blue-700 border border-blue-300"
              : "bg-gray-100 text-gray-700 border border-gray-300"
        }`}>
          {tieneFactory ? t.modoFactory : tieneOracle ? t.modoOracle : t.modoManual}
        </div>
      )}

      {/* ── FORMULARIO PRINCIPAL DE SEMILLA ──────────────────────────────── */}
<DarkSectionR 
  color="purple" 
  icon={<Sprout size={16} />} 
  title={tieneFactory ? t.registerSeed : t.registerSeedLegacy}
>        
  {/* 👇 ESTE DIV ENCAPSULA TODO EL FONDO DEGRADADO MORADO SIN DAR ERROR 👇 */}
  <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#2e1065]/65 border border-[#8b5cf6]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
    
    <form onSubmit={handleSubmitSemilla} className="space-y-3 md:space-y-4">

      {/* Precio de adopción visible si modo Factory */}
      {tieneFactory && precioAdopcionETH && (
        <div style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#c4b5fd", fontSize: "0.85rem", fontWeight: 500 }}>💰 Precio de adopción:</span>
          <span style={{ color: "#e9d5ff", fontWeight: 700 }}>{precioAdopcionETH} ETH</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="tipo">{t.seedType}</Label>
        <Select name="tipo" onValueChange={handleItemSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t.selectSeedType} />
          </SelectTrigger>
          <SelectContent>
            {SEED_TYPES.map((seed) => (
              <SelectItem key={seed} value={seed}>
                <div className="flex items-center">
                  <img src={`/imagenesSemillas/${seed}.png`} alt={seed} className="w-6 h-6 mr-2" />
                  {t.seedTypes[seed as keyof typeof t.seedTypes] || seed}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SeedSelectionModal
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        selectedItem={selectedItem}
      />

      <div className="space-y-2">
        <Label htmlFor="responsable">{t.responsible}</Label>
        <Select name="responsable" required onValueChange={setFormResponsable}>
          <SelectTrigger>
            <SelectValue placeholder={t.selectResponsible} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Juan Pérez">Juan Pérez</SelectItem>
            <SelectItem value="María Rodríguez">María Rodríguez</SelectItem>
            <SelectItem value="Carlos López">Carlos López</SelectItem>
            <SelectItem value="Otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div>
          <Label htmlFor="latitud">{t.latitude}</Label>
          <Input
            id="latitud" name="latitud" type="number" step="any"
            required value={formLatitud}
            onChange={(e) => setFormLatitud(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="longitud">{t.longitude}</Label>
          <Input
            id="longitud" name="longitud" type="number" step="any"
            required value={formLongitud}
            placeholder="Ej: -74.0721"
            onChange={(e) => setFormLongitud(e.target.value)}
          />
          {formLongitud && parseFloat(formLongitud) > 0 && parseFloat(formLongitud) < 180 && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ La longitud en Colombia es negativa. ¿Quisiste escribir -{formLongitud}?
            </p>
          )}
        </div>
      </div>

      {/* Info boxes contextuales */}
      {tieneFactory && (
        <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ color: "#c4b5fd", fontSize: "0.85rem", fontWeight: 500 }}>{t.infoFactory}</p>
        </div>
      )}
      {!tieneFactory && tieneOracle && (
        <div style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.18)", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ color: "#7dd3fc", fontSize: "0.85rem", fontWeight: 500 }}>{t.infoOracle}</p>
        </div>
      )}

      {/* Campos manuales solo en modo Ganache/local */}
      {!tieneOracle && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <Label htmlFor="temperatura">{t.temperature}</Label>
              <Input id="temperatura" name="temperatura" type="number" min="-10" max="15" step="1" required />
            </div>
            <div>
              <Label htmlFor="humedadRelativa">{t.relativeHumidity}</Label>
              <Input id="humedadRelativa" name="humedadRelativa" type="number" min="50" max="100" step="1" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div>
              <Label htmlFor="precipitacion">{t.precipitation}</Label>
              <Input id="precipitacion" name="precipitacion" type="number" required />
            </div>
            <div>
              <Label htmlFor="horasLuzSolar">{t.sunlightHours}</Label>
              <Input id="horasLuzSolar" name="horasLuzSolar" type="number" required />
            </div>
          </div>
        </>
      )}

      <div>
        <Label htmlFor="altitud">{t.altitude}</Label>
        <Input id="altitud" name="altitud" type="number" min="2800" max="4200" step="1" required />
      </div>
      <div>
        <Label htmlFor="comentariosDeCuidado">{t.careComments}</Label>
        <Textarea id="comentariosDeCuidado" name="comentariosDeCuidado" required />
      </div>

      <Button type="submit" className={`w-full text-sm md:text-base py-1 md:py-2 ${
        tieneFactory ? "bg-purple-600 hover:bg-purple-700 text-white" : ""
      }`}>
        {tieneFactory
          ? <><Sprout className="mr-2 h-4 w-4" /> {t.adoptButton}</>
          : <><Send     className="mr-2 h-4 w-4" /> {t.registerSeedButton}</>
        }
      </Button>

      {resultAdopcion && (
        <ResultCard
          result={{
            ok:           resultAdopcion.ok,
            title:        resultAdopcion.ok ? "Semilla adoptada con éxito" : "Error al adoptar semilla",
            description: resultAdopcion.ok ? "Gemelo Digital desplegado en Sepolia" : undefined,
            rows:        resultAdopcion.ok
              ? resultAdopcion.lines
                  .filter(l => !l.label.includes("✅"))
                  .map(l => ({
                    label: l.label.replace(/^[\p{Emoji}\uFE0F\u20E3\s]+/u, "").trim(),
                    value: l.value,
                    mono:  true,
                  }))
              : undefined,
            errorMessage: resultAdopcion.ok
              ? undefined
              : resultAdopcion.lines.find(l => l.label.includes("❌"))?.value,
            txHash: resultAdopcion.lines.find(l => l.label.includes("Tx"))?.value?.replace(/…$/, ""),
          }}
          variant="registro"
        />
      )}
    </form>

  </div>
</DarkSectionR>

{/* ──ESTE ES EL FORMULARIO DE TRASLADO DE PLANTAS  FORMULARIO DE TRASLADO ─────────────────────────── */}

      {/* ── FORMULARIO DE TRASLADO ─────────────────────────── */}
<DarkSectionR color="orange" icon={<Truck size={16} />} title={t.registerPlantTransfer}>
  
  {/* 👇 DIV CONTENEDOR CON EL DEGRADADO NARANJA OSCURO COMPATIBLE CON TYPESCRIPT 👇 */}
  <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#431407]/65 border border-[#fb923c]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
    
    <form onSubmit={registrarTrasladoPlanta} className="space-y-3 md:space-y-4">

      <div>
        <Label htmlFor="idSemilla">{t.seedId}</Label>
        <Input
          id="idSemilla" name="idSemilla"
          value={semillaId}
          onChange={(e) => setSemillaId(e.target.value)}
          type="number" required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div>
          <Label htmlFor="latitud">{t.latitude}</Label>
          <Input id="latitud" name="latitud" type="number" step="any" required /> 
        </div>
        <div>
          <Label htmlFor="longitud">{t.longitude}</Label>
          <Input id="longitud" name="longitud" type="number" step="any" required /> 
        </div>
      </div>

      <div>
        <Label htmlFor="responsableTraslado">{t.transferResponsible}</Label>
        <Select name="responsableTraslado" required onValueChange={setTrasResponsable}>
          <SelectTrigger>
            <SelectValue placeholder={t.selectTransferResponsible} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Juan Pérez">Juan Pérez</SelectItem>
            <SelectItem value="María Rodríguez">María Rodríguez</SelectItem>
            <SelectItem value="Carlos López">Carlos López</SelectItem>
            <SelectItem value="Otro">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="comentariosDeCuidado">{t.careComments}</Label>
        <Textarea id="comentariosDeCuidado" name="comentariosDeCuidado" required />
      </div>

      <Button type="submit" className="w-full text-sm md:text-base py-1 md:py-2 bg-orange-600 hover:bg-orange-700 text-white">
        <Truck className="mr-2 h-4 w-4" /> {t.registerTransferButton}
      </Button>

      {resultTraslado && (
        <ResultCard
          result={{
            ok:           resultTraslado.ok,
            title:        resultTraslado.ok ? "Traslado registrado con éxito" : "Error al registrar traslado",
            description: resultTraslado.ok ? "Posición del Gemelo Digital actualizada" : undefined,
            rows:        resultTraslado.ok
              ? resultTraslado.lines
                  .filter(l => !l.label.includes("✅"))
                  .map(l => ({
                    label: l.label.replace(/^[\p{Emoji}\uFE0F\u20E3\s]+/u, "").trim(),
                    value: l.value,
                    mono:  true,
                  }))
              : undefined,
            errorMessage: resultTraslado.ok
              ? undefined
              : resultTraslado.lines.find(l => l.label.includes("❌"))?.value,
            txHash: resultTraslado.lines.find(l => l.label.includes("Tx"))?.value?.replace(/…$/, ""),
          }}
          variant="traslado"
        />
      )}
    </form>

  </div>
</DarkSectionR>

{/* ── Modal traslado ── */}
<PlantTransferModal
  isOpen={isPlantTransferModalOpen}
  onOpenChange={setIsPlantTransferModalOpen}
  seedId={semillaId}
  capturedImage={null}
  idPlanta={ultimaPlanta?.idPlanta      ?? 0}
  idSemilla={ultimaPlanta?.idSemilla    ?? 0}
  especie={ultimaPlanta?.especie        ?? formTipo ?? "Planta"}
  responsable={ultimaPlanta?.responsable ?? trasResponsable}
  latitud={ultimaPlanta?.latitud         ?? 0}
  longitud={ultimaPlanta?.longitud        ?? 0}
  temperatura={ultimaPlanta?.temperatura  ?? 0}
  humedad={ultimaPlanta?.humedad          ?? 0}
  altitud={ultimaPlanta?.altitud          ?? 3200}
  signer={signer}
  chainId={chainId}
  nftAddress={nftAddress}
  contratoIndividual={ultimaPlanta?.contratoIndividual ?? ""}
/>

{/* ── Modal adopción — completamente independiente ── */}
<SeedAdoptionModal
  isOpen={isSeedAdoptionModalOpen}
  onOpenChange={setIsSeedAdoptionModalOpen}
  semillaIdFactory={ultimaAdopcion?.semillaIdFactory ?? 0}
  semillaId={ultimaAdopcion?.semillaId               ?? null}
  especie={ultimaAdopcion?.especie                   ?? formTipo ?? "Planta"}
  responsable={ultimaAdopcion?.responsable           ?? ""}
  latitud={ultimaAdopcion?.latitud                   ?? 0}
  longitud={ultimaAdopcion?.longitud                 ?? 0}
  temperatura={ultimaAdopcion?.temperatura           ?? 0}
  humedad={ultimaAdopcion?.humedad                   ?? 0}
  altitud={ultimaAdopcion?.altitud                   ?? 3200}
  contratoIndividual={ultimaAdopcion?.contratoIndividual ?? ""}
  ciudad={ultimaAdopcion?.ciudad                     ?? ""}
  precipitacion={ultimaAdopcion?.precipitacion       ?? 0}
  horasLuz={ultimaAdopcion?.horasLuz                 ?? 0}
  comentarios={ultimaAdopcion?.comentarios           ?? ""}
  txHash={ultimaAdopcion?.txHash                     ?? ""}
  signer={signer}
  chainId={chainId}
  nftAddress={nftAddress}
/>
</div>
);
};

export default Registro;