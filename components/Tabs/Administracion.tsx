import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Lock, Unlock, UserPlus, UserMinus, Trash } from 'lucide-react';
import { ViveroInterface } from '../EcoChainComponent';
import { ResultCardSimple } from "@/components/ui/ResultCard";

interface AdministracionProps {
    contract: ViveroInterface | null;
    setResultado: React.Dispatch<React.SetStateAction<string>>;
    setGasEstimate: React.Dispatch<React.SetStateAction<string>>;
    actualizarEstadisticasParamo: () => Promise<void>;
    language: 'es' | 'en' | 'fr' | 'de';
    chainId?: number;
}

// ── Tipo de resultado por sección ─────────────────────────────────────────────
interface InlineResult { ok: boolean; msg: string; tx?: string; }

// ── Adaptador: convierte el resultado simple de Admin al ResultCardSimple ─────
const InlineResult: React.FC<{ data: InlineResult | null; variant?: "admin" | "danger" }> = ({
  data, variant = "admin",
}) => {
  if (!data) return null;
  return (
    <ResultCardSimple
      result={{ ok: data.ok, msg: data.msg, txHash: data.tx }}
      variant={variant}
    />
  );
};

// ── DarkSection — wrapper glassmorphism unificado ────────────
const DS_TOKENS: Record<string, { accent: string; border: string; bg: string; titleColor: string }> = {
  purple:  { accent: "#a78bfa", border: "rgba(139,92,246,0.22)",  bg: "rgba(139,92,246,0.06)",  titleColor: "#c4b5fd" },
  orange:  { accent: "#fb923c", border: "rgba(249,115,22,0.22)",  bg: "rgba(249,115,22,0.06)",  titleColor: "#fdba74" },
  emerald: { accent: "#34d399", border: "rgba(52,211,153,0.22)",  bg: "rgba(52,211,153,0.06)",  titleColor: "#6ee7b7" },
  sky:     { accent: "#38bdf8", border: "rgba(56,189,248,0.22)",  bg: "rgba(56,189,248,0.06)",  titleColor: "#7dd3fc" },
  amber:   { accent: "#fbbf24", border: "rgba(245,158,11,0.22)",  bg: "rgba(245,158,11,0.06)",  titleColor: "#fde68a" },
  slate:   { accent: "#94a3b8", border: "rgba(100,116,139,0.22)", bg: "rgba(100,116,139,0.06)", titleColor: "#cbd5e1" },
  blue:    { accent: "#60a5fa", border: "rgba(96,165,250,0.22)",  bg: "rgba(96,165,250,0.06)",  titleColor: "#93c5fd" },
  rose:    { accent: "#fb7185", border: "rgba(251,113,133,0.22)", bg: "rgba(251,113,133,0.06)", titleColor: "#fda4af" },
  red:     { accent: "#f87171", border: "rgba(248,113,113,0.22)", bg: "rgba(248,113,113,0.06)", titleColor: "#fca5a5" },
};

const DarkSection: React.FC<{
  color: keyof typeof DS_TOKENS;
  icon: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ color, icon, title, children, className = "" }) => {
  const tk = DS_TOKENS[color] ?? DS_TOKENS.slate;
  return (
    <div className={className} style={{
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


const Administracion: React.FC<AdministracionProps> = ({ contract, setResultado, language }) => {
    const [newOwnerAddress,   setNewOwnerAddress]   = useState('');
    const [isPaused,          setIsPaused]          = useState(false);
    const [newAdminAddress,   setNewAdminAddress]   = useState('');
    const [removeAdminAddress, setRemoveAdminAddress] = useState('');

    // Resultados inline por sección
    const [resultTransfer,    setResultTransfer]    = useState<InlineResult | null>(null);
    const [resultPause,       setResultPause]       = useState<InlineResult | null>(null);
    const [resultAddAdmin,    setResultAddAdmin]    = useState<InlineResult | null>(null);
    const [resultRemoveAdmin, setResultRemoveAdmin] = useState<InlineResult | null>(null);
    const [resultDelSeed,     setResultDelSeed]     = useState<InlineResult | null>(null);
    const [resultDelPlant,    setResultDelPlant]    = useState<InlineResult | null>(null);

    const translations = {
        es: {
            transferOwnership: "Transferir Propiedad",
            newOwnerAddress: "Nueva Dirección del Propietario",
            transferButton: "Transferir Propiedad",
            pauseUnpauseContract: "Pausar / Despausar Contrato",
            pauseButton: "Pausar Contrato",
            unpauseButton: "Despausar Contrato",
            addAdmin: "Agregar Administrador",
            newAdminAddress: "Dirección del Nuevo Administrador",
            addAdminButton: "Agregar Administrador",
            removeAdmin: "Remover Administrador",
            removeAdminAddress: "Dirección del Administrador a Remover",
            removeAdminButton: "Remover Administrador",
            deleteSeed: "Eliminar Semilla",
            seedId: "ID de la Semilla",
            deleteSeedButton: "Eliminar Semilla",
            deletePlant: "Eliminar Planta",
            plantId: "ID de la Planta",
            deletePlantButton: "Eliminar Planta",
            successTransfer: "✅ Propiedad transferida exitosamente",
            errorTransfer: "❌ Error al transferir la propiedad:",
            successPause: "✅ Contrato pausado exitosamente",
            errorPause: "❌ Error al pausar el contrato:",
            successUnpause: "✅ Contrato despausado exitosamente",
            errorUnpause: "❌ Error al despausar el contrato:",
            successAddAdmin: "✅ Administrador agregado exitosamente",
            errorAddAdmin: "❌ Error al agregar administrador:",
            successRemoveAdmin: "✅ Administrador removido exitosamente",
            errorRemoveAdmin: "❌ Error al remover administrador:",
            successDeleteSeed: "✅ Semilla eliminada exitosamente",
            errorDeleteSeed: "❌ Error al eliminar la semilla:",
            successDeletePlant: "✅ Planta eliminada exitosamente",
            errorDeletePlant: "❌ Error al eliminar la planta:",
        },
        en: {
            transferOwnership: "Transfer Ownership",
            newOwnerAddress: "New Owner Address",
            transferButton: "Transfer Ownership",
            pauseUnpauseContract: "Pause / Unpause Contract",
            pauseButton: "Pause Contract",
            unpauseButton: "Unpause Contract",
            addAdmin: "Add Administrator",
            newAdminAddress: "New Administrator Address",
            addAdminButton: "Add Administrator",
            removeAdmin: "Remove Administrator",
            removeAdminAddress: "Administrator Address to Remove",
            removeAdminButton: "Remove Administrator",
            deleteSeed: "Delete Seed",
            seedId: "Seed ID",
            deleteSeedButton: "Delete Seed",
            deletePlant: "Delete Plant",
            plantId: "Plant ID",
            deletePlantButton: "Delete Plant",
            successTransfer: "✅ Ownership transferred successfully",
            errorTransfer: "❌ Error transferring ownership:",
            successPause: "✅ Contract paused successfully",
            errorPause: "❌ Error pausing the contract:",
            successUnpause: "✅ Contract unpaused successfully",
            errorUnpause: "❌ Error unpausing the contract:",
            successAddAdmin: "✅ Administrator added successfully",
            errorAddAdmin: "❌ Error adding administrator:",
            successRemoveAdmin: "✅ Administrator removed successfully",
            errorRemoveAdmin: "❌ Error removing administrator:",
            successDeleteSeed: "✅ Seed deleted successfully",
            errorDeleteSeed: "❌ Error deleting the seed:",
            successDeletePlant: "✅ Plant deleted successfully",
            errorDeletePlant: "❌ Error deleting the plant:",
        },
        fr: {
            transferOwnership: "Transférer la Propriété",
            newOwnerAddress: "Nouvelle Adresse du Propriétaire",
            transferButton: "Transférer la Propriété",
            pauseUnpauseContract: "Mettre en Pause / Reprendre",
            pauseButton: "Mettre en Pause",
            unpauseButton: "Reprendre le Contrat",
            addAdmin: "Ajouter un Administrateur",
            newAdminAddress: "Adresse du Nouvel Administrateur",
            addAdminButton: "Ajouter l'Administrateur",
            removeAdmin: "Supprimer un Administrateur",
            removeAdminAddress: "Adresse de l'Administrateur à Supprimer",
            removeAdminButton: "Supprimer l'Administrateur",
            deleteSeed: "Supprimer une Graine",
            seedId: "ID de la Graine",
            deleteSeedButton: "Supprimer la Graine",
            deletePlant: "Supprimer une Plante",
            plantId: "ID de la Plante",
            deletePlantButton: "Supprimer la Plante",
            successTransfer: "✅ Propriété transférée avec succès",
            errorTransfer: "❌ Erreur lors du transfert:",
            successPause: "✅ Contrat mis en pause",
            errorPause: "❌ Erreur lors de la pause:",
            successUnpause: "✅ Contrat repris avec succès",
            errorUnpause: "❌ Erreur lors de la reprise:",
            successAddAdmin: "✅ Administrateur ajouté avec succès",
            errorAddAdmin: "❌ Erreur lors de l'ajout:",
            successRemoveAdmin: "✅ Administrateur supprimé avec succès",
            errorRemoveAdmin: "❌ Erreur lors de la suppression:",
            successDeleteSeed: "✅ Graine supprimée avec succès",
            errorDeleteSeed: "❌ Erreur lors de la suppression:",
            successDeletePlant: "✅ Plante supprimée avec succès",
            errorDeletePlant: "❌ Erreur lors de la suppression:",
        },
        de: {
            transferOwnership: "Eigentum übertragen",
            newOwnerAddress: "Neue Eigentümeradresse",
            transferButton: "Eigentum übertragen",
            pauseUnpauseContract: "Vertrag pausieren / fortsetzen",
            pauseButton: "Vertrag pausieren",
            unpauseButton: "Vertrag fortsetzen",
            addAdmin: "Administrator hinzufügen",
            newAdminAddress: "Adresse des neuen Administrators",
            addAdminButton: "Administrator hinzufügen",
            removeAdmin: "Administrator entfernen",
            removeAdminAddress: "Zu entfernende Administratoradresse",
            removeAdminButton: "Administrator entfernen",
            deleteSeed: "Samen löschen",
            seedId: "Samen-ID",
            deleteSeedButton: "Samen löschen",
            deletePlant: "Pflanze löschen",
            plantId: "Pflanzen-ID",
            deletePlantButton: "Pflanze löschen",
            successTransfer: "✅ Eigentum erfolgreich übertragen",
            errorTransfer: "❌ Fehler beim Übertragen:",
            successPause: "✅ Vertrag erfolgreich pausiert",
            errorPause: "❌ Fehler beim Pausieren:",
            successUnpause: "✅ Vertrag erfolgreich fortgesetzt",
            errorUnpause: "❌ Fehler beim Fortsetzen:",
            successAddAdmin: "✅ Administrator erfolgreich hinzugefügt",
            errorAddAdmin: "❌ Fehler beim Hinzufügen:",
            successRemoveAdmin: "✅ Administrator erfolgreich entfernt",
            errorRemoveAdmin: "❌ Fehler beim Entfernen:",
            successDeleteSeed: "✅ Samen erfolgreich gelöscht",
            errorDeleteSeed: "❌ Fehler beim Löschen:",
            successDeletePlant: "✅ Pflanze erfolgreich gelöscht",
            errorDeletePlant: "❌ Fehler beim Löschen:",
        },
    };

    const t = translations[language];

    // ── Handlers ───────────────────────────────────────────────────────────────

    const transferirPropiedad = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!contract) return;
        setResultTransfer(null);
        try {
            const tx = await contract.transferirPropiedad(newOwnerAddress);
            await tx.wait();
            setResultTransfer({ ok: true, msg: t.successTransfer, tx: tx.hash });
            setResultado(t.successTransfer);
        } catch (err) {
            setResultTransfer({ ok: false, msg: t.errorTransfer + ' ' + (err as Error).message });
            setResultado(t.errorTransfer + ' ' + (err as Error).message);
        }
    };

    const pausarContrato = async () => {
        if (!contract) return;
        setResultPause(null);
        try {
            const tx = await contract.pausar();
            await tx.wait();
            setIsPaused(true);
            setResultPause({ ok: true, msg: t.successPause, tx: tx.hash });
            setResultado(t.successPause);
        } catch (err) {
            setResultPause({ ok: false, msg: t.errorPause + ' ' + (err as Error).message });
            setResultado(t.errorPause + ' ' + (err as Error).message);
        }
    };

    const despausarContrato = async () => {
        if (!contract) return;
        setResultPause(null);
        try {
            const tx = await contract.despausar();
            await tx.wait();
            setIsPaused(false);
            setResultPause({ ok: true, msg: t.successUnpause, tx: tx.hash });
            setResultado(t.successUnpause);
        } catch (err) {
            setResultPause({ ok: false, msg: t.errorUnpause + ' ' + (err as Error).message });
            setResultado(t.errorUnpause + ' ' + (err as Error).message);
        }
    };

    const agregarAdministrador = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!contract) return;
        setResultAddAdmin(null);
        try {
            const tx = await contract.agregarAdministrador(newAdminAddress);
            await tx.wait();
            setResultAddAdmin({ ok: true, msg: t.successAddAdmin, tx: tx.hash });
            setResultado(t.successAddAdmin);
            setNewAdminAddress('');
        } catch (err) {
            setResultAddAdmin({ ok: false, msg: t.errorAddAdmin + ' ' + (err as Error).message });
            setResultado(t.errorAddAdmin + ' ' + (err as Error).message);
        }
    };

    const removerAdministrador = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!contract) return;
        setResultRemoveAdmin(null);
        try {
            const tx = await contract.removerAdministrador(removeAdminAddress);
            await tx.wait();
            setResultRemoveAdmin({ ok: true, msg: t.successRemoveAdmin, tx: tx.hash });
            setResultado(t.successRemoveAdmin);
            setRemoveAdminAddress('');
        } catch (err) {
            setResultRemoveAdmin({ ok: false, msg: t.errorRemoveAdmin + ' ' + (err as Error).message });
            setResultado(t.errorRemoveAdmin + ' ' + (err as Error).message);
        }
    };

    const eliminarSemilla = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!contract) return;
        setResultDelSeed(null);
        try {
            const fd = new FormData(e.currentTarget);
            const id = parseInt(fd.get('idSemilla') as string);
            const tx = await contract.eliminarSemilla(id);
            await tx.wait();
            setResultDelSeed({ ok: true, msg: t.successDeleteSeed, tx: tx.hash });
            setResultado(t.successDeleteSeed);
        } catch (err) {
            setResultDelSeed({ ok: false, msg: t.errorDeleteSeed + ' ' + (err as Error).message });
            setResultado(t.errorDeleteSeed + ' ' + (err as Error).message);
        }
    };

    const eliminarPlanta = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!contract) return;
        setResultDelPlant(null);
        try {
            const fd = new FormData(e.currentTarget);
            const id = parseInt(fd.get('idPlanta') as string);
            const tx = await contract.eliminarPlanta(id);
            await tx.wait();
            setResultDelPlant({ ok: true, msg: t.successDeletePlant, tx: tx.hash });
            setResultado(t.successDeletePlant);
        } catch (err) {
            setResultDelPlant({ ok: false, msg: t.errorDeletePlant + ' ' + (err as Error).message });
            setResultado(t.errorDeletePlant + ' ' + (err as Error).message);
        }
    };

    // ── JSX ────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4 md:space-y-6 pt-2 md:pt-0">

            {/* 👇── Card 1: Transferir Propiedad ───────────────────────────👇 */}
            <DarkSection color="slate" icon={<Users size={16} />} title={t.transferOwnership}>
                <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#334155]/65 border border-[#94a3b8]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
                    <form onSubmit={transferirPropiedad} className="space-y-3">
                        <div>
                            <Label htmlFor="newOwnerAddress">{t.newOwnerAddress}</Label>
                            <Input
                                id="newOwnerAddress"
                                value={newOwnerAddress}
                                onChange={(e) => setNewOwnerAddress(e.target.value)}
                                placeholder="0x..."
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-slate-700 hover:bg-slate-800 text-white">
                            <Users className="mr-2 h-4 w-4" /> {t.transferButton}
                        </Button>
                        <InlineResult data={resultTransfer} />
                    </form>
                </div>
            </DarkSection>
            {/* 👆───────────────────────────────────────────────────────────👆 */}


            {/* 👇── Card 2: Pausar / Despausar Contrato ────────────────────👇 */}
            <DarkSection color="orange" icon={<Lock size={16} />} title={t.pauseUnpauseContract}>
                <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#431407]/65 border border-[#fb923c]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
                    <div className="flex gap-2">
                        <Button
                            onClick={pausarContrato}
                            disabled={isPaused}
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-40"
                        >
                            <Lock className="mr-2 h-4 w-4" /> {t.pauseButton}
                        </Button>
                        <Button
                            onClick={despausarContrato}
                            disabled={!isPaused}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-40"
                        >
                            <Unlock className="mr-2 h-4 w-4" /> {t.unpauseButton}
                        </Button>
                    </div>
                    <InlineResult data={resultPause} />
                </div>
            </DarkSection>
            {/* 👆───────────────────────────────────────────────────────────👆 */}


            {/* 👇── Card 3: Agregar Administrador ──────────────────────────👇 */}
            <DarkSection color="blue" icon={<UserPlus size={16} />} title={t.addAdmin}>
                <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#1e3a8a]/65 border border-[#3b82f6]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
                    <form onSubmit={agregarAdministrador} className="space-y-3">
                        <div>
                            <Label htmlFor="newAdminAddress">{t.newAdminAddress}</Label>
                            <Input
                                id="newAdminAddress"
                                value={newAdminAddress}
                                onChange={(e) => setNewAdminAddress(e.target.value)}
                                placeholder="0x..."
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            <UserPlus className="mr-2 h-4 w-4" /> {t.addAdminButton}
                        </Button>
                        <InlineResult data={resultAddAdmin} />
                    </form>
                </div>
            </DarkSection>
            {/* 👆───────────────────────────────────────────────────────────👆 */}


            {/* 👇── Card 4: Remover Administrador ──────────────────────────👇 */}
            <DarkSection color="rose" icon={<UserMinus size={16} />} title={t.removeAdmin}>
                <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#4c0519]/65 border border-[#f43f5e]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
                    <form onSubmit={removerAdministrador} className="space-y-3">
                        <div>
                            <Label htmlFor="removeAdminAddress">{t.removeAdminAddress}</Label>
                            <Input
                                id="removeAdminAddress"
                                value={removeAdminAddress}
                                onChange={(e) => setRemoveAdminAddress(e.target.value)}
                                placeholder="0x..."
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white">
                            <UserMinus className="mr-2 h-4 w-4" /> {t.removeAdminButton}
                        </Button>
                        <InlineResult data={resultRemoveAdmin} />
                    </form>
                </div>
            </DarkSection>
            {/* 👆───────────────────────────────────────────────────────────👆 */}


            {/* 👇── Card 5: Eliminar Semilla ───────────────────────────────👇 */}
            <DarkSection color="red" icon={<Trash size={16} />} title={t.deleteSeed}>
                <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#450a0a]/65 border border-[#ef4444]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
                    <form onSubmit={eliminarSemilla} className="space-y-3">
                        <div>
                            <Label htmlFor="idSemilla">{t.seedId}</Label>
                            <Input id="idSemilla" name="idSemilla" type="number" min="1" required />
                        </div>
                        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white">
                            <Trash className="mr-2 h-4 w-4" /> {t.deleteSeedButton}
                        </Button>
                        <InlineResult data={resultDelSeed} variant="danger" />
                    </form>
                </div>
            </DarkSection>
            {/* 👆───────────────────────────────────────────────────────────👆 */}


            {/* 👇── Card 6: Eliminar Planta ────────────────────────────────👇 */}
            <DarkSection color="red" icon={<Trash size={16} />} title={t.deletePlant}>
                <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#450a0a]/65 border border-[#ef4444]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
                    <form onSubmit={eliminarPlanta} className="space-y-3">
                        <div>
                            <Label htmlFor="idPlanta">{t.plantId}</Label>
                            <Input id="idPlanta" name="idPlanta" type="number" min="1" required />
                        </div>
                        <Button type="submit" className="w-full bg-red-700 hover:bg-red-800 text-white">
                            <Trash className="mr-2 h-4 w-4" /> {t.deletePlantButton}
                        </Button>
                        <InlineResult data={resultDelPlant} variant="danger" />
                    </form>
                </div>
            </DarkSection>
            {/* 👆───────────────────────────────────────────────────────────👆 */}

        </div>
    );
};

export default Administracion;