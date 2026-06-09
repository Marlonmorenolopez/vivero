// components/ResultadoDetallado.tsx
import React from "react";
import { Language } from "@/types/vivero";

interface ResultadoDetalladoProps {
  resultado: string;
  gasEstimate: string;
  language: Language;
}

const LABELS: Record<Language, { detailedResult: string; gasEstimate: string }> = {
  es: { detailedResult: "Resultado Detallado", gasEstimate: "Estimación de gas:" },
  en: { detailedResult: "Detailed Result",     gasEstimate: "Gas Estimate:" },
  fr: { detailedResult: "Résultat Détaillé",   gasEstimate: "Estimation du gaz :" },
  de: { detailedResult: "Detailliertes Ergebnis", gasEstimate: "Gasschätzung:" },
};

/** Formatea valores crudos de blockchain (temperatura y precipitación en x10). */
function formatBlockchainValue(value: string): string {
  return value
    .replace(/(-?\d{2,})(?=°C)/g, (m) => (m.includes(".") ? m : (Number(m) / 10).toFixed(1)))
    .replace(/(\d{2,})(?=mm)/g,   (m) => (m.includes(".") ? m : (Number(m) / 10).toFixed(1)));
}

const ResultadoDetallado: React.FC<ResultadoDetalladoProps> = ({
  resultado,
  gasEstimate,
  language,
}) => {
  const t = LABELS[language];

  if (!resultado) return null;

  const entries = resultado
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) return { key: line.trim(), value: "" };
      const key   = line.slice(0, colonIdx).trim();
      const value = formatBlockchainValue(line.slice(colonIdx + 1).trim());
      return { key, value };
    });

  return (
    <div className="space-y-1">
      <ul className="space-y-0">
        {entries.map(({ key, value }, i) => (
          <li key={i} className="resultado-item">
            <span className="font-medium text-[var(--mist)] text-sm">{key}{value ? ":" : ""}</span>
            {value && (
              <span className="text-[var(--leaf-bright)] text-sm font-mono sm:text-right">
                {value}
              </span>
            )}
          </li>
        ))}
      </ul>

      {gasEstimate && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--paramo-border)]">
          <span className="text-xs text-[var(--mist)]">{t.gasEstimate}</span>
          <span className="inline-flex items-center gap-1 bg-[rgba(56,189,248,0.1)] text-[var(--water)] text-xs font-semibold px-3 py-1 rounded-full border border-[rgba(56,189,248,0.2)]">
            ⚡ {gasEstimate}
          </span>
        </div>
      )}
    </div>
  );
};

export default ResultadoDetallado;
