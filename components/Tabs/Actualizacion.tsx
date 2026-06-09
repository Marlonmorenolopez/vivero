"use client";
// components/Tabs/Actualizacion.tsx — v6.0.0
// ============================================================
//  Las semillas adoptadas via Factory NO están en Vivero.sol colección.
//  Todas las operaciones de escritura se dirigen al Gemelo Digital
//  (SemillaIndividual.sol) resolviendo su dirección via Factory.
//
//  Flujo:
//    1. Usuario ingresa ID de semilla
//    2. factory.buscarContratoPorId(id) → dirección del gemelo
//    3. Llamar función directamente en el gemelo
// ============================================================

import React, { useState } from "react";
import { ethers }      from "ethers";
import { RefreshCw, MapPin, CloudRain, Info } from "lucide-react";
import { ResultCard, type ResultCardProps } from "@/components/ui/ResultCard";
import { ViveroInterface } from "../EcoChainComponent";

// ── ABIs mínimos ──────────────────────────────────────────────────────────────
const FACTORY_ABI = [
  "function buscarContratoPorId(uint256) external view returns (address)",
];

const GEMELO_ABI = [
  "function actualizarFaseCrecimiento(string calldata _estado, string calldata _observaciones) external",
  "function registrarTraslado(int256 _latitud, int256 _longitud, uint256 _altitud, string calldata _responsable, string calldata _comentarios) external",
  "function inyectarClima(int256 _temperatura, uint256 _humedadRelativa, uint256 _precipitacion, uint256 _horasLuzSolar) external",
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface ActualizacionProps {
  contract:       ViveroInterface | null;
  setResultado:   React.Dispatch<React.SetStateAction<string>>;
  setGasEstimate: React.Dispatch<React.SetStateAction<string>>;
  language:       "es" | "en" | "fr" | "de";
  chainId?:       number;
  signer?:        ethers.Signer | null;
}

const FASES = ["Semilla", "Germinacion", "Plantula", "Juvenil", "Adulto"];

// ── Tokens de diseño ──────────────────────────────────────────────────────────
const T = {
  // Fondos de cards — cada sección tiene su propio tono
  bgFase:     "linear-gradient(135deg, rgba(5,46,22,0.85) 0%, rgba(6,78,59,0.75) 100%)",
  bgTraslado: "linear-gradient(135deg, rgba(28,25,23,0.85) 0%, rgba(67,20,7,0.65) 100%)",
  bgClima:    "linear-gradient(135deg, rgba(7,26,46,0.85) 0%, rgba(3,52,88,0.65) 100%)",
  bgInfo:     "rgba(56,189,248,0.06)",

  // Bordes por sección
  borderFase:     "rgba(74,222,128,0.25)",
  borderTraslado: "rgba(251,146,60,0.25)",
  borderClima:    "rgba(56,189,248,0.25)",

  // Acentos
  green:  "#4ade80",
  orange: "#fb923c",
  water:  "#38bdf8",
  mist:   "#b7e4c7",
  white:  "#e2f5e9",

  // Input base
  inputBg:     "rgba(0,0,0,0.35)",
  inputBorder: "rgba(255,255,255,0.1)",
};

// ── Componente Section ────────────────────────────────────────────────────────
const Section: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent: string;
  border: string;
  bg: string;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, accent, border, bg, children }) => (
  <div style={{
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: "1.25rem",
    overflow: "hidden",
    boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
  }}>
    {/* Header de la card */}
    <div style={{
      padding: "1rem 1.25rem 0.75rem",
      borderBottom: `1px solid ${border}`,
      display: "flex", alignItems: "flex-start", gap: "0.65rem",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: "0.6rem", flexShrink: 0,
        background: `${accent}22`,
        border: `1px solid ${accent}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent,
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: accent }}>{title}</h3>
        {subtitle && (
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.7rem", color: T.water, opacity: 0.75, lineHeight: 1.45 }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {/* Cuerpo */}
    <div style={{ padding: "1rem 1.25rem 1.25rem" }}>{children}</div>
  </div>
);

// ── Campo con label, hint y placeholder ───────────────────────────────────────
const Field: React.FC<{
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, hint, required, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
    <label style={{
      fontSize: "0.7rem", fontWeight: 600, color: T.mist,
      textTransform: "uppercase", letterSpacing: "0.08em",
      display: "flex", alignItems: "center", gap: "0.3rem",
    }}>
      {label}
      {required && <span style={{ color: "#f87171", fontSize: "0.65rem" }}>*</span>}
    </label>
    {children}
    {hint && (
      <span style={{ fontSize: "0.65rem", color: T.water, opacity: 0.7, display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <Info size={10} /> {hint}
      </span>
    )}
  </div>
);

// ── Estilo de input/select/textarea reutilizable ──────────────────────────────
const inp: React.CSSProperties = {
  background: T.inputBg,
  border: `1px solid ${T.inputBorder}`,
  borderRadius: "0.65rem",
  color: T.white,
  padding: "0.55rem 0.85rem",
  fontSize: "0.85rem",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.2s",
};

// ── Botón de submit ───────────────────────────────────────────────────────────
const Btn: React.FC<{
  loading: boolean;
  icon: React.ReactNode;
  label: string;
  loadLabel: string;
  accent: string;
}> = ({ loading, icon, label, loadLabel, accent }) => (
  <button type="submit" disabled={loading} style={{
    width: "100%", padding: "0.65rem",
    borderRadius: "0.8rem", fontWeight: 700, fontSize: "0.85rem",
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1,
    border: `1px solid ${accent}55`,
    background: `${accent}22`,
    color: accent,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "background 0.2s",
  }}>
    {loading
      ? <><SpinnerIcon />{loadLabel}</>
      : <>{icon}{label}</>
    }
  </button>
);

// ── Spinner SVG ───────────────────────────────────────────────────────────────
const SpinnerIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 20" />
  </svg>
);


// ── Adaptador: convierte el formato interno de Actualizacion al ResultCard ───
interface InlineResultData {
  ok: boolean;
  lines: { label: string; value: string }[];
  gas?: string;
  tx?: string;
}

type ActualizacionVariant = "clima" | "traslado" | "registro";

const InlineResult: React.FC<{
  data: InlineResultData | null;
  /** accent se ignora — la variante controla el color */
  accent: string;
  variant?: ActualizacionVariant;
  title?: string;
  description?: string;
}> = ({ data, variant = "clima", title, description }) => {
  if (!data) return null;

  const errorLine = data.lines.find(l =>
    l.label.includes("❌") || l.label.toLowerCase().includes("error")
  );
  const dataLines = data.lines.filter(l =>
    !l.label.includes("✅") && !l.label.includes("❌")
  );

  return (
    <ResultCard
      result={{
        ok:           data.ok,
        title:        title ?? (data.ok ? "Operación completada" : "Error en la operación"),
        description:  data.ok ? description : undefined,
        rows:         data.ok
          ? dataLines.map(l => ({
              label: l.label.replace(/^[🌱📊📝⛰️📍👤💬🌡️💧🌧️☀️✅❌]\s*/, ""),
              value: l.value,
              mono:  true,
            }))
          : undefined,
        errorMessage: data.ok ? undefined : errorLine?.value ?? data.lines[0]?.value,
        txHash:  data.tx,
        gasUsed: data.gas,
      }}
      variant={variant}
    />
  );
};



// ── Componente principal ──────────────────────────────────────────────────────
const Actualizacion: React.FC<ActualizacionProps> = ({
  setResultado, setGasEstimate, signer,
}) => {
  const [loadFase,     setLoadFase]     = useState(false);
  const [loadTraslado, setLoadTraslado] = useState(false);
  const [loadClima,    setLoadClima]    = useState(false);

  const [resultFase,     setResultFase]     = useState<InlineResultData | null>(null);
  const [resultTraslado, setResultTraslado] = useState<InlineResultData | null>(null);
  const [resultClima,    setResultClima]    = useState<InlineResultData | null>(null);

  const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA;

  // ── Resolver dirección del Gemelo Digital desde la Factory ─────────────────
  const resolverGemelo = async (semillaId: number): Promise<ethers.Contract> => {
    if (!signer) throw new Error("Conecta tu wallet primero.");
    if (!factoryAddress) throw new Error("NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA no configurado.");

    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);
    const dir = await factory.buscarContratoPorId(semillaId);

    if (!dir || dir === ethers.ZeroAddress)
      throw new Error(`No existe Gemelo Digital para la semilla #${semillaId}.`);

    return new ethers.Contract(dir, GEMELO_ABI, signer);
  };

  // ── 1. Actualizar Fase de Crecimiento ──────────────────────────────────────
  const actualizarFase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadFase(true);
    try {
      const fd            = new FormData(e.currentTarget);
      const semillaId     = parseInt(fd.get("semillaId")     as string);
      const estado        = fd.get("estado")                 as string;
      const observaciones = (fd.get("observaciones") as string) || "";

      setResultado("🔍 Buscando Gemelo Digital...");
      const gemelo = await resolverGemelo(semillaId);

      setResultado("⏳ Esperando confirmación en MetaMask...");
      const tx = await gemelo.actualizarFaseCrecimiento(estado, observaciones);
      setResultado("⏳ Procesando transacción...");
      const receipt = await tx.wait();
      setGasEstimate(receipt.gasUsed?.toString() ?? "0");

      setResultFase({ ok: true, lines: [
        { label: "✅ Estado",    value: "Fase actualizada con éxito" },
        { label: "🌱 Semilla",   value: `#${semillaId}` },
        { label: "📊 Nueva fase", value: estado },
        { label: "📝 Notas",     value: observaciones || "—" },
      ], gas: receipt.gasUsed?.toString(), tx: tx.hash });
      setResultado(`✅ Fase #${semillaId} → ${estado} | Tx: ${tx.hash.slice(0,18)}...`);
    } catch (err) {
      setResultFase({ ok: false, lines: [{ label: "❌ Error", value: (err as Error).message }] });
      setResultado(`❌ Error al actualizar fase:\n${(err as Error).message}`);
      setGasEstimate("0");
    } finally { setLoadFase(false); }
  };

  // ── 2. Registrar Traslado Geográfico ───────────────────────────────────────
  const registrarTraslado = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadTraslado(true);
    try {
      const fd          = new FormData(e.currentTarget);
      const semillaId   = parseInt(fd.get("semillaId")   as string);
      const latFloat    = parseFloat(fd.get("latitud")    as string);
      const lngFloat    = parseFloat(fd.get("longitud")   as string);
      const altitud     = parseInt(fd.get("altitud")      as string);
      const responsable = fd.get("responsable")            as string;
      const comentarios = (fd.get("comentarios") as string) || "";

      // El contrato almacena coordenadas × 1_000_000 para evitar decimales en Solidity
      const latSol = Math.round(latFloat * 1_000_000);
      const lngSol = Math.round(lngFloat * 1_000_000);

      setResultado("🔍 Buscando Gemelo Digital...");
      const gemelo = await resolverGemelo(semillaId);

      setResultado("⏳ Esperando confirmación en MetaMask...");
      const tx = await gemelo.registrarTraslado(latSol, lngSol, altitud, responsable, comentarios);
      setResultado("⏳ Procesando transacción...");
      const receipt = await tx.wait();
      setGasEstimate(receipt.gasUsed?.toString() ?? "0");

      setResultTraslado({ ok: true, lines: [
        { label: "✅ Estado",      value: "Traslado registrado con éxito" },
        { label: "🌱 Semilla",     value: `#${semillaId}` },
        { label: "📍 Latitud",     value: `${latFloat.toFixed(6)}°` },
        { label: "📍 Longitud",    value: `${lngFloat.toFixed(6)}°` },
        { label: "⛰️ Altitud",    value: `${altitud} msnm` },
        { label: "👤 Responsable", value: responsable },
        { label: "💬 Comentario",  value: comentarios || "—" },
      ], gas: receipt.gasUsed?.toString(), tx: tx.hash });
      setResultado(`✅ Traslado #${semillaId} → (${latFloat.toFixed(4)}, ${lngFloat.toFixed(4)}) | Tx: ${tx.hash.slice(0,18)}...`);
    } catch (err) {
      setResultTraslado({ ok: false, lines: [{ label: "❌ Error", value: (err as Error).message }] });
      setResultado(`❌ Error al registrar traslado:\n${(err as Error).message}`);
      setGasEstimate("0");
    } finally { setLoadTraslado(false); }
  };

  // ── 3. Inyectar Condiciones Climáticas ────────────────────────────────────
  const inyectarClima = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadClima(true);
    try {
      const fd            = new FormData(e.currentTarget);
      const semillaId     = parseInt(fd.get("semillaId")     as string);
      const temperatura   = parseInt(fd.get("temperatura")   as string);
      const humedad       = parseInt(fd.get("humedad")       as string);
      const precipitacion = parseInt(fd.get("precipitacion") as string);
      const horasLuz      = parseInt(fd.get("horasLuz")      as string);

      setResultado("🔍 Buscando Gemelo Digital...");
      const gemelo = await resolverGemelo(semillaId);

      setResultado("⏳ Esperando confirmación en MetaMask...");
      const tx = await gemelo.inyectarClima(temperatura, humedad, precipitacion, horasLuz);
      setResultado("⏳ Procesando transacción...");
      const receipt = await tx.wait();
      setGasEstimate(receipt.gasUsed?.toString() ?? "0");

      setResultClima({ ok: true, lines: [
        { label: "✅ Estado",         value: "Clima inyectado con éxito" },
        { label: "🌱 Semilla",        value: `#${semillaId}` },
        { label: "🌡️ Temperatura",   value: `${(temperatura / 10).toFixed(1)}°C` },
        { label: "💧 Humedad",        value: `${humedad}%` },
        { label: "🌧️ Precipitación", value: `${(precipitacion / 10).toFixed(1)} mm` },
        { label: "☀️ Horas de luz",  value: `${horasLuz} h` },
      ], gas: receipt.gasUsed?.toString(), tx: tx.hash });
      setResultado(`✅ Clima inyectado #${semillaId} | ${(temperatura/10).toFixed(1)}°C · ${humedad}% | Tx: ${tx.hash.slice(0,18)}...`);
    } catch (err) {
      setResultClima({ ok: false, lines: [{ label: "❌ Error", value: (err as Error).message }] });
      setResultado(`❌ Error al inyectar clima:\n${(err as Error).message}`);
      setGasEstimate("0");
    } finally { setLoadClima(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Banner informativo global */}
      <div style={{
        padding: "0.65rem 1rem", borderRadius: "0.85rem",
        background: T.bgInfo, border: "1px solid rgba(56,189,248,0.2)",
        fontSize: "0.72rem", color: T.water, lineHeight: 1.5,
        display: "flex", gap: "0.5rem", alignItems: "flex-start",
      }}>
        <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          Todas las operaciones actúan sobre el <strong>Gemelo Digital</strong> individual de cada semilla.
          Necesitas el <strong>ID de la semilla</strong> (visible en la pestaña Consulta) y tu wallet conectada con permisos de owner o administrador.
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN 1 — Actualizar Fase de Crecimiento
          Transición fenológica: avanza el estado de vida
          de la semilla en su Gemelo Digital.
      ══════════════════════════════════════════════════════ */}
      <Section
        icon={<RefreshCw size={16} />}
        title="Actualizar Fase de Crecimiento"
        subtitle="Registra la transición fenológica del Gemelo Digital: Semilla → Germinación → Plántula → Juvenil → Adulto."
        accent={T.green}
        border={T.borderFase}
        bg={T.bgFase}
      >
        <form onSubmit={actualizarFase} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>

          {/* ID de la semilla — número asignado al registrarla en la Factory */}
          <Field
            label="ID de la Semilla"
            hint="Número entero asignado cuando se adoptó la semilla. Ej: 1, 2, 3…"
            required
          >
            <input
              name="semillaId"
              type="number"
              min="1"
              required
              placeholder="Ej: 1"
              style={inp}
            />
          </Field>

          {/* Fase fenológica — estado actual de desarrollo de la planta */}
          <Field
            label="Nueva Fase Fenológica"
            hint="Selecciona la etapa a la que ha avanzado la planta. El orden correcto es Semilla → Germinacion → Plantula → Juvenil → Adulto."
            required
          >
            <select name="estado" required defaultValue="" style={inp}>
              <option value="" disabled style={{ color: "#6b7280" }}>
                — Seleccionar fase —
              </option>
              {FASES.map(f => (
                <option key={f} value={f} style={{ background: "#0d1a12", color: T.white }}>
                  {f}
                </option>
              ))}
            </select>
          </Field>

          {/* Observaciones — notas de campo opcionales del investigador */}
          <Field
            label="Observaciones (opcional)"
            hint="Anota condiciones relevantes del campo: tamaño, color, anomalías, condiciones del suelo, etc."
          >
            <textarea
              name="observaciones"
              rows={2}
              placeholder="Ej: Planta de 12 cm, hojas expandidas, suelo húmedo, sin señales de plaga."
              style={{ ...inp, resize: "vertical" }}
            />
          </Field>

          <Btn
            loading={loadFase}
            icon={<RefreshCw size={14} />}
            label="Actualizar Fase"
            loadLabel="Actualizando en blockchain..."
            accent={T.green}
          />
        </form>
        <InlineResult data={resultFase} accent={T.green} variant="registro" title="Fase de crecimiento actualizada" description="Transición fenológica registrada en el Gemelo Digital" />
      </Section>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN 2 — Registrar Traslado Geográfico
          Mueve el Gemelo Digital a nuevas coordenadas GPS.
          Las coordenadas se convierten × 1_000_000 para
          almacenarse como enteros en Solidity.
      ══════════════════════════════════════════════════════ */}
      <Section
        icon={<MapPin size={16} />}
        title="Registrar Traslado Geográfico"
        subtitle="Mueve el Gemelo Digital a nuevas coordenadas GPS. Usa latitud/longitud en formato decimal (ej: 4.7154, -74.1234)."
        accent={T.orange}
        border={T.borderTraslado}
        bg={T.bgTraslado}
      >
        <form onSubmit={registrarTraslado} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>

          {/* ID de la semilla a trasladar */}
          <Field
            label="ID de la Semilla"
            hint="ID asignado al momento de la adopción. Puedes consultarlo en la pestaña Consulta."
            required
          >
            <input
              name="semillaId"
              type="number"
              min="1"
              required
              placeholder="Ej: 4"
              style={inp}
            />
          </Field>

          {/* Coordenadas GPS en formato decimal — latitud y longitud */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
            <Field
              label="Latitud (decimal)"
              hint="Valores entre -90 y 90. En Colombia: aprox. 4 a 7."
              required
            >
              <input
                name="latitud"
                type="number"
                step="any"
                required
                placeholder="Ej: 4.7154"
                style={inp}
              />
            </Field>
            <Field
              label="Longitud (decimal)"
              hint="Valores entre -180 y 180. En Colombia: aprox. -72 a -77."
              required
            >
              <input
                name="longitud"
                type="number"
                step="any"
                required
                placeholder="Ej: -74.1234"
                style={inp}
              />
            </Field>
          </div>

          {/* Altitud en metros sobre el nivel del mar — rango válido del páramo */}
          <Field
            label="Altitud (msnm)"
            hint="Altura sobre el nivel del mar en metros. El ecosistema de páramo va de 2800 a 4200 m."
            required
          >
            <input
              name="altitud"
              type="number"
              min="2800"
              max="4200"
              required
              placeholder="Ej: 3200 (rango válido: 2800–4200 m)"
              style={inp}
            />
          </Field>

          {/* Responsable — nombre de la persona o entidad que ejecuta el traslado */}
          <Field
            label="Responsable del traslado"
            hint="Nombre completo de la persona, equipo o entidad que realiza el traslado físico."
            required
          >
            <input
              name="responsable"
              required
              placeholder="Ej: Ingeniero Carlos Pérez — Equipo de Restauración restauacion del paramo "
              style={inp}
            />
          </Field>

          {/* Comentarios de campo opcionales sobre el traslado */}
          <Field
            label="Comentarios (opcional)"
            hint="Describe el motivo del traslado, condiciones del nuevo sitio o incidencias durante el proceso."
          >
            <textarea
              name="comentarios"
              rows={2}
              placeholder="Ej: Traslado por mejores condiciones de humedad. Sitio con cobertura vegetal densa y pendiente suave."
              style={{ ...inp, resize: "vertical" }}
            />
          </Field>

          <Btn
            loading={loadTraslado}
            icon={<MapPin size={14} />}
            label="Registrar Traslado"
            loadLabel="Registrando en blockchain..."
            accent={T.orange}
          />
        </form>
        <InlineResult data={resultTraslado} accent={T.orange} variant="traslado" title="Traslado geográfico registrado" description="Nuevas coordenadas GPS almacenadas en el Gemelo Digital" />
      </Section>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN 3 — Inyectar Condiciones Climáticas
          Registra telemetría ambiental en el Gemelo Digital.
          IMPORTANTE: temperatura y precipitación se ingresan
          × 10 porque Solidity no maneja decimales (int256).
          El contrato los divide al leer.
      ══════════════════════════════════════════════════════ */}
      <Section
        icon={<CloudRain size={16} />}
        title="Inyectar Condiciones Climáticas"
        subtitle="Registra telemetría ambiental en el Gemelo Digital. Temperatura y precipitación van multiplicadas × 10 para conservar un decimal."
        accent={T.water}
        border={T.borderClima}
        bg={T.bgClima}
      >
        {/* Aviso de escala × 10 — explicación del encoding antes del formulario */}
        <div style={{
          padding: "0.5rem 0.8rem", marginBottom: "0.85rem",
          borderRadius: "0.65rem",
          background: "rgba(56,189,248,0.07)",
          border: "1px solid rgba(56,189,248,0.2)",
          fontSize: "0.69rem", color: T.water, lineHeight: 1.5,
          display: "flex", gap: "0.4rem", alignItems: "flex-start",
        }}>
          <Info size={11} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Escala × 10:</strong> Ingresa el valor real multiplicado por 10 para preservar un decimal.
            Temperatura 8.5°C → escribe <strong>85</strong>. Precipitación 0.4 mm → escribe <strong>4</strong>.
            El sistema mostrará el valor real al confirmar.
          </span>
        </div>

        <form onSubmit={inyectarClima} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>

          {/* ID de la semilla que recibirá los datos climáticos */}
          <Field
            label="ID de la Semilla"
            hint="Semilla cuyo Gemelo Digital recibirá esta telemetría. Debe existir en la Factory."
            required
          >
            <input
              name="semillaId"
              type="number"
              min="1"
              required
              placeholder="Ej: 9"
              style={inp}
            />
          </Field>

          {/* Cuadrícula 2×2 para los 4 valores climáticos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>

            {/* Temperatura × 10: p.ej. 8.5°C → 85 */}
            <Field
              label="Temperatura (× 10)"
              hint="Real × 10. Ej: 8.5°C → 85"
              required
            >
              <input
                name="temperatura"
                type="number"
                required
                placeholder="Ej: 85 (= 8.5°C)"
                style={inp}
              />
            </Field>

            {/* Humedad relativa en porcentaje, valor directo 0–100 */}
            <Field
              label="Humedad (%)"
              hint="Porcentaje directo, sin escalar. 0 a 100."
              required
            >
              <input
                name="humedad"
                type="number"
                min="0"
                max="100"
                required
                placeholder="Ej: 85 (= 85%)"
                style={inp}
              />
            </Field>

            {/* Precipitación × 10: p.ej. 0.4 mm → 4 */}
            <Field
              label="Precipitación (mm × 10)"
              hint="Real × 10. Ej: 0.4 mm → 4"
              required
            >
              <input
                name="precipitacion"
                type="number"
                min="0"
                required
                placeholder="Ej: 4 (= 0.4 mm)"
                style={inp}
              />
            </Field>

            {/* Horas de luz solar, valor directo 0–24 */}
            <Field
              label="Horas de Luz Solar (0–24)"
              hint="Horas de sol directo en el día. Valor real, sin escalar."
              required
            >
              <input
                name="horasLuz"
                type="number"
                min="0"
                max="24"
                required
                placeholder="Ej: 6 (= 6 horas de sol)"
                style={inp}
              />
            </Field>
          </div>

          <Btn
            loading={loadClima}
            icon={<CloudRain size={14} />}
            label="Inyectar Clima"
            loadLabel="Inyectando en blockchain..."
            accent={T.water}
          />
        </form>
        <InlineResult data={resultClima} accent={T.water} variant="clima" title="Telemetría climática inyectada" description="Condiciones ambientales registradas en el Gemelo Digital" />
      </Section>

    </div>
  );
};

export default Actualizacion;