"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Particles from "react-tsparticles";
import { Engine } from "tsparticles-engine";
import { loadFull } from "tsparticles";
import {
  Wallet,
  Leaf,
  Globe,
  Activity,
  Shield,
  BarChart3,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { BackgroundImages } from "./BackgroundImages";
import Registro from "./Tabs/Registro";
import Consulta from "./Tabs/Consulta";
import Actualizacion from "./Tabs/Actualizacion";
import Biodiversidad from "./Tabs/Biodiversidad";
import Administracion from "./Tabs/Administracion";
import ResultadoDetallado from "./ResultadoDetallado";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { useWallet } from "./hooks/useWallet";

// Re-exportamos tipos para que los tabs no necesiten importar desde aquí
export type { ViveroInterface, Semilla, Traslado, FaseCrecimiento, ReporteClimatico } from "@/types/vivero";

// ─── Traducciones ──────────────────────────────────────────────────────────
const TRANSLATIONS = {
  es: {
    title: "EcoChain: Vivero de Frailejones",
    description: "Gestión y Registro de Semillas, Plantas y Biodiversidad del Páramo",
    currentDateTime: "Fecha y hora:",
    totalSeeds: "Semillas registradas",
    totalPlants: "Plantas trasladadas",
    connectWallet: "Conectar Wallet",
    walletConnected: "Wallet Conectada",
    networkConnected: "Red:",
    selectSection: "Seleccionar sección",
    tabs: { registro: "Registro", actualizacion: "Actualización", biodiversidad: "Biodiversidad", administracion: "Administración", consulta: "Consulta" },
    result: "Resultado",
    oracleBadge: "Chainlink Oráculo Activo",
    manualBadge: "Modo Manual (Ganache)",
    speciesNativas: "Especies nativas",
    eventosClimaticos: "Eventos climáticos",
    refreshing: "Actualizando...",
  },
  en: {
    title: "EcoChain: Frailejones Nursery",
    description: "Management and Registration of Seeds, Plants and Páramo Biodiversity",
    currentDateTime: "Date & time:",
    totalSeeds: "Registered seeds",
    totalPlants: "Transferred plants",
    connectWallet: "Connect Wallet",
    walletConnected: "Wallet Connected",
    networkConnected: "Network:",
    selectSection: "Select section",
    tabs: { registro: "Registration", actualizacion: "Update", biodiversidad: "Biodiversity", administracion: "Administration", consulta: "Query" },
    result: "Result",
    oracleBadge: "Chainlink Oracle Active",
    manualBadge: "Manual Mode (Ganache)",
    speciesNativas: "Native species",
    eventosClimaticos: "Climate events",
    refreshing: "Refreshing...",
  },
  fr: {
    title: "EcoChain: Pépinière de Frailejones",
    description: "Gestion et Enregistrement des Graines, Plantes et Biodiversité du Páramo",
    currentDateTime: "Date et heure :",
    totalSeeds: "Graines enregistrées",
    totalPlants: "Plantes transférées",
    connectWallet: "Connecter le Portefeuille",
    walletConnected: "Portefeuille Connecté",
    networkConnected: "Réseau :",
    selectSection: "Choisir une section",
    tabs: { registro: "Enregistrement", actualizacion: "Mise à Jour", biodiversidad: "Biodiversité", administracion: "Administration", consulta: "Consultation" },
    result: "Résultat",
    oracleBadge: "Oracle Chainlink Actif",
    manualBadge: "Mode Manuel (Ganache)",
    speciesNativas: "Espèces natives",
    eventosClimaticos: "Événements climatiques",
    refreshing: "Actualisation...",
  },
  de: {
    title: "EcoChain: Frailejones-Gärtnerei",
    description: "Verwaltung und Registrierung von Samen, Pflanzen und Biodiversität des Páramo",
    currentDateTime: "Datum und Uhrzeit:",
    totalSeeds: "Registrierte Samen",
    totalPlants: "Umgesiedelte Pflanzen",
    connectWallet: "Wallet verbinden",
    walletConnected: "Wallet verbunden",
    networkConnected: "Netzwerk:",
    selectSection: "Abschnitt auswählen",
    tabs: { registro: "Registrierung", actualizacion: "Aktualisierung", biodiversidad: "Biodiversität", administracion: "Verwaltung", consulta: "Abfrage" },
    result: "Ergebnis",
    oracleBadge: "Chainlink-Orakel Aktiv",
    manualBadge: "Manueller Modus (Ganache)",
    speciesNativas: "Heimische Arten",
    eventosClimaticos: "Klimaereignisse",
    refreshing: "Aktualisierung...",
  },
} as const;

// ─── Selector de idioma ──────────────────────────────────────────────────────
const LANG_OPTIONS = [
  { code: "es", label: "🇨🇴 ES" },
  { code: "en", label: "🇬🇧 EN" },
  { code: "fr", label: "🇫🇷 FR" },
  { code: "de", label: "🇩🇪 DE" },
] as const;

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  return (
    <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
      <SelectTrigger className="w-24 h-8 text-xs border-paramo bg-transparent border-[var(--paramo-border)] text-[var(--mist)]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[var(--paramo-dark)] border-[var(--paramo-border)]">
        {LANG_OPTIONS.map((opt) => (
          <SelectItem key={opt.code} value={opt.code} className="text-xs text-[var(--mist)] focus:bg-[var(--paramo-surface)]">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// ─── Stat card ───────────────────────────────────────────────────────────────
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string }> = ({
  icon, label, value,
}) => (
  <div className="stat-card animate-fade-in-up">
    <div className="text-[var(--leaf-bright)] mb-1">{icon}</div>
    <span className="text-xl font-bold text-white tabular-nums">{value}</span>
    <span className="text-[10px] text-[var(--mist)] mt-0.5 text-center leading-tight">{label}</span>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────
function EcoChainComponent() {
  const { language } = useLanguage();
  const t = TRANSLATIONS[language];

  const {
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
    actualizarTotales,
    actualizarEstadisticasParamo,
    REDES,
  } = useWallet();

  const [resultado, setResultado] = useState("");
  const [gasEstimate, setGasEstimate] = useState<string>("");
  const [activeTab, setActiveTab] = useState("registro");
  const [currentTimestamp, setCurrentTimestamp] = useState("Cargando...");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Reloj
  useEffect(() => {
    const tick = () => setCurrentTimestamp(new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

 // ─── Disparo del oráculo automático al registrar semilla ──────────────────
  // ¡CORREGIDO v2.1.0! Se elimina el bloque fetch para evitar colisiones con la Semilla #3.
  const handleSeedRegisteredAutomation = useCallback(
    async (latitud?: number, longitud?: number) => {
      if (!contract) return;

      // Su única misión ahora es actualizar las métricas en la interfaz
      // sin volver a invocar al servidor de forma paralela.
      try {
        await actualizarTotales();
        await actualizarEstadisticasParamo();
      } catch (err) {
        console.error("Error al refrescar las estadísticas del páramo:", err);
      }
    },
    [contract, actualizarTotales, actualizarEstadisticasParamo]
  );

  const handleRefresh = async () => {
    if (!contract || isRefreshing) return;
    setIsRefreshing(true);
    await Promise.all([actualizarTotales(), actualizarEstadisticasParamo()]);
    setIsRefreshing(false);
  };

  const particlesInit = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);

  const TAB_ICONS: Record<string, React.ReactNode> = {
    registro:      <Leaf className="w-3.5 h-3.5" />,
    consulta:      <Globe className="w-3.5 h-3.5" />,
    actualizacion: <RefreshCw className="w-3.5 h-3.5" />,
    biodiversidad: <Activity className="w-3.5 h-3.5" />,
    administracion:<Shield className="w-3.5 h-3.5" />,
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundImages />

      {/* Partículas sutiles */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          background: { color: { value: "transparent" } },
          fpsLimit: 60,
          particles: {
            color: { value: ["#4ade80", "#38bdf8", "#86efac"] },
            links: { color: "#4ade80", distance: 120, enable: true, opacity: 0.15, width: 1 },
            move: { direction: "none", enable: true, outModes: { default: "bounce" }, speed: 0.6 },
            number: { density: { enable: true, area: 1000 }, value: 50 },
            opacity: { value: 0.25 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 3 } },
          },
          detectRetina: true,
        }}
      />

      {/* Tarjeta principal */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-4xl relative z-10"
      >
        <Card className="paramo-card overflow-hidden">
          {/* Línea decorativa superior */}
          <div className="paramo-topline h-0.5 w-full" />

          <CardHeader className="pt-6 pb-4 px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-gradient-paramo text-2xl md:text-4xl font-bold leading-tight mb-1">
                  {t.title}
                </CardTitle>
                <CardDescription className="text-[var(--mist)] text-sm md:text-base opacity-80">
                  {t.description}
                </CardDescription>
              </div>
              <LanguageSelector />
            </div>

            {/* Fecha + badge oracle */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="text-xs text-[var(--mist)] opacity-60">
                {t.currentDateTime} <span className="font-mono opacity-80">{currentTimestamp}</span>
              </span>
              {walletConnected && (
                <span className={tieneOracle ? "badge-oracle" : "badge-manual"}>
                  {tieneOracle && <span className="pulse-dot" />}
                  {tieneOracle ? t.oracleBadge : t.manualBadge}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="px-4 md:px-6 pb-6 space-y-5">

            {/* Stats grid */}
            {walletConnected && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 stagger">
                <StatCard icon={<Leaf className="w-4 h-4" />} label={t.totalSeeds} value={totalSemillas} />
                <StatCard icon={<Activity className="w-4 h-4" />} label={t.totalPlants} value={totalPlantas} />
                <StatCard
                  icon={<Globe className="w-4 h-4" />}
                  label={t.speciesNativas}
                  value={estadisticasParamo?.totalEspeciesNativas ?? "—"}
                />
                <StatCard
                  icon={<BarChart3 className="w-4 h-4" />}
                  label={t.eventosClimaticos}
                  value={estadisticasParamo?.totalEventosClimaticos ?? "—"}
                />
              </div>
            )}

            {/* Botón wallet */}
            <div className="space-y-2">
              <button
                onClick={connectWallet}
                disabled={walletConnected}
                className="btn-wallet"
              >
                <Wallet className="w-4 h-4" />
                {walletConnected ? t.walletConnected : t.connectWallet}
              </button>

              <AnimatePresence>
                {connectionStatus && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-center text-xs text-[var(--mist)] opacity-70"
                  >
                    {connectionStatus}
                  </motion.p>
                )}
              </AnimatePresence>

              {walletConnected && (
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  {networkName && (
                    <span className="text-[var(--leaf-bright)]">
                      {t.networkConnected} <strong>{networkName}</strong>
                    </span>
                  )}
                  {accountAddress && (
                    <span className="wallet-address">
                      💳 {accountAddress.slice(0, 6)}…{accountAddress.slice(-4)}
                    </span>
                  )}
                  {chainId > 0 && REDES[chainId] && (
                    <span className="wallet-address text-[var(--leaf-bright)]">
                      🌿 {REDES[chainId].contractAddress.slice(0, 8)}…
                    </span>
                  )}
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="wallet-address flex items-center gap-1 hover:border-[var(--leaf-mid)] transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                    {isRefreshing ? t.refreshing : "↺"}
                  </button>
                </div>
              )}
            </div>

            {/* Tabs — mobile: select, desktop: tabs */}
            <div className="md:hidden">
              <Select onValueChange={setActiveTab} value={activeTab}>
                <SelectTrigger className="w-full bg-[var(--paramo-surface)] border-[var(--paramo-border)] text-[var(--mist)]">
                  <SelectValue placeholder={t.selectSection} />
                </SelectTrigger>
                <SelectContent className="bg-[var(--paramo-dark)] border-[var(--paramo-border)]">
                  {Object.entries(t.tabs).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-[var(--mist)] focus:bg-[var(--paramo-surface)]">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden md:block">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 gap-1 bg-[var(--paramo-surface)] p-1 rounded-xl border border-[var(--paramo-border)]">
                  {Object.entries(t.tabs).map(([key, label]) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="paramo-tab flex items-center gap-1.5 data-[state=active]:bg-[rgba(74,222,128,0.12)] data-[state=active]:text-[var(--leaf-bright)]"
                    >
                      {TAB_ICONS[key]}
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Contenido del tab activo */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "registro" && (
                  <Registro
                    contract={contract}
                    oracleContract={oracleContract}
                    chainId={chainId}
                    tieneOracle={tieneOracle}
                    signer={signer}
                    nftAddress={nftAddress}
                    setResultado={setResultado}
                    setGasEstimate={setGasEstimate}
                    walletConnected={walletConnected}
                    actualizarTotales={handleSeedRegisteredAutomation}
                    language={language}
                  />
                )}
                {activeTab === "consulta" && (
                  <Consulta contract={contract} setResultado={setResultado} language={language} signer={signer} />
                )}
                {activeTab === "actualizacion" && (
                  <Actualizacion contract={contract} setResultado={setResultado} setGasEstimate={setGasEstimate} language={language} chainId={chainId} signer={signer} />
                )}
                {activeTab === "biodiversidad" && (
                  <Biodiversidad
                    contract={contract}
                    setResultado={setResultado}
                    setGasEstimate={setGasEstimate}
                    actualizarEstadisticasParamo={actualizarEstadisticasParamo}
                    language={language}
                    chainId={chainId}
                  />
                )}
                {activeTab === "administracion" && (
                  <Administracion contract={contract} setResultado={setResultado} setGasEstimate={setGasEstimate} actualizarEstadisticasParamo={actualizarEstadisticasParamo} language={language} chainId={chainId} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Panel de resultado */}
            <AnimatePresence>
              {resultado && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-xl overflow-hidden border border-[var(--paramo-border)]"
                  style={{ background: "rgba(13,26,18,0.9)" }}
                >
                  <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--paramo-border)]">
                    <span className="text-xs font-semibold text-[var(--leaf-bright)]">{t.result}</span>
                    <button
                      onClick={() => { setResultado(""); setGasEstimate(""); }}
                      className="text-xs text-[var(--mist)] opacity-50 hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="p-4">
                    <ResultadoDetallado resultado={resultado} gasEstimate={gasEstimate} language={language} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ─── Wrapper con providers ────────────────────────────────────────────────────
const WrappedEcoChainComponent = () => (
  <LanguageProvider>
    <EcoChainComponent />
  </LanguageProvider>
);

export { WrappedEcoChainComponent as EcoChainComponent };
export default WrappedEcoChainComponent;