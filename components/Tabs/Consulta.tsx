


// components/Tabs/Consulta.tsx
// ============================================================
//  Pestaña de Consulta — v2.0.0 (Factory Pattern)
//
//  Novedades respecto a v1:
//  ─────────────────────────────────────────────────────────
//  • Motor de búsqueda dinámico por ID:
//      1. Consulta la Factory para obtener la dirección del gemelo
//      2. Instancia ethers.Contract apuntando al SemillaIndividual
//      3. Extrae historial climático, fases y Cuadro de Honor en vivo
//  • Formatos corregidos:
//      - Coordenadas ÷ 1,000,000 antes de mostrar
//      - Temperatura ÷ 10 antes de mostrar
//  • Botón "Apoyar esta semilla" → donarParaMantenimiento()
//  • Preserva 100% la consulta legacy de Vivero para Ganache
// ============================================================

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, History, List, Filter,
  CloudRain, Sun, Thermometer, Droplets, Clock,
  Heart, Trophy, MapPin, Sprout, Leaf
} from 'lucide-react';
import { ViveroInterface } from '../EcoChainComponent';
import { ethers } from 'ethers';

// ─── ABI mínimo de la Factory ─────────────────────────────────────────────
const FACTORY_ABI = [
  "function buscarContratoPorId(uint256) external view returns (address)",
  "function totalSemillasAdoptadas() external view returns (uint256)"
];

// ─── ABI del SemillaIndividual para lecturas ──────────────────────────────
const SEMILLA_INDIVIDUAL_ABI = [
  "function obtenerResumen() external view returns (uint256,string,string,int256,int256,uint256,uint256,uint256,uint256,uint256)",
  "function obtenerHistorialClimatico() external view returns (tuple(int256 temperatura, uint256 humedadRelativa, uint256 precipitacion, uint256 horasLuzSolar, uint256 timestamp)[])",
  "function obtenerHistorialTraslados() external view returns (tuple(int256 latitud, int256 longitud, uint256 altitud, string responsable, string comentarios, uint256 timestamp)[])",
  "function obtenerFasesCrecimiento() external view returns (tuple(string estado, string observaciones, uint256 timestamp)[])",
  "function obtenerUltimoClima() external view returns (tuple(int256 temperatura, uint256 humedadRelativa, uint256 precipitacion, uint256 horasLuzSolar, uint256 timestamp))",
  "function obtenerLeaderboard() external view returns (address[] billeteras, uint256[] montos, uint256[] numeroDonaciones)",
  "function donarParaMantenimiento() external payable",
  "function totalDonacionesRecibidas() external view returns (uint256)",
  "function climaEsReciente() external view returns (bool)"
];

interface ConsultaProps {
  contract:     ViveroInterface | null;
  setResultado: React.Dispatch<React.SetStateAction<string>>;
  language:     'es' | 'en' | 'fr' | 'de';
  // Signer necesario para el botón de donación
  signer?:      ethers.Signer | null;
  chainId?:     number;
}

// Tipo para un donante en el leaderboard
interface Donante {
  billetera: string;
  monto:     string; // en ETH formateado
  posicion:  number;
}

// Tipo para el resumen del gemelo
interface ResumenGemelo {
  id:             number;
  especie:        string;
  responsable:    string;
  latitud:        string;  // ya dividido × 1M
  longitud:       string;  // ya dividido × 1M
  altitud:        number;
  totalReportes:  number;
  totalTraslados: number;
  totalDonaciones: string; // en ETH
  fechaAdopcion:  string;
  contratoDir:    string;
}


// ── DarkSection ───────────────────────────────────────────────
const DS_TOKENS_C: Record<string, { accent: string; border: string; bg: string; titleColor: string }> = {
  purple: { accent: "#a78bfa", border: "rgba(139,92,246,0.22)", bg: "rgba(139,92,246,0.07)", titleColor: "#c4b5fd" },
  green:  { accent: "#4ade80", border: "rgba(74,222,128,0.22)", bg: "rgba(74,222,128,0.07)", titleColor: "#86efac" },
  orange: { accent: "#fb923c", border: "rgba(249,115,22,0.22)", bg: "rgba(249,115,22,0.07)", titleColor: "#fdba74" },
  teal:   { accent: "#2dd4bf", border: "rgba(45,212,191,0.22)", bg: "rgba(45,212,191,0.07)", titleColor: "#5eead4" },
  yellow: { accent: "#fbbf24", border: "rgba(251,191,36,0.22)", bg: "rgba(251,191,36,0.07)", titleColor: "#fde68a" },
  blue:   { accent: "#60a5fa", border: "rgba(96,165,250,0.22)", bg: "rgba(96,165,250,0.07)", titleColor: "#93c5fd" },
};
const DarkSectionC: React.FC<{
  color: keyof typeof DS_TOKENS_C;
  icon: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
  noPad?: boolean;
}> = ({ color, icon, title, children, noPad }) => {
  const tk = DS_TOKENS_C[color] ?? DS_TOKENS_C.blue;
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
      <div style={noPad ? undefined : { padding: "14px" }}>{children}</div>
    </div>
  );
};


const Consulta: React.FC<ConsultaProps> = ({
  contract,
  setResultado,
  language,
  signer,
  chainId = 11155111
}) => {
  const [semillaId,         setSemillaId]         = useState('');
  const [plantaId,          setPlantaId]           = useState('');
  const [responsableFilter, setResponsableFilter]  = useState('');
  const [semillasFiltradas, setSemillasFiltradas]  = useState<number[]>([]);

  // Estado para la telemetría legacy (Vivero)
  const [telemetria, setTelemetria] = useState<any>(null);

  // Estado para el Gemelo Digital (SemillaIndividual)
  const [resumenGemelo,     setResumenGemelo]     = useState<ResumenGemelo | null>(null);
  const [historialClima,    setHistorialClima]     = useState<any[]>([]);
  const [historialTraslados, setHistorialTraslados] = useState<any[]>([]);
  const [fasesCrecimiento,  setFasesCrecimiento]  = useState<any[]>([]);
  const [leaderboard,       setLeaderboard]        = useState<Donante[]>([]);
  const [ultimoClima,       setUltimoClima]        = useState<any>(null);
  const [cargandoGemelo,    setCargandoGemelo]     = useState(false);
  const [gemeloDireccion,   setGemeloDireccion]    = useState<string>('');

  // Estado donación
  const [montoDonacion,     setMontoDonacion]     = useState('0.001');
  const [donando,           setDonando]            = useState(false);
  const [msgDonacion,       setMsgDonacion]        = useState('');

  // Resultados inline para cards legacy
  const [resultHistorial,  setResultHistorial]  = useState<{ ok: boolean; lines: string[] } | null>(null);
  const [resultTodasSem,   setResultTodasSem]   = useState<{ ok: boolean; items: { id: number; especie: string; responsable: string; lat: string; lon: string; altitud: number; traslados: number; dir: string }[] } | null>(null);
  const [resultBusqueda,   setResultBusqueda]   = useState<{ ok: boolean; items: { id: number; especie: string; lat: string; lon: string; altitud: number; traslados: number }[]; filtro: string } | null>(null);
  const [cargandoTodasSem, setCargandoTodasSem] = useState(false);
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);

  const translations = {
    es: {
      gemeloBuscar: "Buscar Gemelo Digital por ID",
      gemeloBtn: "🔍 Buscar en Factory",
      gemeloTitulo: "Gemelo Digital — Semilla #",
      gemeloEspecie: "Especie",
      gemeloResponsable: "Responsable",
      gemeloUbicacion: "Ubicación inicial",
      gemeloAltitud: "Altitud",
      gemeloAdopcion: "Fecha de adopción",
      gemeloReportes: "Reportes climáticos",
      gemeloTraslados: "Traslados registrados",
      gemelo0Donaciones: "Total donado a esta semilla",
      climaTitle: "Último Clima Inyectado (Oráculo)",
      histClimaTitle: "Historial Climático Completo",
      histTrasladosTitle: "Historial de Traslados",
      fasesTitle: "Fases de Crecimiento",
      leaderTitle: "🏆 Cuadro de Honor — Padrinos Oficiales",
      donarTitle: "💚 Apoyar el mantenimiento de esta semilla",
      donarMonto: "Monto a donar (ETH)",
      donarBtn: "Donar a esta semilla",
      donarInfo: "97% va directo a la ONG · 3% tasa de plataforma",
      contratoDir: "Contrato individual",
      noGemelo: "Esta semilla no existe en la Factory o aún no fue adoptada.",
      // Legacy
      seedQuery: "Consultar Semilla (Legacy - Vivero)",
      seedId: "ID de la Semilla",
      queryButton: "Consultar Semilla",
      growthHistory: "Consultar Historial de Crecimiento",
      plantId: "ID de la Planta",
      historyButton: "Consultar Historial",
      allSeeds: "Obtener Todas las Semillas",
      allSeedsButton: "Obtener Todas las Semillas",
      searchByResponsible: "Buscar Semillas por Responsable",
      responsible: "Responsable",
      searchButton: "Buscar Semillas",
      errorGettingSeed: "Error al obtener la semilla:",
      errorGettingHistory: "Error al obtener el historial de crecimiento:",
      errorGettingAllSeeds: "Error al obtener todas las semillas:",
      errorSearchingSeeds: "Error al buscar semillas por responsable:",
      seedsFound: "Semillas encontradas:",
      oracleTitle: "Telemetría Satelital Real (Oráculo CRE)",
      temp: "Temp", humidity: "Humedad", rain: "Lluvia", solar: "Luz Solar", sync: "Sincronizado"
    },
    en: {
      gemeloBuscar: "Search Digital Twin by ID",
      gemeloBtn: "🔍 Search in Factory",
      gemeloTitulo: "Digital Twin — Seed #",
      gemeloEspecie: "Species",
      gemeloResponsable: "Responsible",
      gemeloUbicacion: "Initial Location",
      gemeloAltitud: "Altitude",
      gemeloAdopcion: "Adoption date",
      gemeloReportes: "Climate reports",
      gemeloTraslados: "Registered transfers",
      gemelo0Donaciones: "Total donated to this seed",
      climaTitle: "Latest Climate Report (Oracle)",
      histClimaTitle: "Full Climate History",
      histTrasladosTitle: "Transfer History",
      fasesTitle: "Growth Phases",
      leaderTitle: "🏆 Honor Board — Official Sponsors",
      donarTitle: "💚 Support maintenance of this seed",
      donarMonto: "Amount to donate (ETH)",
      donarBtn: "Donate to this seed",
      donarInfo: "97% goes directly to the NGO · 3% platform fee",
      contratoDir: "Individual contract",
      noGemelo: "This seed does not exist in the Factory or has not been adopted yet.",
      seedQuery: "Query Seed (Legacy - Vivero)",
      seedId: "Seed ID",
      queryButton: "Query Seed",
      growthHistory: "Query Growth History",
      plantId: "Plant ID",
      historyButton: "Query History",
      allSeeds: "Get All Seeds",
      allSeedsButton: "Get All Seeds",
      searchByResponsible: "Search Seeds by Responsible",
      responsible: "Responsible",
      searchButton: "Search Seeds",
      errorGettingSeed: "Error getting the seed:",
      errorGettingHistory: "Error getting growth history:",
      errorGettingAllSeeds: "Error getting all seeds:",
      errorSearchingSeeds: "Error searching seeds by responsible:",
      seedsFound: "Seeds found:",
      oracleTitle: "Real Satellite Telemetry (CRE Oracle)",
      temp: "Temp", humidity: "Humidity", rain: "Rain", solar: "Sunlight", sync: "Synchronized"
    },
    fr: {
      gemeloBuscar: "Rechercher le Jumeau Numérique par ID",
      gemeloBtn: "🔍 Rechercher dans la Factory",
      gemeloTitulo: "Jumeau Numérique — Graine #",
      gemeloEspecie: "Espèce",
      gemeloResponsable: "Responsable",
      gemeloUbicacion: "Localisation initiale",
      gemeloAltitud: "Altitude",
      gemeloAdopcion: "Date d'adoption",
      gemeloReportes: "Rapports climatiques",
      gemeloTraslados: "Transferts enregistrés",
      gemelo0Donaciones: "Total donné à cette graine",
      climaTitle: "Dernier Rapport Climatique (Oracle)",
      histClimaTitle: "Historique Climatique Complet",
      histTrasladosTitle: "Historique des Transferts",
      fasesTitle: "Phases de Croissance",
      leaderTitle: "🏆 Tableau d'Honneur — Parrains Officiels",
      donarTitle: "💚 Soutenir la maintenance de cette graine",
      donarMonto: "Montant à donner (ETH)",
      donarBtn: "Donner à cette graine",
      donarInfo: "97% va directement à l'ONG · 3% frais de plateforme",
      contratoDir: "Contrat individuel",
      noGemelo: "Cette graine n'existe pas dans la Factory ou n'a pas encore été adoptée.",
      seedQuery: "Consulter une Graine (Legacy)",
      seedId: "ID de la Graine",
      queryButton: "Consulter la Graine",
      growthHistory: "Consulter l'Historique de Croissance",
      plantId: "ID de la Plante",
      historyButton: "Consulter l'Historique",
      allSeeds: "Obtenir Toutes les Graines",
      allSeedsButton: "Obtenir Toutes les Graines",
      searchByResponsible: "Rechercher des Graines par Responsable",
      responsible: "Responsable",
      searchButton: "Rechercher des Graines",
      errorGettingSeed: "Erreur lors de l'obtention de la graine :",
      errorGettingHistory: "Erreur lors de l'obtention de l'historique :",
      errorGettingAllSeeds: "Erreur lors de l'obtention de toutes les graines :",
      errorSearchingSeeds: "Erreur lors de la recherche de graines :",
      seedsFound: "Graines trouvées :",
      oracleTitle: "Télémétrie Satellitaire Réelle (Oracle CRE)",
      temp: "Temp", humidity: "Humidité", rain: "Pluie", solar: "Lumière", sync: "Synchronisé"
    },
    de: {
      gemeloBuscar: "Digitalen Zwilling nach ID suchen",
      gemeloBtn: "🔍 In Factory suchen",
      gemeloTitulo: "Digitaler Zwilling — Samen #",
      gemeloEspecie: "Art",
      gemeloResponsable: "Verantwortlicher",
      gemeloUbicacion: "Anfangsstandort",
      gemeloAltitud: "Höhe",
      gemeloAdopcion: "Adoptionsdatum",
      gemeloReportes: "Klimaberichte",
      gemeloTraslados: "Registrierte Transfers",
      gemelo0Donaciones: "Gesamt gespendet für diesen Samen",
      climaTitle: "Letzter Klimabericht (Orakel)",
      histClimaTitle: "Vollständige Klimahistorie",
      histTrasladosTitle: "Transfer-Historie",
      fasesTitle: "Wachstumsphasen",
      leaderTitle: "🏆 Ehrentafel — Offizielle Paten",
      donarTitle: "💚 Wartung dieses Samens unterstützen",
      donarMonto: "Spendenbetrag (ETH)",
      donarBtn: "Für diesen Samen spenden",
      donarInfo: "97% gehen direkt an die NGO · 3% Plattformgebühr",
      contratoDir: "Einzelvertrag",
      noGemelo: "Dieser Samen existiert nicht in der Factory oder wurde noch nicht adoptiert.",
      seedQuery: "Samen abfragen (Legacy)",
      seedId: "Samen-ID",
      queryButton: "Samen abfragen",
      growthHistory: "Wachstumsverlauf abfragen",
      plantId: "Pflanzen-ID",
      historyButton: "Verlauf abfragen",
      allSeeds: "Alle Samen abrufen",
      allSeedsButton: "Alle Samen abrufen",
      searchByResponsible: "Samen nach Verantwortlichem suchen",
      responsible: "Verantwortlicher",
      searchButton: "Samen suchen",
      errorGettingSeed: "Fehler beim Abrufen des Samens:",
      errorGettingHistory: "Fehler beim Abrufen des Verlaufs:",
      errorGettingAllSeeds: "Fehler beim Abrufen aller Samen:",
      errorSearchingSeeds: "Fehler bei der Suche nach Samen:",
      seedsFound: "Gefundene Samen:",
      oracleTitle: "Echte Satellitentelemetrie (CRE Orakel)",
      temp: "Temp", humidity: "Feuchtigkeit", rain: "Regen", solar: "Sonnenlicht", sync: "Synchronisiert"
    }
  };

  const t = translations[language];

  const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA;
  const tieneFactory   = Boolean(factoryAddress);

  const formatTimestamp = (ts: number) => new Date(ts * 1000).toLocaleString();

  const bigIntToString = (obj: any): any => {
    if (typeof obj === 'bigint')            return obj.toString();
    if (Array.isArray(obj))                return obj.map(bigIntToString);
    if (typeof obj === 'object' && obj !== null)
      return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, bigIntToString(v)]));
    return obj;
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  BUSCAR GEMELO DIGITAL (Factory v2)
  // ─────────────────────────────────────────────────────────────────────────
  const buscarGemeloDigital = async () => {
    if (!semillaId || !signer) return;

    setCargandoGemelo(true);
    setResumenGemelo(null);
    setLeaderboard([]);
    setHistorialClima([]);
    setHistorialTraslados([]);
    setFasesCrecimiento([]);
    setUltimoClima(null);
    setMsgDonacion('');
    setTelemetria(null);

    try {
      // 1. Obtener dirección del gemelo desde la Factory
      const factory = new ethers.Contract(factoryAddress!, FACTORY_ABI, signer);
      const dir     = await factory.buscarContratoPorId(parseInt(semillaId));

      if (!dir || dir === ethers.ZeroAddress) {
        setResultado(`❌ ${t.noGemelo}`);
        setCargandoGemelo(false);
        return;
      }

      setGemeloDireccion(dir);

      // 2. Instanciar el SemillaIndividual dinámicamente
      const gemelo = new ethers.Contract(dir, SEMILLA_INDIVIDUAL_ABI, signer);

      // 3. Leer resumen, clima, traslados, fases y leaderboard en paralelo
      const [resumenRaw, climaRaw, trasladosRaw, fasesRaw, leaderRaw, ultimoClimaRaw] =
        await Promise.all([
          gemelo.obtenerResumen(),
          gemelo.obtenerHistorialClimatico(),
          gemelo.obtenerHistorialTraslados(),
          gemelo.obtenerFasesCrecimiento(),
          gemelo.obtenerLeaderboard(),
          gemelo.obtenerUltimoClima()
        ]);

      // 4. Formatear resumen (coordenadas ÷ 1M, temperatura ÷ 10)
      const resumen: ResumenGemelo = {
        id:              Number(resumenRaw[0]),
        especie:         resumenRaw[1],
        responsable:     resumenRaw[2],
        latitud:         (Number(resumenRaw[3]) / 1_000_000).toFixed(6),
        longitud:        (Number(resumenRaw[4]) / 1_000_000).toFixed(6),
        altitud:         Number(resumenRaw[5]),
        totalReportes:   Number(resumenRaw[6]),
        totalTraslados:  Number(resumenRaw[7]),
        totalDonaciones: ethers.formatEther(resumenRaw[8]),
        fechaAdopcion:   formatTimestamp(Number(resumenRaw[9])),
        contratoDir:     dir
      };
      setResumenGemelo(resumen);

      // 5. Formatear historial climático (temp ÷ 10, precip ÷ 10)
      const climaFormateado = climaRaw.map((r: any) => ({
        temperatura:     (Number(r.temperatura) / 10).toFixed(1),
        humedadRelativa: Number(r.humedadRelativa),
        precipitacion:   (Number(r.precipitacion) / 10).toFixed(1),
        horasLuzSolar:   Number(r.horasLuzSolar),
        fecha:           formatTimestamp(Number(r.timestamp))
      }));
      setHistorialClima(climaFormateado);

      // 6. Formatear último clima
      if (Number(ultimoClimaRaw.timestamp) > 0) {
        setUltimoClima({
          temperatura:     (Number(ultimoClimaRaw.temperatura) / 10).toFixed(1),
          humedadRelativa: Number(ultimoClimaRaw.humedadRelativa),
          precipitacion:   (Number(ultimoClimaRaw.precipitacion) / 10).toFixed(1),
          horasLuzSolar:   Number(ultimoClimaRaw.horasLuzSolar),
          fecha:           formatTimestamp(Number(ultimoClimaRaw.timestamp))
        });
      }

      // 7. Formatear traslados (coordenadas ÷ 1M)
      const trasladosFormateados = trasladosRaw.map((tr: any) => ({
        latitud:     (Number(tr.latitud)  / 1_000_000).toFixed(6),
        longitud:    (Number(tr.longitud) / 1_000_000).toFixed(6),
        altitud:     Number(tr.altitud),
        responsable: tr.responsable,
        comentarios: tr.comentarios,
        fecha:       formatTimestamp(Number(tr.timestamp))
      }));
      setHistorialTraslados(trasladosFormateados);

      // 8. Fases de crecimiento
      const fasesFormateadas = fasesRaw.map((f: any) => ({
        estado:        f.estado,
        observaciones: f.observaciones,
        fecha:         formatTimestamp(Number(f.timestamp))
      }));
      setFasesCrecimiento(fasesFormateadas);

      // 9. Leaderboard — ordenar por monto descendente
      const { billeteras, montos } = leaderRaw;
      const donantesArr: Donante[] = billeteras
        .map((b: string, i: number) => ({
          billetera: b,
          monto:     ethers.formatEther(montos[i]),
          posicion:  i + 1
        }))
        .sort((a: Donante, b: Donante) => parseFloat(b.monto) - parseFloat(a.monto))
        .map((d: Donante, i: number) => ({ ...d, posicion: i + 1 }));
      setLeaderboard(donantesArr);

      // Construir resultado detallado para el panel inferior
      const climaLinea = Number(ultimoClimaRaw.timestamp) > 0
        ? `Temp: ${(Number(ultimoClimaRaw.temperatura) / 10).toFixed(1)}°C | ` +
          `Humedad: ${Number(ultimoClimaRaw.humedadRelativa)}% | ` +
          `Precipitación: ${(Number(ultimoClimaRaw.precipitacion) / 10).toFixed(1)}mm | ` +
          `Luz: ${Number(ultimoClimaRaw.horasLuzSolar)}h`
        : 'Sin datos climáticos aún';

      setResultado(
        `ID: ${resumen.id}\n` +
        `Tipo: ${resumen.especie}\n` +
        `Ubicación: (${resumen.latitud}, ${resumen.longitud})\n` +
        `Responsable: ${resumen.responsable}\n` +
        `Altitud: ${resumen.altitud}m\n` +
        `Clima: ${climaLinea}\n` +
        `Reportes: ${resumen.totalReportes}\n` +
        `Traslados: ${resumen.totalTraslados}\n` +
        `Donaciones: ${resumen.totalDonaciones} ETH\n` +
        `Adoptado: ${resumen.fechaAdopcion}\n` +
        `Contrato: ${dir}`
      );

    } catch (error) {
      console.error("Error al buscar gemelo digital:", error);
      setResultado(`❌ Error al consultar el gemelo digital: ${(error as Error).message}`);
    } finally {
      setCargandoGemelo(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  DONACIÓN A LA SEMILLA
  // ─────────────────────────────────────────────────────────────────────────
  const donarParaMantenimiento = async () => {
    if (!signer || !gemeloDireccion) return;
    setDonando(true);
    setMsgDonacion('');

    try {
      const gemelo = new ethers.Contract(gemeloDireccion, SEMILLA_INDIVIDUAL_ABI, signer);
      const monto  = ethers.parseEther(montoDonacion || "0.001");

      setMsgDonacion("⏳ Enviando donación...");
      const tx = await gemelo.donarParaMantenimiento({ value: monto });
      await tx.wait();

      setMsgDonacion(`✅ ¡Gracias por tu apoyo! ${montoDonacion} ETH donados.\n97% → ONG | 3% → Plataforma`);

      // Refrescar leaderboard
      const [leaderRaw, resumenRaw] = await Promise.all([
        gemelo.obtenerLeaderboard(),
        gemelo.obtenerResumen()
      ]);

      const { billeteras, montos } = leaderRaw;
      const donantesArr: Donante[] = billeteras
        .map((b: string, i: number) => ({
          billetera: b,
          monto:     ethers.formatEther(montos[i]),
          posicion:  i + 1
        }))
        .sort((a: Donante, b: Donante) => parseFloat(b.monto) - parseFloat(a.monto))
        .map((d: Donante, i: number) => ({ ...d, posicion: i + 1 }));
      setLeaderboard(donantesArr);

      if (resumenGemelo) {
        setResumenGemelo({
          ...resumenGemelo,
          totalDonaciones: ethers.formatEther(resumenRaw[8])
        });
      }

    } catch (error) {
      console.error("Error al donar:", error);
      setMsgDonacion(`❌ Error: ${(error as Error).message}`);
    } finally {
      setDonando(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  //  CONSULTAS LEGACY (Vivero) — intactas respecto a v1
  // ─────────────────────────────────────────────────────────────────────────
  const obtenerSemillaLegacy = async () => {
    if (!contract || !semillaId) return;
    setTelemetria(null);
    setResumenGemelo(null);

    try {
      const semillaIdParsed = parseInt(semillaId);
      const semilla = await contract.obtenerSemilla(semillaIdParsed) as any;

      let resultado = "";
      if (chainId === 11155111) {
        const lat = (Number(semilla.ubicacionInicial?.latitud  ?? 0) / 1_000_000).toFixed(6);
        const lon = (Number(semilla.ubicacionInicial?.longitud ?? 0) / 1_000_000).toFixed(6);
        resultado =
          `ID: ${semilla.id}\nTipo: ${semilla.tipo ?? "—"}\nUbicación: (${lat}, ${lon})\n` +
          `Responsable: ${semilla.responsable}\n` +
          `Temp: ${(Number(semilla.condicionesClimaticas?.temperatura ?? 0) / 10).toFixed(1)}°C | ` +
          `Humedad: ${semilla.condicionesClimaticas?.humedadRelativa ?? "—"}% | ` +
          `Precipitación: ${semilla.condicionesClimaticas?.precipitacion ?? "—"}mm | ` +
          `Luz: ${semilla.condicionesClimaticas?.horasLuzSolar ?? "—"}h | ` +
          `Altitud: ${semilla.ubicacionInicial?.altitud ?? "—"}m\n` +
          `Comentarios: ${semilla.comentariosDeCuidado ?? "—"}\n` +
          `Registrado: ${formatTimestamp(Number(semilla.fechaRegistro?.timestamp ?? 0))}`;
      } else {
        const lat = (Number(semilla.latitudInicial  ?? 0) / 1_000_000).toFixed(6);
        const lon = (Number(semilla.longitudInicial ?? 0) / 1_000_000).toFixed(6);
        resultado =
          `ID: ${semilla.id}\nEspecie: ${semilla.especie ?? "—"}\nUbicación: (${lat}, ${lon})\n` +
          `Altitud: ${semilla.altitud ?? "—"}m\n` +
          `Responsable: ${semilla.responsable}\n` +
          `Adoptante: ${semilla.adoptante ?? "—"}\n` +
          `Gemelo Digital: ${semilla.contratoGemelo ?? "—"}\n` +
          `Comentarios: ${semilla.comentariosIniciales ?? "—"}\n` +
          `Adoptado: ${formatTimestamp(Number(semilla.fechaAdopcion ?? 0))}`;
      }
      setResultado(resultado);

      if ((contract as any).obtenerClimaRealSemilla) {
        try {
          const climaData = await (contract as any).obtenerClimaRealSemilla(semillaIdParsed);
          if (Number(climaData[4]) > 0) {
            setTelemetria({
              temperatura:  (Number(climaData[0]) / 10).toFixed(1),
              humedad:      Number(climaData[1]).toString(),
              precipitacion: (Number(climaData[2]) / 10).toFixed(1),
              horasLuz:     Number(climaData[3]).toString(),
              fecha:        new Date(Number(climaData[4]) * 1000).toLocaleString()
            });
          }
        } catch (e) {
          console.log("Semilla sin telemetría CRE inyectada aún.");
        }
      }
    } catch (error) {
      setResultado(`${t.errorGettingSeed} ${(error as Error).message}`);
    }
  };

  const obtenerHistorialCrecimiento = async () => {
    if (!plantaId) return;

    try {
      let fases: any[] = [];

      if (tieneFactory && signer) {
        try {
          const factory = new ethers.Contract(factoryAddress!, FACTORY_ABI, signer);
          const dir = await factory.buscarContratoPorId(parseInt(plantaId));
          if (dir && dir !== ethers.ZeroAddress) {
            const gemelo = new ethers.Contract(dir, SEMILLA_INDIVIDUAL_ABI, signer);
            fases = await gemelo.obtenerFasesCrecimiento();
          }
        } catch {
        }
      }

      if (fases.length === 0 && contract) {
        fases = await (contract as any).obtenerFasesCrecimiento(parseInt(plantaId));
      }

      if (!fases || fases.length === 0) {
        setResultHistorial({ ok: false, lines: [`ℹ️ Semilla #${plantaId} no tiene fases de crecimiento registradas aún.`] });
        setResultado(`ℹ️ Semilla #${plantaId} no tiene fases de crecimiento registradas aún.`);
        return;
      }

      const lineas = fases.map((f: any, i: number) => {
        const fecha = f.timestamp && Number(f.timestamp) > 0
          ? formatTimestamp(Number(f.timestamp))
          : "—";
        return `${i + 1}. ${f.estado}  |  ${fecha}${f.observaciones ? `  📝 ${f.observaciones}` : ""}`;
      });

      setResultHistorial({ ok: true, lines: lineas });
      setResultado(
        `━━━━━━━ Historial de Crecimiento — Semilla #${plantaId} ━━━━━━━\n` +
        lineas.join("\n") +
        `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Total fases: ${fases.length}`
      );
    } catch (error) {
      setResultHistorial({ ok: false, lines: [`❌ ${t.errorGettingHistory} ${(error as Error).message}`] });
      setResultado(`${t.errorGettingHistory} ${(error as Error).message}`);
    }
  };

  const obtenerTodasLasSemillas = async () => {
    if (!contract) return;
    setCargandoTodasSem(true);
    setResultTodasSem(null);
    try {
      if (factoryAddress && signer) {
        const factory  = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);
        const total    = Number(await factory.totalSemillasAdoptadas());

        if (total === 0) {
          setResultTodasSem({ ok: false, items: [] });
          setResultado(`ℹ️ La Factory no tiene semillas adoptadas aún.`);
          setCargandoTodasSem(false);
          return;
        }

        setResultado(`⏳ Cargando ${total} semilla(s) desde la Factory...`);

        const items: { id: number; especie: string; responsable: string; lat: string; lon: string; altitud: number; traslados: number; dir: string }[] = [];
        const lineas: string[] = [];
        const LOTE = 5;

        for (let inicio = 1; inicio <= total; inicio += LOTE) {
          const ids = Array.from(
            { length: Math.min(LOTE, total - inicio + 1) },
            (_, i) => inicio + i
          );
          const resultados = await Promise.allSettled(
            ids.map(async (id) => {
              const dir = await factory.buscarContratoPorId(id);
              if (!dir || dir === ethers.ZeroAddress) return null;
              const gemelo = new ethers.Contract(dir, SEMILLA_INDIVIDUAL_ABI, signer);
              const r      = await gemelo.obtenerResumen();
              return {
                id,
                especie:     r[1] as string,
                responsable: r[2] as string,
                lat:         (Number(r[3]) / 1_000_000).toFixed(5),
                lon:         (Number(r[4]) / 1_000_000).toFixed(5),
                altitud:     Number(r[5]),
                traslados:   Number(r[7]),
                dir,
              };
            })
          );
          for (const res of resultados) {
            if (res.status === "fulfilled" && res.value) {
              const s = res.value;
              items.push(s);
              lineas.push(
                `#${s.id} — ${s.especie}\n` +
                `   👤 ${s.responsable}  📍 (${s.lat}, ${s.lon})  ⛰️ ${s.altitud}m  🚚 ${s.traslados} traslado(s)\n` +
                `   📄 ${s.dir}`
              );
            }
          }
        }

        setResultTodasSem({ ok: true, items });
        setResultado(
          `━━━━━━━━━ Semillas en Factory (${lineas.length}/${total}) ━━━━━━━━━\n\n` +
          lineas.join("\n\n")
        );
        setCargandoTodasSem(false);
        return;
      }

      const semillas = await contract.obtenerTodasLasSemillas();

      if (!semillas || semillas.length === 0) {
        setResultTodasSem({ ok: false, items: [] });
        setResultado(`ℹ️ El contrato colección no tiene semillas registradas.`);
        setCargandoTodasSem(false);
        return;
      }

      const items = semillas.map((s: any) => {
        const lat = (Number(s.latitudInicial ?? 0) / 1_000_000).toFixed(5);
        const lon = (Number(s.longitudInicial ?? 0) / 1_000_000).toFixed(5);
        return { id: Number(s.id), especie: s.especie ?? s.tipo ?? "—", responsable: s.responsable, lat, lon, altitud: Number(s.altitud ?? 0), traslados: 0, dir: "" };
      });
      const lineas = items.map((s: typeof items[0]) =>
        `#${s.id} — ${s.especie}\n   👤 ${s.responsable}  📍 (${s.lat}, ${s.lon})  ⛰️ ${s.altitud}m`
      );

      setResultTodasSem({ ok: true, items });
      setResultado(
        `━━━━━━━━━━━━━ Todas las Semillas (${semillas.length}) ━━━━━━━━━━━━━\n` +
        lineas.join("\n\n")
      );
    } catch (error) {
      setResultTodasSem({ ok: false, items: [] });
      setResultado(`${t.errorGettingAllSeeds} ${(error as Error).message}`);
    } finally { setCargandoTodasSem(false); }
  };

  const buscarSemillasPorResponsable = async () => {
    if (!contract || !responsableFilter) return;
    setCargandoBusqueda(true);
    setResultBusqueda(null);
    try {
      if (factoryAddress && signer) {
        const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);
        const total   = Number(await factory.totalSemillasAdoptadas());

        if (total === 0) {
          setResultBusqueda({ ok: false, items: [], filtro: responsableFilter });          setResultado(`ℹ️ La Factory no tiene semillas adoptadas aún.`);
          setSemillasFiltradas([]);
          setCargandoBusqueda(false);
          return;
        }

        setResultado(`⏳ Buscando en ${total} semilla(s)...`);

        const filtro = responsableFilter.trim().toLowerCase();
        const encontradas: { id: number; especie: string; lat: string; lon: string; altitud: number; traslados: number }[] = [];
        const idsEncontrados: number[] = [];
        const LOTE = 5;

        for (let inicio = 1; inicio <= total; inicio += LOTE) {
          const ids = Array.from(
            { length: Math.min(LOTE, total - inicio + 1) },
            (_, i) => inicio + i
          );
          const resultados = await Promise.allSettled(
            ids.map(async (id) => {
              const dir = await factory.buscarContratoPorId(id);
              if (!dir || dir === ethers.ZeroAddress) return null;
              const gemelo = new ethers.Contract(dir, SEMILLA_INDIVIDUAL_ABI, signer);
              const r      = await gemelo.obtenerResumen();
              return {
                id,
                responsable: (r[2] as string).trim().toLowerCase(),
                especie:     r[1] as string,
                lat:         (Number(r[3]) / 1_000_000).toFixed(5),
                lon:         (Number(r[4]) / 1_000_000).toFixed(5),
                altitud:     Number(r[5]),
                traslados:   Number(r[7]),
              };
            })
          );
          for (const res of resultados) {
            if (res.status === "fulfilled" && res.value) {
              const s = res.value;
              if (s.responsable.includes(filtro)) {
                idsEncontrados.push(s.id);
                encontradas.push(s);
              }
            }
          }
        }

        if (encontradas.length === 0) {
          setResultBusqueda({ ok: false, items: [], filtro: responsableFilter });
          setResultado(`ℹ️ No se encontraron semillas para el responsable "${responsableFilter}".`);
          setSemillasFiltradas([]);
          setCargandoBusqueda(false);
          return;
        }

        setSemillasFiltradas(idsEncontrados);
        setResultBusqueda({ ok: true, items: encontradas, filtro: responsableFilter });
        const lineas = encontradas.map(s =>
          `#${s.id} — ${s.especie}  📍 (${s.lat}, ${s.lon})  ⛰️ ${s.altitud}m  🚚 ${s.traslados} traslado(s)`
        );
        setResultado(
          `✅ ${encontradas.length} semilla(s) para "${responsableFilter}":\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          lineas.join("\n")
        );
        setCargandoBusqueda(false);
        return;
      }

      const result = await (contract as any).buscarSemillasPorResponsable(responsableFilter);
      const ids:             number[] = Array.from(result[0] ?? result.ids        ?? []).map(Number);
      const encontradasLeg: any[]     = Array.from(result[1] ?? result.encontradas ?? []);

      if (ids.length === 0) {
        setResultBusqueda({ ok: false, items: [], filtro: responsableFilter });
        setResultado(`ℹ️ No se encontraron semillas para el responsable "${responsableFilter}".`);
        setSemillasFiltradas([]);
        setCargandoBusqueda(false);
        return;
      }

      setSemillasFiltradas(ids);
      const items = encontradasLeg.map((s: any, i: number) => {
        const lat = (Number(s.latitudInicial ?? 0) / 1_000_000).toFixed(5);
        const lon = (Number(s.longitudInicial ?? 0) / 1_000_000).toFixed(5);
        return { id: ids[i], especie: s.especie ?? s.tipo ?? "—", lat, lon, altitud: Number(s.altitud ?? 0), traslados: 0 };
      });
      setResultBusqueda({ ok: true, items, filtro: responsableFilter });
      const lineas = items.map((s: typeof items[0]) => `#${s.id} — ${s.especie}  📍 (${s.lat}, ${s.lon})`);
      setResultado(
        `✅ ${ids.length} semilla(s) encontradas para "${responsableFilter}":\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        lineas.join("\n")
      );
    } catch (error) {
      setResultBusqueda({ ok: false, items: [], filtro: responsableFilter });
      setResultado(`${t.errorSearchingSeeds} ${(error as Error).message}`);
    } finally { setCargandoBusqueda(false); }
  };

  const medallas = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-4 md:space-y-6 pt-2 md:pt-0">

      {/* ═══════════════════════════════════════════════════════════════════
          SECCIÓN 1: BUSCADOR DE GEMELO DIGITAL (Factory v2)
          Solo visible si hay Factory configurada
      ═══════════════════════════════════════════════════════════════════ */}
      {tieneFactory && (
        <div className="space-y-3 border-2 border-purple-200 rounded-xl p-4 bg-purple-50/40">
          <h3 className="text-base md:text-lg font-semibold text-purple-800 flex items-center">
            <Sprout className="mr-2 h-5 w-5 text-purple-600" />
            {t.gemeloBuscar}
          </h3>

          <div className="flex gap-2">
            <Input
              value={semillaId}
              onChange={(e) => setSemillaId(e.target.value)}
              placeholder="Ej: 1"
              type="number"
              className="flex-1"
            />
            <Button
              onClick={buscarGemeloDigital}
              disabled={cargandoGemelo || !semillaId}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {cargandoGemelo ? "⏳ Buscando..." : t.gemeloBtn}
            </Button>
          </div>

          {/* ─── Tarjeta del Gemelo Digital ─────────────────────────────── */}
          {resumenGemelo && (
            <div className="space-y-4 mt-2">

              {/* Identidad */}
              <DarkSectionC color="purple" icon={<Leaf size={14} />} title={<>{t.gemeloTitulo}{resumenGemelo.id} — {resumenGemelo.especie}</>}>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div><span className="font-semibold">{t.gemeloResponsable}:</span> {resumenGemelo.responsable}</div>
                    <div><span className="font-semibold">{t.gemeloAltitud}:</span> {resumenGemelo.altitud} msnm</div>
                    <div className="col-span-2">
                      <span className="font-semibold">{t.gemeloUbicacion}:</span>{" "}
                      <MapPin className="inline h-3 w-3" /> {resumenGemelo.latitud}, {resumenGemelo.longitud}
                    </div>
                    <div><span className="font-semibold">{t.gemeloAdopcion}:</span> {resumenGemelo.fechaAdopcion}</div>
                    <div><span className="font-semibold">{t.gemeloReportes}:</span> {resumenGemelo.totalReportes}</div>
                    <div><span className="font-semibold">{t.gemeloTraslados}:</span> {resumenGemelo.totalTraslados}</div>
                    <div><span className="font-semibold">{t.gemelo0Donaciones}:</span> {resumenGemelo.totalDonaciones} ETH</div>
                    <div className="col-span-2 truncate text-[10px] text-gray-400">
                      <span className="font-semibold">{t.contratoDir}:</span> {resumenGemelo.contratoDir}
                    </div>
                  </div>
              </DarkSectionC>

              {/* Último clima inyectado */}
              {ultimoClima && (
                <div style={{
                  borderRadius: 14,
                  border: "1px solid rgba(56,189,248,0.18)",
                  background: "rgba(15,18,28,0.82)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
                  overflow: "hidden",
                }}>
                  {/* Header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px",
                    borderBottom: "1px solid rgba(56,189,248,0.12)",
                    background: "rgba(14,165,233,0.07)",
                  }}>
                    <CloudRain style={{ color: "#38bdf8", width: 16, height: 16, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7dd3fc" }}>
                      {t.climaTitle}
                    </span>
                  </div>

                  {/* Metric grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 8,
                    padding: "12px",
                  }}>
                    {[
                      { icon: <Thermometer style={{ color: "#f87171", width: 18, height: 18 }} />, label: t.temp,     value: `${ultimoClima.temperatura}°C` },
                      { icon: <Droplets    style={{ color: "#38bdf8", width: 18, height: 18 }} />, label: t.humidity, value: `${ultimoClima.humedadRelativa}%` },
                      { icon: <CloudRain   style={{ color: "#818cf8", width: 18, height: 18 }} />, label: t.rain,     value: `${ultimoClima.precipitacion}mm` },
                      { icon: <Sun         style={{ color: "#fbbf24", width: 18, height: 18 }} />, label: t.solar,    value: `${ultimoClima.horasLuzSolar}h` },
                    ].map((m, i) => (
                      <div key={i} style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        gap: 5, padding: "10px 6px",
                        background: "rgba(15,18,28,0.55)",
                        borderRadius: 10,
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        {m.icon}
                        <span style={{ fontSize: "0.59rem", color: "rgba(148,163,184,0.7)", fontWeight: 500, textAlign: "center" }}>{m.label}</span>
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.02em" }}>{m.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5,
                    padding: "4px 14px 10px",
                  }}>
                    <Clock style={{ color: "#38bdf8", width: 11, height: 11 }} />
                    <span style={{ fontSize: "0.62rem", color: "rgba(56,189,248,0.7)", fontWeight: 500 }}>
                      {t.sync}: {ultimoClima.fecha}
                    </span>
                  </div>
                </div>
              )}

              {/* Historial climático completo */}
              {historialClima.length > 0 && (
                <DarkSectionC color="green" icon={<History size={14} />} title={<>{t.histClimaTitle} ({historialClima.length})</>}>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {historialClima.slice().reverse().map((r, i) => (
                        <div key={i} style={{ fontSize: "0.68rem", background: "rgba(255,255,255,0.04)", borderRadius: 7, padding: "6px 10px", border: "1px solid rgba(74,222,128,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#cbd5e1" }}>
                          <span>🌡️ {r.temperatura}°C · 💧 {r.humedadRelativa}% · 🌧️ {r.precipitacion}mm · ☀️ {r.horasLuzSolar}h</span>
                          <span className="text-gray-400 ml-2 whitespace-nowrap">{r.fecha}</span>
                        </div>
                      ))}
                    </div>
                </DarkSectionC>
              )}

              {/* Historial de traslados */}
              {historialTraslados.length > 0 && (
                <DarkSectionC color="orange" icon={<MapPin size={14} />} title={<>{t.histTrasladosTitle} ({historialTraslados.length})</>}>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {historialTraslados.map((tr, i) => (
                        <div key={i} style={{ fontSize: "0.68rem", background: "rgba(255,255,255,0.04)", borderRadius: 7, padding: "6px 10px", border: "1px solid rgba(249,115,22,0.12)", color: "#cbd5e1" }}>
                          <span className="font-semibold">#{i+1}</span> · 📍 ({tr.latitud}, {tr.longitud}) · {tr.altitud}m · {tr.responsable}
                          <br /><span className="text-gray-400">{tr.fecha}</span>
                          {tr.comentarios && <><br /><em>{tr.comentarios}</em></>}
                        </div>
                      ))}
                    </div>
                </DarkSectionC>
              )}

              {/* Fases de crecimiento */}
              {fasesCrecimiento.length > 0 && (
                <DarkSectionC color="teal" icon={<Leaf size={14} />} title={<>{t.fasesTitle} ({fasesCrecimiento.length})</>}>
                    <div className="flex gap-2 flex-wrap">
                      {fasesCrecimiento.map((f, i) => (
                        <div key={i} style={{ fontSize: "0.68rem", background: "rgba(45,212,191,0.12)", borderRadius: 99, padding: "3px 12px", border: "1px solid rgba(45,212,191,0.25)", color: "#5eead4", fontWeight: 600 }}>
                          {f.estado}
                        </div>
                      ))}
                    </div>
                </DarkSectionC>
              )}

              {/* Cuadro de Honor / Leaderboard */}
              <DarkSectionC color="yellow" icon={<Trophy size={14} />} title={t.leaderTitle}>
                  {leaderboard.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Aún no hay donantes. ¡Sé el primero en apoyar esta semilla!</p>
                  ) : (
                    <div className="space-y-1">
                      {leaderboard.map((d, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 10px", border: "1px solid rgba(251,191,36,0.15)", fontSize: "0.72rem" }}>
                          <span className="font-bold text-lg w-8 text-center">
                            {i < 3 ? medallas[i] : `#${d.posicion}`}
                          </span>
                          <span className="font-mono text-gray-600 flex-1 mx-2 truncate">
                            {d.billetera.slice(0,6)}...{d.billetera.slice(-4)}
                          </span>
                          <span style={{ fontWeight: 700, color: "#fbbf24" }}>{d.monto} ETH</span>
                        </div>
                      ))}
                    </div>
                  )}
              </DarkSectionC>

              {/* Botón de donación */}
              <DarkSectionC color="green" icon={<Heart size={14} />} title={t.donarTitle}>
                  <p style={{ fontSize: "0.72rem", color: "#86efac" }}>{t.donarInfo}</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={montoDonacion}
                      onChange={(e) => setMontoDonacion(e.target.value)}
                      placeholder="0.001"
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500 font-medium">ETH</span>
                  </div>
                  <Button
                    onClick={donarParaMantenimiento}
                    disabled={donando || !signer || !gemeloDireccion}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {donando ? "⏳ Enviando..." : <><Heart className="mr-2 h-4 w-4" /> {t.donarBtn}</>}
                  </Button>
                  {msgDonacion && (
                    <div className={`p-3 rounded text-sm ${
                      msgDonacion.startsWith("✅")
                        ? "bg-green-100 text-green-800 border border-green-300"
                        : "bg-red-50 text-red-700 border border-red-300"
                    }`}>
                      {msgDonacion}
                    </div>
                  )}
              </DarkSectionC>
            </div>
          )}
        </div>
      )}

      {/* 👤── Card 1: Consultar Historial de Crecimiento ─────────────────👇 */}
      <DarkSectionC color="teal" icon={<History size={16} />} title={t.growthHistory}>
          <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#042f2e]/65 border border-[#2dd4bf]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="plantaId">{t.plantId}</Label>
                  <Input id="plantaId" value={plantaId} onChange={(e) => setPlantaId(e.target.value)} type="number" className="mt-1" />
                </div>
                <Button onClick={obtenerHistorialCrecimiento} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                  <History className="mr-2 h-4 w-4" /> {t.historyButton}
                </Button>
                {resultHistorial && (
                  <div style={{ marginTop: 8, borderRadius: 9, border: "1px solid rgba(45,212,191,0.2)", overflow: "hidden", fontSize: "0.7rem" }}>
                    {resultHistorial.lines.map((line, i) => (
                      <div key={i} style={{ padding: "6px 12px", background: i%2===0 ? "rgba(45,212,191,0.06)" : "transparent", color: "#5eead4", fontFamily: "ui-monospace, monospace", fontSize: "0.7rem" }}>{line}</div>
                    ))}
                  </div>
                )}
              </div>
          </div>
      </DarkSectionC>
      {/* 👆───────────────────────────────────────────────────────────👆 */}


      {/* 👤── Card 2: Obtener Todas las Semillas ────────────────────────👇 */}
      <DarkSectionC color="green" icon={<List size={16} />} title={t.allSeeds}>
          <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#064e3b]/65 border border-[#4ade80]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
              <div className="space-y-3">
                <p style={{ fontSize: "0.72rem", color: "#86efac" }}>Recupera el listado completo de semillas adoptadas vía Factory con especie, responsable, ubicación y traslados.</p>
                <Button onClick={obtenerTodasLasSemillas} disabled={cargandoTodasSem} className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <List className="mr-2 h-4 w-4" /> {cargandoTodasSem ? "⏳ Cargando..." : t.allSeedsButton}
                </Button>
                {resultTodasSem && resultTodasSem.ok && resultTodasSem.items.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                    {resultTodasSem.items.map((s, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,222,128,0.12)", borderRadius: 10, padding: "10px 12px", fontSize: "0.72rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: "#4ade80" }}>#{s.id} — {s.especie}</span>
                          <span style={{ color: "rgba(148,163,184,0.6)" }}>🚚 {s.traslados}</span>
                        </div>
                        <div style={{ color: "#94a3b8" }}>👤 {s.responsable}</div>
                        <div style={{ color: "#64748b", fontFamily: "ui-monospace,monospace", marginTop: 2 }}>📍 ({s.lat}, {s.lon}) · ⛰️ {s.altitud}m</div>
                        {s.dir && <div style={{ color: "#475569", fontFamily: "ui-monospace,monospace", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {s.dir}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {resultTodasSem && !resultTodasSem.ok && (
                  <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 9, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24", fontSize: "0.72rem" }}>ℹ️ Sin semillas registradas en Factory.</div>
                )}
              </div>
          </div>
      </DarkSectionC>
      {/* 👆───────────────────────────────────────────────────────────👆 */}


      {/* 👤── Card 3: Buscar Semillas por Responsable ──────────────────👇 */}
      <DarkSectionC color="blue" icon={<Filter size={16} />} title={t.searchByResponsible}>
          <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#1e3a8a]/65 border border-[#60a5fa]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="responsableFilter">{t.responsible}</Label>
                  <Input id="responsableFilter" value={responsableFilter} onChange={(e) => setResponsableFilter(e.target.value)} placeholder="Ej: María Rodríguez" className="mt-1" />
                </div>
                <Button onClick={buscarSemillasPorResponsable} disabled={cargandoBusqueda} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  <Filter className="mr-2 h-4 w-4" /> {cargandoBusqueda ? "⏳ Buscando..." : t.searchButton}
                </Button>
                {resultBusqueda && resultBusqueda.ok && resultBusqueda.items.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                    <p className="text-xs font-semibold text-blue-400">✅ {resultBusqueda.items.length} semilla(s) para &quot;{resultBusqueda.filtro}&quot;</p>
                    {resultBusqueda.items.map((s, i) => (
                      <div key={i} className="bg-[#1e293b]/70 border border-blue-900/40 rounded-lg p-3 text-xs shadow-sm">
                        <div className="flex justify-between">
                          <span className="font-bold text-blue-300">#{s.id} — {s.especie}</span>
                          <span style={{ color: "rgba(148,163,184,0.6)" }}>🚚 {s.traslados}</span>
                        </div>
                        <div style={{ color: "#94a3b8", fontFamily: "ui-monospace,monospace", marginTop: 2 }}>📍 ({s.lat}, {s.lon}) · ⛰️ {s.altitud}m</div>
                      </div>
                    ))}
                  </div>
                )}
                {resultBusqueda && (!resultBusqueda.ok || resultBusqueda.items.length === 0) && (
                  <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 9, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24", fontSize: "0.72rem" }}>ℹ️ Sin resultados para &quot;{resultBusqueda.filtro}&quot;.</div>
                )}
              </div>
          </div>
      </DarkSectionC>
      {/* 👆───────────────────────────────────────────────────────────👆 */}

    </div>
  );
};

export default Consulta;

