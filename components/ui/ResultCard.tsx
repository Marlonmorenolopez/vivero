// components/ui/ResultCard.tsx  — v3.0 — Metric Grid Style
// Icono arriba · label gris · valor grande blanco — igual que el widget de clima

import React from "react";
import { CheckCircle2, XCircle, ExternalLink, Zap, Hash } from "lucide-react";

// ── Variantes ─────────────────────────────────────────────────────────────────

export type ResultVariant =
  | "registro" | "traslado" | "clima" | "especie"
  | "evento"   | "estadistica" | "verificar"
  | "admin"    | "danger";

interface VTok {
  accent: string; border: string; bg: string; titleColor: string; dot: string;
}

const VT: Record<ResultVariant, VTok> = {
  registro:   { accent:"#a78bfa", border:"rgba(139,92,246,0.22)",  bg:"rgba(139,92,246,0.07)",  titleColor:"#c4b5fd", dot:"#7c3aed" },
  traslado:   { accent:"#fb923c", border:"rgba(249,115,22,0.22)",  bg:"rgba(249,115,22,0.07)",  titleColor:"#fdba74", dot:"#ea580c" },
  clima:      { accent:"#38bdf8", border:"rgba(56,189,248,0.22)",  bg:"rgba(56,189,248,0.07)",  titleColor:"#7dd3fc", dot:"#0284c7" },
  especie:    { accent:"#4ade80", border:"rgba(74,222,128,0.22)",  bg:"rgba(74,222,128,0.07)",  titleColor:"#86efac", dot:"#16a34a" },
  evento:     { accent:"#818cf8", border:"rgba(99,102,241,0.22)",  bg:"rgba(99,102,241,0.07)",  titleColor:"#a5b4fc", dot:"#4f46e5" },
  estadistica:{ accent:"#2dd4bf", border:"rgba(45,212,191,0.22)",  bg:"rgba(45,212,191,0.07)",  titleColor:"#5eead4", dot:"#0d9488" },
  verificar:  { accent:"#fbbf24", border:"rgba(245,158,11,0.22)",  bg:"rgba(245,158,11,0.07)",  titleColor:"#fde68a", dot:"#d97706" },
  admin:      { accent:"#94a3b8", border:"rgba(100,116,139,0.22)", bg:"rgba(100,116,139,0.07)", titleColor:"#cbd5e1", dot:"#475569" },
  danger:     { accent:"#f87171", border:"rgba(248,113,113,0.22)", bg:"rgba(248,113,113,0.07)", titleColor:"#fca5a5", dot:"#b91c1c" },
};

// Map of label keywords → lucide icon names (rendered as emoji fallback with color)
const LABEL_ICONS: Array<{ keys: string[]; icon: string; color: string }> = [
  { keys:["id factory","factory"],    icon:"🏭", color:"#a78bfa" },
  { keys:["id vivero","vivero"],      icon:"🌿", color:"#4ade80" },
  { keys:["gemelo","twin"],           icon:"🔗", color:"#38bdf8" },
  { keys:["tx","hash","transacción"], icon:"📄", color:"#94a3b8" },
  { keys:["semilla"],                 icon:"🌱", color:"#4ade80" },
  { keys:["latitud"],                 icon:"📍", color:"#fb923c" },
  { keys:["longitud"],                icon:"📍", color:"#fb923c" },
  { keys:["altitud"],                 icon:"⛰️", color:"#94a3b8" },
  { keys:["responsable","resp"],      icon:"👤", color:"#a78bfa" },
  { keys:["temperatura","temp"],      icon:"🌡️", color:"#f87171" },
  { keys:["humedad"],                 icon:"💧", color:"#38bdf8" },
  { keys:["precipitación","lluvia"],  icon:"🌧️", color:"#818cf8" },
  { keys:["luz","solar","horas"],     icon:"☀️", color:"#fbbf24" },
  { keys:["especie"],                 icon:"🍃", color:"#4ade80" },
  { keys:["fase","crecimiento"],      icon:"🌿", color:"#2dd4bf" },
  { keys:["traslados"],               icon:"🚚", color:"#fb923c" },
  { keys:["estado"],                  icon:"✅", color:"#4ade80" },
  { keys:["error"],                   icon:"❌", color:"#f87171" },
  { keys:["comentario","nota"],       icon:"💬", color:"#94a3b8" },
  { keys:["ciudad","city"],           icon:"🏙️", color:"#38bdf8" },
  { keys:["gas"],                     icon:"⚡", color:"#fbbf24" },
];

function iconForLabel(label: string): { icon: string; color: string } {
  const low = label.toLowerCase();
  for (const entry of LABEL_ICONS) {
    if (entry.keys.some(k => low.includes(k))) return entry;
  }
  return { icon:"•", color:"#94a3b8" };
}

// ── Estilos globales ──────────────────────────────────────────────────────────

const STYLES = `
  @keyframes rcIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
  .rc-grid { display:grid; gap:8px; }
  @media(max-width:480px){ .rc-grid { grid-template-columns: repeat(2,1fr) !important; } }
`;

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ResultRow {
  label: string;
  value: string;
  mono?: boolean;
  hidden?: boolean;
}

export interface ResultCardProps {
  result: {
    ok: boolean;
    title?: string;
    description?: string;
    rows?: ResultRow[];
    txHash?: string;
    gasUsed?: string;
    errorMessage?: string;
  } | null;
  variant: ResultVariant;
  network?: "sepolia" | "mainnet" | "ganache";
  className?: string;
}

// ── ResultCard ────────────────────────────────────────────────────────────────

export const ResultCard: React.FC<ResultCardProps> = ({
  result, variant, network = "sepolia", className = "",
}) => {
  if (!result) return null;

  const tk = VT[variant];
  const isOk = result.ok;
  const accent      = isOk ? tk.accent      : "#f87171";
  const border      = isOk ? tk.border      : "rgba(248,113,113,0.22)";
  const bg          = isOk ? tk.bg          : "rgba(248,113,113,0.07)";
  const titleColor  = isOk ? tk.titleColor  : "#fca5a5";

  const visibleRows = result.rows?.filter(r => !r.hidden) ?? [];
  const colCount = visibleRows.length <= 2 ? visibleRows.length
                 : visibleRows.length <= 4 ? 2
                 : visibleRows.length <= 6 ? 3
                 : 4;

  const etherscanBase = network === "mainnet"
    ? "https://etherscan.io/tx/"
    : "https://sepolia.etherscan.io/tx/";

  return (
    <div
      className={`mt-3 ${className}`}
      style={{ animation: "rcIn 0.3s cubic-bezier(0.22,1,0.36,1)" }}
    >
      <style>{STYLES}</style>
      <div style={{
        borderRadius: 14,
        border: `1px solid ${border}`,
        borderLeft: `3px solid ${accent}`,
        background: "rgba(15,18,28,0.85)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
        overflow: "hidden",
        fontFamily: "'DM Sans','Inter',system-ui,sans-serif",
      }}>

        {/* ── Header ────────────────────────────────────────── */}
        <div style={{
          display:"flex", alignItems:"center", gap:10,
          padding:"10px 14px",
          borderBottom:`1px solid ${border}`,
          background: bg,
        }}>
          <div style={{
            flexShrink:0, width:26, height:26, borderRadius:8,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:`${accent}18`, border:`1px solid ${accent}35`,
          }}>
            {isOk
              ? <CheckCircle2 size={13} style={{ color: accent }} />
              : <XCircle      size={13} style={{ color: "#f87171" }} />
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:"0.78rem", fontWeight:700, color:titleColor, lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {result.title ?? (isOk ? "Operación exitosa" : "Error en la operación")}
            </div>
            {result.description && (
              <div style={{ fontSize:"0.63rem", color:"rgba(148,163,184,0.75)", marginTop:2 }}>
                {result.description}
              </div>
            )}
          </div>
        </div>

        {/* ── Error message ─────────────────────────────────── */}
        {!isOk && result.errorMessage && (
          <div style={{
            padding:"10px 14px",
            background:"rgba(239,68,68,0.06)",
            borderBottom:`1px solid ${border}`,
            fontSize:"0.7rem",
            fontFamily:"ui-monospace,'Cascadia Code',monospace",
            color:"#fca5a5",
            wordBreak:"break-all",
            lineHeight:1.5,
          }}>
            {result.errorMessage}
          </div>
        )}

        {/* ── Metric grid ───────────────────────────────────── */}
        {visibleRows.length > 0 && (
          <div
            className="rc-grid"
            style={{
              gridTemplateColumns: `repeat(${colCount}, 1fr)`,
              padding: "12px",
            }}
          >
            {visibleRows.map((row, i) => {
              const { icon, color: iColor } = iconForLabel(row.label);
              return (
                <div key={i} style={{
                  display:"flex", flexDirection:"column", alignItems:"center",
                  gap:5, padding:"10px 8px",
                  background:"rgba(15,18,28,0.55)",
                  borderRadius:10,
                  border:"1px solid rgba(255,255,255,0.06)",
                  textAlign:"center",
                }}>
                  {/* Icon */}
                  <span style={{ fontSize:18, lineHeight:1 }} aria-hidden="true">{icon}</span>
                  {/* Label */}
                  <span style={{
                    fontSize:"0.6rem", fontWeight:600,
                    color:"rgba(148,163,184,0.75)",
                    lineHeight:1.2,
                  }}>
                    {row.label}
                  </span>
                  {/* Value */}
                  <span style={{
                    fontSize: row.value.length > 12 ? "0.65rem" : "0.88rem",
                    fontWeight:700,
                    color:"#f1f5f9",
                    fontFamily: row.mono !== false ? "ui-monospace,'Cascadia Code',monospace" : "inherit",
                    lineHeight:1.3,
                    wordBreak:"break-all",
                  }}>
                    {row.value}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer: gas + tx ──────────────────────────────── */}
        {(result.gasUsed || result.txHash) && (
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            flexWrap:"wrap", gap:8,
            padding:"7px 14px 10px",
            borderTop:`1px solid ${border}`,
            background:"rgba(255,255,255,0.02)",
          }}>
            {result.gasUsed && (
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <Zap size={10} style={{ color: accent }} />
                <span style={{ fontSize:"0.62rem", fontFamily:"ui-monospace,monospace", color:"rgba(148,163,184,0.65)" }}>
                  {Number(result.gasUsed).toLocaleString()} gas
                </span>
              </div>
            )}
            {result.txHash && (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <Hash size={10} style={{ color: accent }} />
                  <span style={{ fontSize:"0.62rem", fontFamily:"ui-monospace,monospace", color:"rgba(148,163,184,0.55)" }}>
                    {result.txHash.slice(0,8)}…{result.txHash.slice(-6)}
                  </span>
                </div>
                {network !== "ganache" && (
                  <a
                    href={`${etherscanBase}${result.txHash}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display:"flex", alignItems:"center", gap:3,
                      fontSize:"0.62rem", fontWeight:500,
                      padding:"2px 8px", borderRadius:5,
                      color: accent,
                      background:`${accent}12`,
                      border:`1px solid ${accent}25`,
                      textDecoration:"none",
                    }}
                  >
                    Etherscan <ExternalLink size={8} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── ResultCardSimple ──────────────────────────────────────────────────────────

export interface ResultCardSimpleProps {
  result: { ok: boolean; msg: string; txHash?: string } | null;
  variant: ResultVariant;
  network?: "sepolia" | "mainnet" | "ganache";
}

export const ResultCardSimple: React.FC<ResultCardSimpleProps> = ({
  result, variant, network = "sepolia",
}) => {
  if (!result) return null;

  const cleaned = result.msg.replace(/^[\p{Emoji}\uFE0F\u20E3\s]+/u, "").trim();
  const [title, ...rest] = cleaned.split(":");
  const description = rest.join(":").trim() || undefined;

  return (
    <ResultCard
      result={{
        ok:           result.ok,
        title:        result.ok ? title : "Error en la operación",
        description:  result.ok ? description : undefined,
        errorMessage: result.ok ? undefined : cleaned,
        txHash:       result.txHash,
      }}
      variant={variant}
      network={network}
    />
  );
};

export default ResultCard;