"use client";
// components/SeedSelectionModal.tsx — v3.0.0 Páramo Design
import React from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Sprout, Leaf, Droplets, Wind, Mountain } from "lucide-react";

interface SeedSelectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem: string | null;
}

// ─── Info técnica por especie ─────────────────────────────────────────────────
const SEED_INFO: Record<string, {
  nombreCientifico: string;
  familia: string;
  crecimiento: string;
  altitud: string;
  datos: string[];
  color: string;
  icon: React.ReactNode;
}> = {
  Frailejon: {
    nombreCientifico: "Espeletia grandiflora",
    familia: "Asteraceae",
    crecimiento: "~1 cm por año",
    altitud: "3.000 – 4.500 m s. n. m.",
    datos: [
      "Sus hojas peludas absorben la neblina y la transforman en agua dulce que alimenta los ríos.",
      "Puede vivir más de 100 años. Un frailejón de 1 metro tiene más de un siglo de vida.",
      "Acumula agua en su tallo esponjoso, actuando como reservorio natural durante la sequía.",
      "Es la especie emblemática del páramo colombiano y especie paraguas de su ecosistema.",
    ],
    color: "#4ade80",
    icon: <Droplets size={14} />,
  },
  Cardones: {
    nombreCientifico: "Puya trianae",
    familia: "Bromeliaceae",
    crecimiento: "Floración única cada 50-80 años",
    altitud: "2.800 – 4.200 m s. n. m.",
    datos: [
      "Planta de hojas espinosas en roseta con una gran columna floral que puede superar los 3 metros.",
      "Almacena agua en su base central, sirviendo de fuente de agua para colibríes y osos de anteojos.",
      "Florece solo una vez en su vida, luego muere dejando miles de semillas.",
      "Sus espinas protegen a pequeñas aves que anidan entre sus hojas.",
    ],
    color: "#fb923c",
    icon: <Mountain size={14} />,
  },
  Macolla: {
    nombreCientifico: "Calamagrostis effusa",
    familia: "Poaceae",
    crecimiento: "Pasto perenne de crecimiento moderado",
    altitud: "3.200 – 4.800 m s. n. m.",
    datos: [
      "Pasto denso en forma de cojín que protege el suelo de la erosión hídrica y eólica.",
      "Sirve de refugio térmico para anfibios, roedores e insectos durante las heladas nocturnas.",
      "Sus raíces entrelazadas retienen hasta 10 veces su peso en agua, regulando el caudal de ríos.",
      "Cubre más del 40% de la superficie del páramo colombiano.",
    ],
    color: "#a3e635",
    icon: <Wind size={14} />,
  },
  Bambues: {
    nombreCientifico: "Chusquea tessellata",
    familia: "Poaceae",
    crecimiento: "Hasta 30 cm por año",
    altitud: "3.000 – 4.200 m s. n. m.",
    datos: [
      "Matorral de tallos flexibles cuyas raíces profundas amarran la tierra para evitar deslizamientos.",
      "Forma densas colonias que crean microclimas húmedos favorables para helechos y musgos.",
      "Sus tallos huecos sirven de refugio y sitio de anidación para aves del páramo.",
      "Resiste temperaturas de hasta -10 °C durante las heladas de alta montaña.",
    ],
    color: "#38bdf8",
    icon: <Leaf size={14} />,
  },
};

// ─── Nombre para mostrar ──────────────────────────────────────────────────────
const DISPLAY_NAMES: Record<string, string> = {
  Frailejon:  "Frailejón (Espeletia)",
  Cardones:   "Cardón de Páramo (Puya)",
  Macolla:    "Macolla (Calamagrostis)",
  Bambues:    "Bambú de Páramo (Chusquea)",
};

// ─── Modal shell ──────────────────────────────────────────────────────────────
const ModalShell: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
  maxWidth?: string;
}> = ({ open, onOpenChange, title, children, onClose, maxWidth = "960px" }) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay
        className="fixed inset-0 z-50"
        style={{ background: "rgba(4,10,6,0.85)", backdropFilter: "blur(6px)" }}
      />
      <Dialog.Content
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: "min(95vw, " + maxWidth + ")",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--paramo-dark, #162318)",
          border: "1px solid var(--paramo-border, #2e5039)",
          borderRadius: "1.25rem",
          boxShadow: "0 0 0 1px rgba(74,222,128,0.06), 0 24px 64px rgba(0,0,0,0.7)",
          zIndex: 51,
          outline: "none",
        }}
      >
        <div style={{ height: "2px", borderRadius: "1.25rem 1.25rem 0 0", background: "linear-gradient(90deg, transparent, #22c55e 30%, #38bdf8 70%, transparent)" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem 0.75rem", borderBottom: "1px solid rgba(46,80,57,0.6)" }}>
          <Dialog.Title style={{ fontSize: "1.15rem", fontWeight: 600, background: "linear-gradient(135deg, #4ade80, #38bdf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", margin: 0 }}>
            {title}
          </Dialog.Title>
          <Dialog.Close asChild>
            <button onClick={onClose} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(46,80,57,0.8)", background: "rgba(36,61,44,0.5)", color: "#b7e4c7", cursor: "pointer", flexShrink: 0 }} aria-label="Cerrar">
              <X size={14} />
            </button>
          </Dialog.Close>
        </div>
        <div style={{ padding: "1.25rem 1.5rem 1.5rem" }}>{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const SeedSelectionModal: React.FC<SeedSelectionModalProps> = ({ isOpen, onOpenChange, selectedItem }) => {
  const info = selectedItem ? SEED_INFO[selectedItem] : null;
  const displayName = selectedItem ? (DISPLAY_NAMES[selectedItem] ?? selectedItem) : "";

  return (
    <ModalShell
      open={isOpen}
      onOpenChange={onOpenChange}
      title={
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sprout size={18} />
          {displayName || "Detalles de la Semilla"}
        </span>
      }
    >
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}
        className="seed-modal-grid"
      >
        <style>{`@media(min-width:640px){.seed-modal-grid{grid-template-columns:1fr 1fr!important}}`}</style>

        {/* ── Panel información técnica ── */}
        <div style={{ background: "rgba(13,26,18,0.7)", border: "1px solid rgba(46,80,57,0.7)", borderRadius: "1rem", padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.08em", color: "#4ade80", textTransform: "uppercase", margin: 0 }}>
            Información Técnica
          </p>

          {info ? (
            <>
              {/* Nombre científico y familia */}
              <div style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "0.75rem", padding: "0.75rem 1rem" }}>
                <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: info.color, fontStyle: "italic" }}>
                  {info.nombreCientifico}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#b7e4c7", opacity: 0.7 }}>
                  Familia: {info.familia}
                </p>
              </div>

              {/* Datos rápidos */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <div style={{ background: "rgba(36,61,44,0.5)", borderRadius: "0.6rem", padding: "0.5rem 0.75rem", border: "1px solid rgba(46,80,57,0.6)" }}>
                  <p style={{ margin: 0, fontSize: "0.65rem", color: "#86efac", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em" }}>Crecimiento</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#e2f5e9", fontWeight: 600 }}>{info.crecimiento}</p>
                </div>
                <div style={{ background: "rgba(36,61,44,0.5)", borderRadius: "0.6rem", padding: "0.5rem 0.75rem", border: "1px solid rgba(46,80,57,0.6)" }}>
                  <p style={{ margin: 0, fontSize: "0.65rem", color: "#86efac", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.06em" }}>Altitud</p>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#e2f5e9", fontWeight: 600 }}>{info.altitud}</p>
                </div>
              </div>

              {/* Datos curiosos */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {info.datos.map((dato, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", background: "rgba(36,61,44,0.35)", borderRadius: "0.65rem", padding: "0.6rem 0.75rem", border: "1px solid rgba(46,80,57,0.4)" }}>
                    <span style={{ color: info.color, flexShrink: 0, marginTop: 2 }}>{info.icon}</span>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#b7e4c7", lineHeight: 1.5 }}>{dato}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "#b7e4c7", opacity: 0.4, fontSize: "0.85rem" }}>
              Selecciona una especie para ver su información
            </div>
          )}
        </div>

        {/* ── Panel imagen de la semilla ── */}
        {selectedItem && (
          <div style={{ background: "rgba(13,26,18,0.7)", border: "1px solid rgba(46,80,57,0.7)", borderRadius: "1rem", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "relative", flex: 1, minHeight: 220 }}>
              <Image
                src={`/imagenesSemillas/${selectedItem}.png`}
                alt={selectedItem}
                fill
                style={{ objectFit: "cover" }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,26,18,0.95) 0%, transparent 50%)" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "1rem 1.1rem" }}>
                <p style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#e2f5e9" }}>{displayName}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#b7e4c7", opacity: 0.7 }}>Especie del Páramo</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

export default SeedSelectionModal;