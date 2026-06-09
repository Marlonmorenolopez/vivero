"use client";
// components/SeedAdoptionModal.tsx — v1.0.0
// ============================================================
//  Modal independiente de cámara + NFT para Adoptar Semilla
//  (Factory — Gemelo Digital).
//
//  100% independiente de PlantTransferModal — comparte solo
//  los primitivos visuales (design system páramo) pero tiene
//  su propio estado, su propia lógica de cámara, su propio
//  flujo NFT y sus propias etiquetas ("Adopción" vs "Traslado").
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ethers } from "ethers";
import {
  Camera, Download, Eye, Play, Square, Video,
  X, ExternalLink, Leaf, Image as ImageIcon, Sparkles, Sprout,
} from "lucide-react";
import nftABI from "@/abis/nftABI.json";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface SeedAdoptionModalProps {
  isOpen:              boolean;
  onOpenChange:        (open: boolean) => void;
  semillaId:           string | null;      // ID de Vivero.sol
  semillaIdFactory:    number;             // ID de ViveroFactory
  especie:             string;
  responsable:         string;
  latitud:             number;             // float crudo, ej: 4.711
  longitud:            number;             // float crudo, ej: -74.072
  temperatura:         number;             // ×10 (85 = 8.5°C), puede llegar 0 si oráculo aún no respondió
  humedad:             number;             // %
  altitud:             number;             // msnm
  contratoIndividual:  string;             // dirección del gemelo digital recién creado
  ciudad:              string;
  precipitacion:       number;             // ×10 como Solidity
  horasLuz:            number;
  comentarios:         string;
  txHash:              string;
  signer:              ethers.Signer | null;
  chainId:             number;
  nftAddress:          string;
}

type EstadoNFT =
  | "idle" | "subiendo_foto" | "subiendo_meta"
  | "minteando" | "subiendo_video" | "listo" | "error";

// ─── Config ───────────────────────────────────────────────────────────────────
const NFT_ADDRESSES: Record<number, string> = {
  1337:     process.env.NEXT_PUBLIC_NFT_ADDRESS_GANACHE ?? "",
  11155111: process.env.NEXT_PUBLIC_NFT_ADDRESS_SEPOLIA ?? "",
};

// ─── Design tokens páramo (idénticos a PlantTransferModal) ───────────────────
const T = {
  dark:     "#0d1a12",
  surface:  "#162318",
  card:     "rgba(22,35,24,0.9)",
  border:   "rgba(46,80,57,0.7)",
  green:    "#4ade80",
  greenMid: "#22c55e",
  water:    "#38bdf8",
  mist:     "#b7e4c7",
  red:      "#f87171",
};

const topLine = (
  <div style={{
    height: 2, borderRadius: "1.25rem 1.25rem 0 0",
    background: `linear-gradient(90deg,transparent,${T.greenMid} 30%,${T.water} 70%,transparent)`,
  }} />
);

// ─── Primitivos de UI ─────────────────────────────────────────────────────────
const CloseBtn: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <Dialog.Close asChild>
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      width: 32, height: 32, borderRadius: "50%",
      border: `1px solid ${T.border}`, background: "rgba(36,61,44,0.5)",
      color: T.mist, cursor: "pointer", flexShrink: 0,
    }} aria-label="Cerrar">
      <X size={14} />
    </button>
  </Dialog.Close>
);

const SLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{
    margin: 0, fontSize: "0.68rem", fontWeight: 700,
    letterSpacing: "0.09em", color: T.green, textTransform: "uppercase",
  }}>{children}</p>
);

const SPill: React.FC<{ color: "green" | "blue" | "red"; children: React.ReactNode }> = ({ color, children }) => {
  const map = {
    green: { bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.3)", c: T.green },
    blue:  { bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.3)", c: T.water },
    red:   { bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", c: T.red },
  }[color];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: "0.68rem", fontWeight: 600, padding: "2px 9px",
      borderRadius: "2rem", background: map.bg, border: `1px solid ${map.border}`, color: map.c,
    }}>{children}</span>
  );
};

type BtnVariant = "green" | "blue" | "ghost" | "red" | "emerald";
const SBtn: React.FC<{
  onClick?: () => void; disabled?: boolean;
  variant?: BtnVariant; full?: boolean; children: React.ReactNode;
}> = ({ onClick, disabled, variant = "ghost", full, children }) => {
  const map: Record<BtnVariant, { bg: string; c: string; b: string }> = {
    green:   { bg: "rgba(22,163,74,0.18)",  c: T.green,   b: "rgba(34,197,94,0.35)"  },
    blue:    { bg: "rgba(56,189,248,0.15)", c: T.water,   b: "rgba(56,189,248,0.3)"  },
    ghost:   { bg: "rgba(36,61,44,0.5)",    c: T.mist,    b: T.border                },
    red:     { bg: "rgba(220,38,38,0.15)",  c: T.red,     b: "rgba(220,38,38,0.3)"   },
    emerald: { bg: "rgba(5,150,105,0.2)",   c: "#34d399", b: "rgba(52,211,153,0.35)" },
  };
  const s = map[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      gap: 6, padding: "0.5rem 1rem", borderRadius: "0.75rem",
      border: `1px solid ${s.b}`, background: s.bg, color: s.c,
      fontSize: "0.8rem", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1, transition: "opacity .15s",
      width: full ? "50%" : undefined, flexShrink: 0,
    }}>{children}</button>
  );
};

// ─── Modal shell ──────────────────────────────────────────────────────────────
const SModalShell: React.FC<{
  open: boolean; onOpenChange: (v: boolean) => void;
  title: React.ReactNode; children: React.ReactNode;
  onClose?: () => void; maxWidth?: string;
}> = ({ open, onOpenChange, title, children, onClose, maxWidth = "980px" }) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(4,10,6,0.88)", backdropFilter: "blur(6px)",
      }} />
      <Dialog.Content style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: `min(95vw, ${maxWidth})`, maxHeight: "92vh", overflowY: "auto",
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: "1.25rem",
        boxShadow: "0 0 0 1px rgba(74,222,128,0.05),0 24px 64px rgba(0,0,0,0.75)",
        zIndex: 51, outline: "none",
      }}>
        {topLine}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.2rem 1.5rem 0.85rem",
          borderBottom: `1px solid rgba(46,80,57,0.5)`,
        }}>
          <Dialog.Title style={{
            margin: 0, fontSize: "1.1rem", fontWeight: 600,
            background: `linear-gradient(135deg, ${T.green}, ${T.water})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>{title}</Dialog.Title>
          <CloseBtn onClick={onClose} />
        </div>
        <div style={{ padding: "1.2rem 1.5rem 1.6rem" }}>{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const SeedAdoptionModal: React.FC<SeedAdoptionModalProps> = ({
  isOpen, onOpenChange,
  semillaId, semillaIdFactory, especie, responsable,
  latitud, longitud, temperatura, humedad, altitud,
  contratoIndividual, ciudad, precipitacion, horasLuz,
  comentarios, txHash, signer, chainId, nftAddress,
}) => {
  // ── Cámara ──────────────────────────────────────────────────────────────────
  const [isCameraActive,     setIsCameraActive]     = useState(false);
  const [capturedImageState, setCapturedImageState] = useState<string | null>(null);
  const [isRecording,        setIsRecording]        = useState(false);
  const [recordedVideo,      setRecordedVideo]      = useState<string | null>(null);
  const [showImageDialog,    setShowImageDialog]    = useState(false);
  const [showVideoPlayer,    setShowVideoPlayer]    = useState(false);
  const [isMobile,           setIsMobile]           = useState(false);

  // ── NFT ─────────────────────────────────────────────────────────────────────
  const [estadoNFT,      setEstadoNFT]      = useState<EstadoNFT>("idle");
  const [tokenIdAcunado, setTokenIdAcunado] = useState<number | null>(null);
  const [ipfsImageHash,  setIpfsImageHash]  = useState("");
  const [ipfsVideoHash,  setIpfsVideoHash]  = useState("");
  const [mensajeNFT,     setMensajeNFT]     = useState("");
  const [errorNFT,       setErrorNFT]       = useState("");

  // ── Nombre de la foto ────────────────────────────────────────────────────────
  const [nombreFoto,  setNombreFoto]  = useState("");
  const [errorNombre, setErrorNombre] = useState("");

  const videoRef         = useRef<HTMLVideoElement>(null);
  const canvasRef        = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const fileInputRef     = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () =>
      setIsMobile(window.innerWidth <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleDataAvailable = useCallback((e: BlobEvent) => {
    if (e.data.size > 0) chunksRef.current.push(e.data);
  }, []);

  const handleStop = useCallback(() => {
    setRecordedVideo(URL.createObjectURL(new Blob(chunksRef.current, { type: "video/webm" })));
    chunksRef.current = [];
  }, []);

  const activateCamera = useCallback(() => {
    if (isMobile) {
      fileInputRef.current?.click();
    } else {
      setIsCameraActive(true);
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = handleDataAvailable;
            mediaRecorderRef.current.onstop = handleStop;
          }
        })
        .catch((e) => console.error("Error cámara:", e));
    }
  }, [isMobile, handleDataAvailable, handleStop]);

  const deactivateCamera = useCallback(() => {
    setIsCameraActive(false);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  // Resetear estado al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      deactivateCamera();
      setCapturedImageState(null);
      setRecordedVideo(null);
      setEstadoNFT("idle");
      setTokenIdAcunado(null);
      setIpfsImageHash("");
      setIpfsVideoHash("");
      setMensajeNFT("");
      setErrorNFT("");
      setNombreFoto("");
      setErrorNombre("");
    }
  }, [isOpen, deactivateCamera]);

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        setCapturedImageState(canvasRef.current.toDataURL("image/png"));
        setEstadoNFT("idle");
        setTokenIdAcunado(null);
        setIpfsImageHash("");
      }
    }
  }, []);

  const handleMobileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCapturedImageState(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const startRecording  = useCallback(() => {
    if (mediaRecorderRef.current) { setIsRecording(true);  mediaRecorderRef.current.start(); }
  }, []);

  const stopRecording   = useCallback(() => {
    if (mediaRecorderRef.current) { setIsRecording(false); mediaRecorderRef.current.stop(); }
  }, []);

  const downloadImage = useCallback(() => {
    if (!capturedImageState) return;
    const a = document.createElement("a");
    a.href = capturedImageState;
    a.download = `semilla-${especie}-${semillaIdFactory}.png`;
    a.click();
  }, [capturedImageState, especie, semillaIdFactory]);

  const downloadVideo = useCallback(() => {
    if (!recordedVideo) return;
    const a = document.createElement("a");
    a.href = recordedVideo;
    a.download = `semilla-${especie}-${semillaIdFactory}.webm`;
    a.click();
  }, [recordedVideo, especie, semillaIdFactory]);

  // ── Validación nombre foto ───────────────────────────────────────────────────
  const NOMBRE_MAX   = 60;
  const NOMBRE_REGEX = /^[a-zA-Z0-9 _\-\.áéíóúÁÉÍÓÚàèìòùäëïöüñÑ]+$/;

  const validarNombre = (valor: string): string => {
    const v = valor.trim();
    if (!v)                    return "El nombre no puede estar vacío.";
    if (v.length > NOMBRE_MAX) return `Máximo ${NOMBRE_MAX} caracteres.`;
    if (!NOMBRE_REGEX.test(v)) return "Solo letras, números, espacios, guiones, puntos y guiones bajos.";
    return "";
  };

  const handleNombreFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNombreFoto(val);
    setErrorNombre(validarNombre(val));
  };

  // ── IPFS ─────────────────────────────────────────────────────────────────────
  const dataURLaBlob = (dataURL: string): Blob => {
    const [header, data] = dataURL.split(",");
    const mime = header.match(/:(.*?);/)![1];
    const bytes = atob(data);
    const arr   = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const subirArchivoIPFS = async (blob: Blob, nombre: string): Promise<string> => {
    const fd = new FormData();
    fd.append("file",   blob,   nombre);
    fd.append("nombre", nombre);
    const res = await fetch("/api/ipfs-upload", { method: "POST", body: fd });
    if (!res.ok) throw new Error(`Error subiendo a IPFS: ${await res.text()}`);
    const data = await res.json();
    if (!data.IpfsHash) throw new Error("Respuesta inesperada de IPFS");
    return data.IpfsHash;
  };

  const subirMetadataIPFS = async (imageHash: string, videoHash?: string): Promise<string> => {
    const fechaISO    = new Date().toISOString().split("T")[0];
    const externalUrl = contratoIndividual
      ? `https://sepolia.etherscan.io/address/${contratoIndividual}`
      : `https://vivero-frailejones.com/semilla/${semillaIdFactory}`;

    // Metadata diferenciada: "Adopción" en lugar de "Traslado"
    const metadata = {
      name:         `${especie} #${semillaIdFactory} — Adopción Páramo`,
      description:  `Certificado de adopción del páramo colombiano. ${especie} adoptada por ${responsable} el ${fechaISO}. Gemelo Digital: ${contratoIndividual}`,
      image:        `ipfs://${imageHash}`,
      ...(videoHash ? { animation_url: `ipfs://${videoHash}` } : {}),
      external_url: externalUrl,
      attributes: [
        { trait_type: "Tipo",              value: "Adopción"                                          },
        { trait_type: "Especie",           value: especie                                              },
        { trait_type: "ID Factory",        value: String(semillaIdFactory)                            },
        { trait_type: "ID Semilla",        value: String(semillaId)                                   },
        { trait_type: "Responsable",       value: responsable                                          },
        { trait_type: "Altitud (m)",       value: String(altitud)                                     },
        { trait_type: "Temperatura",       value: temperatura > 0 ? `${temperatura / 10}°C` : "Pendiente oráculo" },
        { trait_type: "Humedad",           value: humedad    > 0 ? `${humedad}%`            : "Pendiente oráculo" },
        { trait_type: "Latitud",           value: latitud.toFixed(6)                                  },
        { trait_type: "Longitud",          value: longitud.toFixed(6)                                 },
        { trait_type: "Fecha",             value: fechaISO                                             },
        { trait_type: "Gemelo Digital",    value: contratoIndividual                                  },
        { trait_type: "Verificado",        value: chainId === 11155111 ? "Chainlink Oracle" : "Manual"},
        { trait_type: "Tiene Video",       value: videoHash ? "Sí" : "No"                            },
      ],
    };

    const res = await fetch("/api/ipfs-upload", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        tipo:      "json",
        contenido: metadata,
        nombre:    `metadata-semilla-${semillaIdFactory}.json`,
      }),
    });
    if (!res.ok) throw new Error("Error subiendo metadata a IPFS");
    return (await res.json()).IpfsHash;
  };

  // ── Acuñar NFT ───────────────────────────────────────────────────────────────
  const crearNFT = async () => {
    if (!capturedImageState) { setErrorNFT("❌ Primero toma una foto de la semilla."); return; }
    if (!signer)             { setErrorNFT("❌ Conecta tu wallet primero."); return; }
    const nftContratoAddress = nftAddress || NFT_ADDRESSES[chainId];
    if (!nftContratoAddress) { setErrorNFT("❌ Contrato NFT no configurado. Revisa tu .env"); return; }

    setErrorNFT("");
    try {
      // ── 1. Subir foto ──────────────────────────────────────────────────────
      setEstadoNFT("subiendo_foto");
      setMensajeNFT("📤 Subiendo foto a IPFS...");
      const nombreBase = nombreFoto.trim() || `semilla-${especie}-${semillaIdFactory}`;
      const imageHash  = await subirArchivoIPFS(dataURLaBlob(capturedImageState), `${nombreBase}.png`);
      setIpfsImageHash(imageHash);
      setMensajeNFT(`✅ Foto subida: ${imageHash.slice(0, 12)}...`);

      // ── 2. Subir video (opcional) ──────────────────────────────────────────
      let videoHash = "";
      if (recordedVideo) {
        setEstadoNFT("subiendo_video");
        setMensajeNFT("📤 Subiendo video a IPFS...");
        videoHash = await subirArchivoIPFS(
          await fetch(recordedVideo).then((r) => r.blob()),
          `video-${especie}-${semillaIdFactory}.webm`
        );
        setIpfsVideoHash(videoHash);
        setMensajeNFT(`✅ Video subido: ${videoHash.slice(0, 12)}...`);
      }

      // ── 3. Subir metadata ──────────────────────────────────────────────────
      setEstadoNFT("subiendo_meta");
      setMensajeNFT("📤 Subiendo metadata...");
      const metadataHash = await subirMetadataIPFS(imageHash, videoHash || undefined);
      setMensajeNFT(`✅ Metadata: ${metadataHash.slice(0, 12)}...`);

      // ── 4. Mintear en blockchain ───────────────────────────────────────────
      setEstadoNFT("minteando");
      setMensajeNFT("⛓️ Acuñando NFT en blockchain...");

      const nftContrato  = new ethers.Contract(nftContratoAddress, nftABI, signer);
      const walletAddress = await signer.getAddress();

      // Escalar coordenadas a int256 × 1_000_000
      const latScaled = Number.isInteger(latitud)  ? latitud  : Math.round(latitud  * 1_000_000);
      const lonScaled = Number.isInteger(longitud) ? longitud : Math.round(longitud * 1_000_000);
      const tempInt   = Math.round(temperatura);
      const humInt    = Math.round(humedad);
      const altInt    = Math.round(altitud);

      const tx = await nftContrato.acunarNFT(
        walletAddress,
        `ipfs://${metadataHash}`,
        semillaIdFactory,            // idPlanta = ID Factory
        Number(semillaId ?? 0),      // idSemilla = ID Vivero
        especie,
        responsable,
        latScaled,
        lonScaled,
        tempInt,
        humInt,
        altInt,
        imageHash
      );

      setMensajeNFT("⏳ Esperando confirmación...");
      const receipt = await tx.wait();

      const evento = receipt.logs
        .map((log: unknown) => {
          try { return nftContrato.interface.parseLog(log as { topics: string[]; data: string }); }
          catch { return null; }
        })
        .find((e: { name: string } | null) => e?.name === "NFTAcunado");

      const nuevoTokenId = evento ? Number(evento.args.tokenId) : null;
      setTokenIdAcunado(nuevoTokenId);
      setEstadoNFT("listo");
      setMensajeNFT(`🎉 ¡NFT #${nuevoTokenId} acuñado con éxito!`);

    } catch (error: unknown) {
      setEstadoNFT("error");
      setErrorNFT(`❌ ${error instanceof Error ? error.message : "Error desconocido"}`);
    }
  };

  const botonDeshabilitado =
    !capturedImageState || !signer || !!errorNombre ||
    ["subiendo_foto","subiendo_meta","subiendo_video","minteando","listo"].includes(estadoNFT);

  const textoBoton = () => ({
    subiendo_foto:  "Subiendo foto...",
    subiendo_video: "Subiendo video...",
    subiendo_meta:  "Preparando metadata...",
    minteando:      "Acuñando NFT...",
    listo:          "NFT Creado ✓",
    error:          "Crear NFT de esta semilla",
    idle:           "Crear NFT de esta semilla",
  }[estadoNFT]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <SModalShell
        open={isOpen} onOpenChange={onOpenChange} onClose={deactivateCamera}
        title={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sprout size={17} />
            Adopción #{semillaIdFactory} — {especie}
          </span>
        }
      >
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
          onChange={handleMobileCapture} style={{ display: "none" }} />

        {/* Badge Gemelo Digital */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem",
          padding: "0.5rem 0.9rem", borderRadius: "0.75rem",
          background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)",
        }}>
          <Leaf size={13} color={T.water} />
          <span style={{ fontSize: "0.72rem", color: T.water, fontWeight: 600 }}>Gemelo Digital:</span>
          <code style={{ fontSize: "0.7rem", color: T.mist, fontFamily: "monospace" }}>
            {contratoIndividual.slice(0, 10)}…{contratoIndividual.slice(-6)}
          </code>
          {chainId === 11155111 && (
            <a href={`https://sepolia.etherscan.io/address/${contratoIndividual}`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: T.water, display: "flex", alignItems: "center", gap: 3, fontSize: "0.7rem" }}>
              <ExternalLink size={11} /> Ver
            </a>
          )}
        </div>

        {/* Grid: cámara | info semilla */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.1rem" }}
          className="sam-grid">
          <style>{`@media(min-width:600px){.sam-grid{grid-template-columns:1fr 1fr!important}}`}</style>

          {/* ── Panel cámara ── */}
          <div style={{
            background: "rgba(13,26,18,0.7)", border: `1px solid ${T.border}`,
            borderRadius: "1rem", padding: "1rem",
            display: "flex", flexDirection: "column", gap: "0.75rem",
          }}>
            <SLabel>Registro Visual de la Semilla</SLabel>

            {!isCameraActive || isMobile ? (
              <SBtn onClick={activateCamera} variant="green" full>
                <Camera size={15} />{isMobile ? "Tomar Foto" : "Activar Cámara"}
              </SBtn>
            ) : (
              <>
                {/* Visor */}
                <div style={{
                  aspectRatio: "16/9", borderRadius: "0.75rem", overflow: "hidden",
                  background: "#000", border: `1px solid ${T.border}`, position: "relative",
                }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {isRecording && (
                    <div style={{
                      position: "absolute", top: 8, left: 8,
                      display: "flex", alignItems: "center", gap: 5,
                      background: "rgba(220,38,38,0.88)", borderRadius: "2rem",
                      padding: "2px 9px", fontSize: "0.68rem", fontWeight: 700, color: "#fff",
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                      REC
                    </div>
                  )}
                </div>

                {/* Fila 1: capturar | grabar */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <SBtn onClick={captureImage} variant="green" full>
                    <Camera size={13} />Foto
                  </SBtn>
                  <SBtn onClick={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "red" : "ghost"} full>
                    {isRecording ? <><Square size={12} />Detener</> : <><Play size={12} />Grabar</>}
                  </SBtn>
                </div>

                {/* Separador */}
                <div style={{
                  height: 1,
                  background: `linear-gradient(90deg, transparent, ${T.border} 30%, ${T.border} 70%, transparent)`,
                  margin: "0.1rem 0",
                }} />

                {/* Fila 2: ver resultados */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <SBtn onClick={() => setShowImageDialog(true)} disabled={!capturedImageState} variant="blue" full>
                    <Eye size={13} />Ver Foto
                  </SBtn>
                  <SBtn onClick={() => setShowVideoPlayer(true)} disabled={!recordedVideo} variant="ghost" full>
                    <Video size={13} />Ver Video
                  </SBtn>
                </div>

                {/* Indicadores */}
                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  {capturedImageState && <SPill color="green"><ImageIcon size={10} />Foto lista</SPill>}
                  {recordedVideo      && <SPill color="blue"><Video size={10} />Video listo</SPill>}
                </div>
              </>
            )}

            {/* ── Sección NFT (aparece cuando hay foto) ── */}
            {capturedImageState && (
              <div style={{
                marginTop: "0.5rem", paddingTop: "0.85rem",
                borderTop: `1px solid rgba(46,80,57,0.5)`,
                display: "flex", flexDirection: "column", gap: "0.65rem",
              }}>
                <SLabel>Certificar Adopción en Blockchain</SLabel>

                {/* Preview */}
                <div style={{
                  borderRadius: "0.65rem", overflow: "hidden",
                  border: `1px solid ${T.border}`, position: "relative",
                }}>
                  <img src={capturedImageState} alt="NFT preview"
                    style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
                  <div style={{
                    position: "absolute", bottom: 0, left: 0, right: 0,
                    background: "rgba(13,26,18,0.85)", padding: "3px 8px",
                    fontSize: "0.65rem", color: T.mist, display: "flex", gap: 8,
                  }}>
                    <span>Esta foto será tu NFT de adopción</span>
                    {recordedVideo && <SPill color="blue"><Video size={9} />Video ✓</SPill>}
                    <SPill color="green"><Leaf size={9} />Gemelo ✓</SPill>
                  </div>
                </div>

                {/* Campo nombre */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label style={{
                    fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em",
                    color: T.green, textTransform: "uppercase",
                  }}>🏷️ Bautizar foto</label>
                  <input
                    type="text"
                    value={nombreFoto}
                    onChange={handleNombreFoto}
                    placeholder={`semilla-${especie}-${semillaIdFactory}`}
                    maxLength={60}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "0.45rem 0.7rem", borderRadius: "0.65rem",
                      border: `1px solid ${errorNombre ? "rgba(248,113,113,0.6)" : "rgba(74,222,128,0.25)"}`,
                      background: "rgba(13,26,18,0.8)",
                      color: "#e2f5e9", fontSize: "0.8rem", outline: "none", fontFamily: "monospace",
                    }}
                  />
                  {errorNombre && (
                    <p style={{ margin: 0, fontSize: "0.68rem", color: T.red }}>⚠️ {errorNombre}</p>
                  )}
                  <p style={{ margin: 0, fontSize: "0.63rem", color: T.mist, opacity: 0.6 }}>
                    Opcional — letras, números, espacios, guiones y puntos. Máx. 60 chars.
                  </p>
                </div>

                {/* Aviso si el oráculo aún no respondió */}
                {temperatura === 0 && humedad === 0 && (
                  <div style={{
                    padding: "0.45rem 0.7rem", borderRadius: "0.6rem", fontSize: "0.7rem",
                    background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.2)",
                    color: T.water,
                  }}>
                    🌡️ El oráculo climático aún está inyectando datos. Si minteas ahora, el NFT usará 0°C / 0% — espera unos segundos y el modal se actualizará automáticamente.
                  </div>
                )}

                <SBtn onClick={crearNFT} disabled={botonDeshabilitado}
                  variant={estadoNFT === "listo" ? "green" : "emerald"} full>
                  <Sparkles size={14} />{textoBoton()}
                </SBtn>

                {mensajeNFT && (
                  <div style={{
                    padding: "0.6rem 0.75rem", borderRadius: "0.65rem", fontSize: "0.75rem",
                    background: estadoNFT === "listo"
                      ? "rgba(74,222,128,0.1)" : estadoNFT === "error"
                      ? "rgba(248,113,113,0.1)" : "rgba(56,189,248,0.08)",
                    border: `1px solid ${estadoNFT === "listo" ? "rgba(74,222,128,0.25)"
                      : estadoNFT === "error" ? "rgba(248,113,113,0.25)" : "rgba(56,189,248,0.2)"}`,
                    color: estadoNFT === "listo" ? T.green : estadoNFT === "error" ? T.red : T.water,
                    whiteSpace: "pre-line",
                  }}>{mensajeNFT}</div>
                )}

                {errorNFT && (
                  <div style={{
                    padding: "0.6rem 0.75rem", borderRadius: "0.65rem", fontSize: "0.75rem",
                    background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
                    color: T.red,
                  }}>{errorNFT}</div>
                )}

                {estadoNFT === "listo" && tokenIdAcunado !== null && (
                  <div style={{
                    padding: "0.75rem", borderRadius: "0.75rem",
                    background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)",
                    display: "flex", flexDirection: "column", gap: "0.4rem",
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.85rem", color: T.green }}>
                      🎉 NFT #{tokenIdAcunado} creado
                    </p>
                    <p style={{ margin: 0, fontSize: "0.7rem", color: T.mist }}>
                      📷 Imagen: <code style={{ fontFamily: "monospace", color: T.green }}>{ipfsImageHash.slice(0, 18)}…</code>
                    </p>
                    {ipfsVideoHash && (
                      <p style={{ margin: 0, fontSize: "0.7rem", color: T.mist }}>
                        🎬 Video: <code style={{ fontFamily: "monospace", color: T.water }}>{ipfsVideoHash.slice(0, 18)}…</code>
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: 2 }}>
                      {chainId === 11155111 && (
                        <a href={`https://testnets.opensea.io/assets/sepolia/${nftAddress || NFT_ADDRESSES[chainId]}/${tokenIdAcunado}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.7rem", color: T.water }}>
                          <ExternalLink size={11} />OpenSea Testnet
                        </a>
                      )}
                      <a href={`https://gateway.pinata.cloud/ipfs/${ipfsImageHash}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.7rem", color: T.mist }}>
                        <ExternalLink size={11} />Ver en IPFS
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
            <canvas ref={canvasRef} width={640} height={480} style={{ display: "none" }} />
          </div>

          {/* ── Panel info semilla ── */}
          <div style={{
            background: "rgba(13,26,18,0.7)", border: `1px solid ${T.border}`,
            borderRadius: "1rem", overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            {/* Hero foto / placeholder */}
            <div style={{ position: "relative", height: 180, flexShrink: 0 }}>
              {capturedImageState ? (
                <img src={capturedImageState} alt="Semilla"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{
                  width: "100%", height: "100%", background: "rgba(36,61,44,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Sprout size={36} color="rgba(74,222,128,0.3)" />
                </div>
              )}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(13,26,18,0.9) 0%, transparent 55%)",
              }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0.75rem" }}>
                <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#e2f5e9" }}>{especie}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.68rem", color: T.mist, opacity: 0.7 }}>
                  {chainId === 11155111 ? "Sepolia Testnet 🔵" : "Hardhat Local 🟢"}
                </p>
              </div>
            </div>

            {/* Datos de la adopción */}
            <div style={{ padding: "0.9rem 1rem", display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
              <SLabel>Datos de la Adopción</SLabel>
              {([
                ["ID Factory",      `#${semillaIdFactory}`],
                ["ID Vivero",       `#${semillaId ?? "—"}`],
                ["ID Semilla",      `#${semillaId ?? "—"}`],
                ["Especie",         especie],
                ["Responsable",     responsable],
                ["Estado",          "Semilla"],
                ["Altitud",         `${altitud} msnm`],
                ["Latitud",         latitud.toFixed(6)],
                ["Longitud",        longitud.toFixed(6)],
                ["Temp.",           temperatura > 0 ? `${temperatura / 10}°C`       : "⏳ oráculo..."],
                ["Temperatura",     temperatura > 0 ? `${temperatura / 10}°C`       : "⏳ oráculo..."],
                ["Humedad",         humedad > 0     ? `${humedad}%`                 : "⏳ oráculo..."],
                ["Precipitación",   precipitacion > 0 ? `${precipitacion / 10} mm` : "⏳ oráculo..."],
                ["Horas luz solar", horasLuz > 0    ? `${horasLuz} h`              : "⏳ oráculo..."],
                ["Ciudad",          ciudad || "⏳ oráculo..."],
                ["Gemelo",          `${contratoIndividual.slice(0,10)}…${contratoIndividual.slice(-6)}`],
                ["Tx",              txHash ? `${txHash.slice(0,10)}…${txHash.slice(-6)}` : "—"],
                ["Comentarios",     comentarios || "—"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.3rem 0", borderBottom: `1px solid rgba(46,80,57,0.35)`,
                  fontSize: "0.78rem",
                }}>
                  <span style={{ color: T.mist, opacity: 0.7 }}>{k}</span>
                  <span style={{ color: "#e2f5e9", fontWeight: 600, fontFamily: "monospace" }}>{v}</span>
                </div>
              ))}
              <div style={{
                marginTop: "0.4rem", padding: "0.45rem 0.6rem", borderRadius: "0.5rem",
                background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.18)",
              }}>
                <p style={{ margin: 0, fontSize: "0.65rem", color: T.water }}>
                  🌱 Gemelo: <code style={{ fontFamily: "monospace" }}>
                    {contratoIndividual.slice(0, 10)}…{contratoIndividual.slice(-6)}
                  </code>
                </p>
              </div>
            </div>
          </div>
        </div>
      </SModalShell>

      {/* Sub-modal: imagen */}
      <SModalShell open={showImageDialog} onOpenChange={setShowImageDialog}
        title="Imagen capturada" maxWidth="700px">
        {capturedImageState && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ borderRadius: "0.85rem", overflow: "hidden", border: `1px solid ${T.border}`, background: "#000" }}>
              <img src={capturedImageState} alt="Semilla"
                style={{ width: "100%", maxHeight: "60vh", objectFit: "contain", display: "block" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <SBtn onClick={downloadImage} variant="green"><Download size={13} />Descargar imagen</SBtn>
            </div>
          </div>
        )}
      </SModalShell>

      {/* Sub-modal: video */}
      <SModalShell open={showVideoPlayer} onOpenChange={setShowVideoPlayer}
        title="Video grabado" maxWidth="700px">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ borderRadius: "0.85rem", overflow: "hidden", border: `1px solid ${T.border}`, background: "#000" }}>
            <video src={recordedVideo ?? undefined} controls style={{ width: "100%", display: "block" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <SBtn onClick={downloadVideo} variant="blue"><Download size={13} />Descargar video</SBtn>
          </div>
        </div>
      </SModalShell>
    </>
  );
};

export default SeedAdoptionModal;
