import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card";
import { Leaf, CloudRain, BarChart2, AlertTriangle, Info } from 'lucide-react';
import { ResultCard, ResultCardSimple } from "@/components/ui/ResultCard";
import { ViveroInterface } from '../EcoChainComponent';

interface BiodiversidadProps {
    contract: ViveroInterface | null;
    setResultado: React.Dispatch<React.SetStateAction<string>>;
    setGasEstimate: React.Dispatch<React.SetStateAction<string>>;
    actualizarEstadisticasParamo: () => Promise<void>;
    language: 'es' | 'en' | 'fr' | 'de';
    chainId?: number;
}


// ── Ayuda contextual debajo del campo ────────────────────────────────────────
const FieldHint: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.3rem', marginTop: '0.2rem' }}>
    <Info size={11} style={{ flexShrink: 0, marginTop: 2, color: '#6b7280' }} />
    <span style={{ fontSize: '0.65rem', color: '#6b7280', lineHeight: 1.4 }}>{text}</span>
  </div>
);



// ── DarkSection ───────────────────────────────────────────────
const DS_TOKENS_B: Record<string, { accent: string; border: string; bg: string; titleColor: string }> = {
  emerald: { accent: "#34d399", border: "rgba(52,211,153,0.22)", bg: "rgba(52,211,153,0.06)", titleColor: "#6ee7b7" },
  sky:     { accent: "#38bdf8", border: "rgba(56,189,248,0.22)", bg: "rgba(56,189,248,0.06)", titleColor: "#7dd3fc" },
  amber:   { accent: "#fbbf24", border: "rgba(245,158,11,0.22)", bg: "rgba(245,158,11,0.06)", titleColor: "#fde68a" },
};
const DarkSectionB: React.FC<{
  color: keyof typeof DS_TOKENS_B;
  icon: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
}> = ({ color, icon, title, children }) => {
  const tk = DS_TOKENS_B[color] ?? DS_TOKENS_B.emerald;
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


const Biodiversidad: React.FC<BiodiversidadProps> = ({
  contract, setResultado, setGasEstimate, actualizarEstadisticasParamo, language, chainId = 31337
}) => {
    const [estadisticasDetalladas, setEstadisticasDetalladas] = useState<{
        totalSemillas: number;
        totalPlantas: number;
        especiesNativas: number;
        eventosClimaticos: number;
    } | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Resultados inline por Card
    const [resultEspecie,   setResultEspecie]   = useState<{ ok: boolean; msg: string } | null>(null);
    const [resultEvento,    setResultEvento]    = useState<{ ok: boolean; msg: string } | null>(null);
    const [resultStats,     setResultStats]     = useState<{ ok: boolean; msg: string } | null>(null);
    const [resultCondicion, setResultCondicion] = useState<{ ok: boolean; lines: { label: string; value: string }[] } | null>(null);

    const translations = {
        es: {
            registerNativeSpecies: "Registrar Especie Nativa",
            speciesName: "Nombre de la Especie",
            description: "Descripción",
            estimatedPopulation: "Población Estimada",
            registerSpeciesButton: "Registrar Especie Nativa",
            registerClimaticEvent: "Registrar Evento Climático",
            eventType: "Tipo de Evento",
            selectEventType: "Seleccione el tipo de evento",
            temperature: "Temperatura (°C)",
            precipitation: "Precipitación (mm)",
            registerEventButton: "Registrar Evento Climático",
            paramoStatistics: "Estadísticas del Páramo",
            updateStatisticsButton: "Actualizar Estadísticas",
            totalSeeds: "Total Semillas",
            totalPlants: "Total Plantas",
            seedsPerMonth: "Especies Nativas",
            plantsPerMonth: "Eventos Climáticos",
            verifyClimaticConditions: "Verificar Condiciones Climáticas",
            seedId: "ID de la Semilla",
            verifyConditionsButton: "Verificar Condiciones",
            errorRegisteringSpecies: "Error al registrar la especie nativa:",
            errorRegisteringEvent: "Error al registrar el evento climático:",
            errorGettingDetailedStats: "Error al obtener estadísticas:",
            errorVerifyingConditions: "Error al verificar condiciones climáticas:",
            successRegisteringSpecies: "Especie nativa registrada exitosamente",
            successRegisteringEvent: "Evento climático registrado exitosamente",
            successGettingDetailedStats: "Estadísticas actualizadas exitosamente",
            successVerifyingConditions: "Condiciones climáticas verificadas exitosamente"
        },
        en: {
            registerNativeSpecies: "Register Native Species",
            speciesName: "Species Name",
            description: "Description",
            estimatedPopulation: "Estimated Population",
            registerSpeciesButton: "Register Native Species",
            registerClimaticEvent: "Register Climatic Event",
            eventType: "Event Type",
            selectEventType: "Select event type",
            temperature: "Temperature (°C)",
            precipitation: "Precipitation (mm)",
            registerEventButton: "Register Climatic Event",
            paramoStatistics: "Páramo Statistics",
            updateStatisticsButton: "Update Statistics",
            totalSeeds: "Total Seeds",
            totalPlants: "Total Plants",
            seedsPerMonth: "Native Species",
            plantsPerMonth: "Climate Events",
            verifyClimaticConditions: "Verify Climatic Conditions",
            seedId: "Seed ID",
            verifyConditionsButton: "Verify Conditions",
            errorRegisteringSpecies: "Error registering native species:",
            errorRegisteringEvent: "Error registering climatic event:",
            errorGettingDetailedStats: "Error getting statistics:",
            errorVerifyingConditions: "Error verifying climatic conditions:",
            successRegisteringSpecies: "Native species registered successfully",
            successRegisteringEvent: "Climatic event registered successfully",
            successGettingDetailedStats: "Statistics updated successfully",
            successVerifyingConditions: "Climatic conditions verified successfully"
        },
        fr: {
            registerNativeSpecies: "Enregistrer une Espèce Native",
            speciesName: "Nom de l'Espèce",
            description: "Description",
            estimatedPopulation: "Population Estimée",
            registerSpeciesButton: "Enregistrer l'Espèce Native",
            registerClimaticEvent: "Enregistrer un Évènement Climatique",
            eventType: "Type d'Évènement",
            selectEventType: "Sélectionnez le type d'événement",
            temperature: "Température (°C)",
            precipitation: "Précipitations (mm)",
            registerEventButton: "Enregistrer l'Évènement Climatique",
            paramoStatistics: "Statistiques du Páramo",
            updateStatisticsButton: "Mettre à Jour",
            totalSeeds: "Total des Graines",
            totalPlants: "Total des Plantes",
            seedsPerMonth: "Espèces Natives",
            plantsPerMonth: "Événements Climatiques",
            verifyClimaticConditions: "Vérifier les Conditions Climatiques",
            seedId: "ID de la Graine",
            verifyConditionsButton: "Vérifier les Conditions",
            errorRegisteringSpecies: "Erreur lors de l'enregistrement:",
            errorRegisteringEvent: "Erreur lors de l'enregistrement:",
            errorGettingDetailedStats: "Erreur lors de l'obtention des statistiques:",
            errorVerifyingConditions: "Erreur lors de la vérification:",
            successRegisteringSpecies: "Espèce native enregistrée avec succès",
            successRegisteringEvent: "Évènement climatique enregistré avec succès",
            successGettingDetailedStats: "Statistiques obtenues avec succès",
            successVerifyingConditions: "Conditions climatiques vérifiées avec succès"
        },
        de: {
            registerNativeSpecies: "Einheimische Art registrieren",
            speciesName: "Artname",
            description: "Beschreibung",
            estimatedPopulation: "Geschätzte Population",
            registerSpeciesButton: "Einheimische Art registrieren",
            registerClimaticEvent: "Klimaereignis registrieren",
            eventType: "Ereignistyp",
            selectEventType: "Ereignistyp auswählen",
            temperature: "Temperatur (°C)",
            precipitation: "Niederschlag (mm)",
            registerEventButton: "Klimaereignis registrieren",
            paramoStatistics: "Páramo-Statistiken",
            updateStatisticsButton: "Statistiken aktualisieren",
            totalSeeds: "Gesamtzahl Samen",
            totalPlants: "Gesamtzahl Pflanzen",
            seedsPerMonth: "Heimische Arten",
            plantsPerMonth: "Klimaereignisse",
            verifyClimaticConditions: "Klimabedingungen überprüfen",
            seedId: "Samen-ID",
            verifyConditionsButton: "Bedingungen überprüfen",
            errorRegisteringSpecies: "Fehler beim Registrieren:",
            errorRegisteringEvent: "Fehler beim Registrieren:",
            errorGettingDetailedStats: "Fehler beim Abrufen:",
            errorVerifyingConditions: "Fehler beim Überprüfen:",
            successRegisteringSpecies: "Einheimische Art erfolgreich registriert",
            successRegisteringEvent: "Klimaereignis erfolgreich registriert",
            successGettingDetailedStats: "Statistiken erfolgreich abgerufen",
            successVerifyingConditions: "Klimabedingungen erfolgreich überprüft"
        }
    };

    const t = translations[language];

    const estimateGas = async (method: string, ...args: any[]): Promise<string> => {
        if (!contract) return "0";
        try {
            const gasEstimate = await (contract as any).estimateGas[method](...args);
            return (gasEstimate * BigInt(110) / BigInt(100)).toString();
        } catch (error) {
            console.error('Error estimating gas:', error);
            return "0";
        }
    };

    const registrarEspecieNativa = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!contract) return;
        try {
            const formData = new FormData(event.currentTarget);
            const nombre = formData.get('nombre') as string;
            const descripcion = formData.get('descripcion') as string;
            const poblacionEstimada = parseInt(formData.get('poblacionEstimada') as string, 10);

            const estimatedGas = await estimateGas('registrarEspecieNativa', nombre, descripcion, poblacionEstimada);
            setGasEstimate(estimatedGas.toString());

            const tx = await contract.registrarEspecieNativa(nombre, descripcion, poblacionEstimada);
            await tx.wait();
            setResultEspecie({ ok: true, msg: "✅ " + t.successRegisteringSpecies });
            setResultado(t.successRegisteringSpecies);
            actualizarEstadisticasParamo();
        } catch (error) {
            setResultEspecie({ ok: false, msg: "❌ " + t.errorRegisteringSpecies + " " + (error as Error).message });
            setResultado(t.errorRegisteringSpecies + ' ' + (error as Error).message);
            setGasEstimate("0");
        }
    };

    const registrarEventoClimatico = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!contract) return;
        try {
            const formData = new FormData(event.currentTarget);
            const tipo = formData.get('tipo') as string;
            const temperatura = parseInt(formData.get('temperatura') as string, 10);
            const precipitacion = parseInt(formData.get('precipitacion') as string, 10);

            // ── Pre-flight: verificar permisos antes de gastar gas ──────────
            try {
                const ownerAddr: string = await (contract as any).owner();
                const signerAddr: string = await (contract as any).runner?.getAddress?.() ??
                    await (contract as any).signer?.getAddress?.() ?? '';
                const esOwner = ownerAddr.toLowerCase() === signerAddr.toLowerCase();
                const esAdmin: boolean = esOwner ? true : await (contract as any).administradores(signerAddr);
                if (!esOwner && !esAdmin) {
                    const msg = `⛔ Sin permisos: tu wallet (${signerAddr.slice(0,6)}…${signerAddr.slice(-4)}) no es owner ni administrador del contrato.\n\nOwner actual: ${ownerAddr.slice(0,6)}…${ownerAddr.slice(-4)}\n\nPide al owner que ejecute agregarAdministrador(${signerAddr}) desde la pestaña Administración.`;
                    setResultEvento({ ok: false, msg });
                    setResultado(msg);
                    return;
                }
            } catch (_e) { /* si el check falla, dejamos pasar y el contrato dará el error real */ }
            // ────────────────────────────────────────────────────────────────

            const estimatedGas = await estimateGas('registrarEventoClimatico', tipo, temperatura, precipitacion);
            setGasEstimate(estimatedGas.toString());
            const tx = await (contract as any).registrarEventoClimatico(tipo, temperatura, precipitacion);
            await tx.wait();
            setResultEvento({ ok: true, msg: "✅ " + t.successRegisteringEvent });
            setResultado(t.successRegisteringEvent);
            actualizarEstadisticasParamo();
        } catch (error) {
            setResultEvento({ ok: false, msg: "❌ " + t.errorRegisteringEvent + " " + (error as Error).message });
            setResultado(t.errorRegisteringEvent + ' ' + (error as Error).message);
            setGasEstimate("0");
        }
    };

    // ── BUG FIX: totalSemillas y totalPlantas siempre dan 0 porque Vivero.sol
    //    no recibe las semillas de la Factory directamente (o viveroContrato no
    //    está configurado). La solución es leer totalSemillasAdoptadas desde la
    //    Factory directamente, que sí tiene el conteo real.
    const obtenerEstadisticasDetalladas = async () => {
        if (!contract) return;
        setLoadingStats(true);
        try {
            // Obtener stats base desde Vivero.sol (especies y eventos son correctos)
            const stats = await contract.obtenerEstadisticasParamo();
            let totalSemillas = Number(stats[0]);
            let totalPlantas  = Number(stats[1]);

            // Si totalSemillas sigue siendo 0, intentar leerlo desde la Factory
            // (las semillas se adoptan via Factory; si Vivero no está sincronizado,
            //  totalSemillasRegistradas en Vivero.sol permanece en 0).
            const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA;
            if (totalSemillas === 0 && factoryAddress) {
                try {
                    const { ethers } = await import("ethers");
                    const provider = (contract as any).runner as any;
                    const factory = new ethers.Contract(
                        factoryAddress,
                        [
                            "function totalSemillasAdoptadas() external view returns (uint256)",
                            "function obtenerTodosLosContratos() external view returns (address[])",
                        ],
                        provider
                    );
                    const total = await factory.totalSemillasAdoptadas();
                    totalSemillas = Number(total);

                    // Para totalPlantas: sumar traslados de cada gemelo si aún es 0
                    if (totalPlantas === 0 && totalSemillas > 0) {
                        try {
                            const contratos: string[] = await factory.obtenerTodosLosContratos();
                            let sumaPlantas = 0;
                            for (const dir of contratos) {
                                if (!dir || dir === ethers.ZeroAddress) continue;
                                const gemelo = new ethers.Contract(
                                    dir,
                                    ["function obtenerResumen() external view returns (uint256,string,string,int256,int256,uint256,uint256,uint256,uint256,uint256)"],
                                    provider
                                );
                                const r = await gemelo.obtenerResumen();
                                sumaPlantas += Number(r[7]); // traslados registrados
                            }
                            totalPlantas = sumaPlantas;
                        } catch (_) { /* si falla, dejamos totalPlantas en 0 */ }
                    }
                } catch (_) { /* si la Factory falla, mostramos lo que devuelve Vivero.sol */ }
            }

            setEstadisticasDetalladas({
                totalSemillas,
                totalPlantas,
                especiesNativas:   Number(stats[2]),
                eventosClimaticos: Number(stats[3]),
            });
            setResultStats({ ok: true, msg: "✅ " + t.successGettingDetailedStats });
            setResultado(t.successGettingDetailedStats);
            await actualizarEstadisticasParamo();
        } catch (error) {
            setResultStats({ ok: false, msg: "❌ " + t.errorGettingDetailedStats + " " + (error as Error).message });
            setResultado(t.errorGettingDetailedStats + ' ' + (error as Error).message);
        } finally {
            setLoadingStats(false);
        }
    };

    const verificarCondicionesClimaticas = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!contract) return;
        try {
            const formData = new FormData(event.currentTarget);
            const idSemilla = parseInt(formData.get('idSemilla') as string);
            if (chainId === 11155111) {
                const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA;
                if (!factoryAddress) throw new Error("NEXT_PUBLIC_FACTORY_ADDRESS_SEPOLIA no configurado.");
                const { ethers } = await import("ethers");
                const provider = (contract as any).runner as any;
                const factory = new ethers.Contract(
                    factoryAddress,
                    ["function buscarContratoPorId(uint256) external view returns (address)"],
                    provider
                );
                const gemeloDireccion = await factory.buscarContratoPorId(idSemilla);
                if (!gemeloDireccion || gemeloDireccion === ethers.ZeroAddress)
                    throw new Error(`No existe Gemelo Digital para la semilla #${idSemilla}.`);
                const gemelo = new ethers.Contract(
                    gemeloDireccion,
                    ["function obtenerResumen() external view returns (uint256, string, string, int256, int256, uint256, uint256, uint256, uint256, uint256)"],
                    provider
                );
                const r = await gemelo.obtenerResumen();
                setResultCondicion({ ok: true, lines: [
                    { label: "🌱 Especie",      value: r[1] },
                    { label: "👤 Responsable",  value: r[2] },
                    { label: "📍 Latitud",       value: `${(Number(r[3])/1_000_000).toFixed(6)}°` },
                    { label: "📍 Longitud",      value: `${(Number(r[4])/1_000_000).toFixed(6)}°` },
                    { label: "⛰️ Altitud",       value: `${Number(r[5])} msnm` },
                    { label: "📋 Reportes clima",value: String(Number(r[6])) },
                    { label: "🚚 Traslados",     value: String(Number(r[7])) },
                    { label: "🌡️ Últ. Temp.",   value: `${(Number(r[8]) / 10).toFixed(1)}°C` },
                    { label: "💧 Últ. Humedad",  value: `${Number(r[9])}%` },
                ]});
                setResultado(
                    `✅ Gemelo Digital semilla #${idSemilla}\n` +
                    `🌱 Especie: ${r[1]} | 👤 ${r[2]}\n` +
                    `📍 (${(Number(r[3])/1_000_000).toFixed(4)}, ${(Number(r[4])/1_000_000).toFixed(4)}) ⛰️ ${Number(r[5])} msnm`
                );
            } else {
                const clima = await (contract as any).obtenerUltimoClima(idSemilla);
                setResultCondicion({ ok: true, lines: [
                    { label: "🌡️ Temperatura",   value: (Number(clima.temperatura)/10).toFixed(1) + "°C" },
                    { label: "💧 Humedad",         value: Number(clima.humedadRelativa) + "%" },
                    { label: "🌧️ Precipitación",  value: String(Number(clima.precipitacion)) },
                    { label: "☀️ Horas de luz",   value: String(Number(clima.horasLuzSolar)) },
                    { label: "🕐 Fecha",           value: new Date(Number(clima.timestamp)*1000).toLocaleString() },
                ]});
                setResultado("✅ Última telemetría semilla #" + idSemilla);
            }
        } catch (error) {
            setResultCondicion({ ok: false, lines: [{ label: "❌ Error", value: (error as Error).message }] });
            setResultado(t.errorVerifyingConditions + ' ' + (error as Error).message);
            setGasEstimate("0");
        }
    };

    return (
        <>
        {/* Animación fadeIn para los resultados */}
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        <div className="space-y-4 md:space-y-6 pt-2 md:pt-0">

{/* 👇── FORMULARIO REGISTRAR ESPECIE NATIVA ─────────────────────────── 👇 */}

            {/* ── FORMULARIO REGISTRAR ESPECIE NATIVA ─────────────────────────── */}
            <DarkSectionB color="emerald" icon={<Leaf size={16} />} title={t.registerNativeSpecies}>
                
                {/* 👇 DIV CONTENEDOR CON EL DEGRADADO ESMERALDA OSCURO COMPATIBLE CON TYPESCRIPT 👇 */}
                <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#064e3b]/65 border border-[#10b981]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
                    
                    <form onSubmit={registrarEspecieNativa} className="space-y-3 md:space-y-4">

                      {/* Nombre científico o común de la especie a registrar */}
                      <div>
                        <Label htmlFor="nombre" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6ee7b7" }}>
                          {t.speciesName} <span className="text-red-500 text-xs">*</span>
                        </Label>
                        <Input
                          id="nombre"
                          name="nombre"
                          required
                          placeholder="Ej: Espeletia grandiflora (Frailejón)"
                          className="mt-1"
                        />
                        <FieldHint text="Usa el nombre científico completo seguido del nombre común entre paréntesis. Ej: Espeletia grandiflora (Frailejón)." />
                      </div>

                      {/* Descripción ecológica de la especie: hábitat, importancia, características */}
                      <div>
                        <Label htmlFor="descripcion" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6ee7b7" }}>
                          {t.description} <span className="text-red-500 text-xs">*</span>
                        </Label>
                        <Textarea
                          id="descripcion"
                          name="descripcion"
                          required
                          rows={3}
                          placeholder="Ej: Planta endémica del páramo colombiano, alturas entre 2800-4200 msnm. Roseta de hojas lanosas que retiene agua. Crecimiento lento (~1 cm/año). Indicadora de ecosistema saludable."
                          className="mt-1 border-emerald-200 focus:border-emerald-400 focus:ring-emerald-100 resize-none"
                        />
                        <FieldHint text="Incluye: hábitat, altitud, características físicas, importancia ecológica y estado de conservación." />
                      </div>

                      {/* Número estimado de individuos en el área de monitoreo */}
                      <div>
                        <Label htmlFor="poblacionEstimada" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#6ee7b7" }}>
                          {t.estimatedPopulation} <span className="text-red-500 text-xs">*</span>
                        </Label>
                        <Input
                          id="poblacionEstimada"
                          name="poblacionEstimada"
                          type="number"
                          required
                          min="1"
                          placeholder="Ej: 150 (individuos contabilizados en el área de estudio)"
                          className="mt-1"
                        />
                        <FieldHint text="Número entero de individuos observados en el área de monitoreo. No uses puntos ni comas." />
                      </div>

                      <Button
                        type="submit"
                        className="w-full text-sm md:text-base py-1 md:py-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Leaf className="mr-2 h-4 w-4" /> {t.registerSpeciesButton}
                      </Button>

                      {/* Resultado de la operación — aparece debajo del botón */}
                      <ResultCardSimple result={resultEspecie} variant="especie" />
                    </form>

                </div>
            </DarkSectionB>

            {/*👇 ── CARD 2 — Registrar Evento Climático ─────────────────────────── 👇*/}
            <DarkSectionB color="sky" icon={<CloudRain size={16} />} title={t.registerClimaticEvent}>
                
                {/* 👇 DIV CONTENEDOR CON EL DEGRADADO AZUL CIELO OSCURO COMPATIBLE CON TYPESCRIPT 👇 */}
                <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#0c4a6e]/65 border border-[#38bdf8]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
                    
                    <form onSubmit={registrarEventoClimatico} className="space-y-3 md:space-y-4">

                      {/* Categoría del fenómeno climático registrado */}
                      <div>
                        <Label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#7dd3fc" }}>
                          {t.eventType} <span className="text-red-500 text-xs">*</span>
                        </Label>
                        <Select name="tipo" required>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="— Selecciona el tipo de evento climático —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lluvia">🌧️ Lluvia</SelectItem>
                            <SelectItem value="sequia">☀️ Sequía</SelectItem>
                            <SelectItem value="helada">❄️ Helada</SelectItem>
                            <SelectItem value="tormenta">⛈️ Tormenta</SelectItem>
                            <SelectItem value="granizo">🌨️ Granizo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldHint text="Elige el tipo de evento climático ocurrido. Esto alimenta el historial de condiciones del páramo." />
                      </div>

                      {/* Temperatura registrada durante el evento en grados Celsius */}
                      <div>
                        <Label htmlFor="temperatura" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#7dd3fc" }}>
                          {t.temperature} <span className="text-red-500 text-xs">*</span>
                        </Label>
                        <Input
                          id="temperatura"
                          name="temperatura"
                          type="number"
                          required
                          placeholder="Ej: -2 (helada) · 8 (normal) · 15 (cálido)"
                          className="mt-1"
                        />
                        <FieldHint text="Temperatura en °C al momento del evento. Valores negativos indican helada. Rango típico en páramo: -5 a 18°C." />
                      </div>

                      {/* Cantidad de precipitación acumulada durante el evento */}
                      <div>
                        <Label htmlFor="precipitacion" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#7dd3fc" }}>
                          {t.precipitation} <span className="text-red-500 text-xs">*</span>
                        </Label>
                        <Input
                          id="precipitacion"
                          name="precipitacion"
                          type="number"
                          required
                          min="0"
                          placeholder="Ej: 0 (helada/sequía) · 12 (lluvia moderada) · 80 (tormenta)"
                          className="mt-1"
                        />
                        <FieldHint text="Milímetros de lluvia acumulados durante el evento. Para heladas o sequías, ingresa 0." />
                      </div>

                      <Button
                        type="submit"
                        className="w-full text-sm md:text-base py-1 md:py-2 bg-sky-600 hover:bg-sky-700 text-white"
                      >
                        <CloudRain className="mr-2 h-4 w-4" /> {t.registerEventButton}
                      </Button>

                      {/* Resultado de la operación — aparece debajo del botón */}
                      <ResultCardSimple result={resultEvento} variant="evento" />
                    </form>

                </div>
            </DarkSectionB>

            {/* 👇══════CARD 3 — Estadísticas del Páramo👇══════════ */}
            <div style={{
              borderRadius: 16, overflow: "hidden",
              background: "linear-gradient(135deg, rgba(6,78,59,0.9) 0%, rgba(15,118,110,0.85) 50%, rgba(8,51,68,0.9) 100%)",
              border: "1px solid rgba(52,211,153,0.2)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>
                {/* Header */}
                <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                      <BarChart2 className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white leading-tight">{t.paramoStatistics}</h3>
                      <p className="text-xs text-emerald-300/80 mt-0.5">Blockchain · Sepolia Testnet</p>
                    </div>
                  </div>
                  <Button
                    onClick={obtenerEstadisticasDetalladas}
                    disabled={!contract || loadingStats}
                    className="h-8 px-4 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm disabled:opacity-40 transition-all duration-200"
                  >
                    {loadingStats ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Actualizando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        {t.updateStatisticsButton}
                      </span>
                    )}
                  </Button>
                </div>

                {/* Divider */}
                <div className="mx-5 h-px bg-white/10" />

                {/* Grid de estadísticas */}
                <div className="grid grid-cols-2 gap-px bg-white/5 mx-5 my-4 rounded-xl overflow-hidden">
                  {[
                    { label: t.totalSeeds,     value: estadisticasDetalladas?.totalSemillas     ?? "—", icon: "🌱", color: "from-emerald-500/20 to-emerald-500/5",  hint: "Leído desde Factory" },
                    { label: t.totalPlants,    value: estadisticasDetalladas?.totalPlantas      ?? "—", icon: "🌿", color: "from-teal-500/20 to-teal-500/5",     hint: "Traslados acumulados" },
                    { label: t.seedsPerMonth,  value: estadisticasDetalladas?.especiesNativas   ?? "—", icon: "🦋", color: "from-cyan-500/20 to-cyan-500/5",      hint: "Registradas en Vivero" },
                    { label: t.plantsPerMonth, value: estadisticasDetalladas?.eventosClimaticos ?? "—", icon: "⛈️", color: "from-sky-500/20 to-sky-500/5",       hint: "Eventos en Vivero" },
                  ].map((stat, i) => (
                    <div key={i} className={`bg-gradient-to-br ${stat.color} p-4 flex flex-col gap-1 backdrop-blur-sm group`}>
                      <span className="text-lg leading-none">{stat.icon}</span>
                      <span className="text-2xl font-bold text-white tracking-tight mt-1">
                        {stat.value}
                      </span>
                      <span className="text-xs text-white/60 leading-tight">{stat.label}</span>
                      <span className="text-[0.6rem] text-white/30 leading-tight mt-0.5 italic">{stat.hint}</span>
                    </div>
                  ))}
                </div>

                {/* Mensaje de resultado */}
                {resultStats && (
                  <div className={`mx-5 mb-4 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                    resultStats.ok
                      ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20"
                      : "bg-red-400/10 text-red-300 border border-red-400/20"
                  }`}>
                    {resultStats.msg}
                  </div>
                )}

                {/* Hint inicial */}
                {!estadisticasDetalladas && !loadingStats && (
                  <p className="text-center text-xs text-white/30 pb-4 px-5">
                    Pulsa <span className="text-white/50 font-medium">Actualizar Estadísticas</span> para consultar la blockchain
                  </p>
                )}
            </div>

{/* 👇── CARD 4 — Verificar Condiciones Climáticas ───────────────────────────👇 */}
            <DarkSectionB color="amber" icon={<AlertTriangle size={16} />} title={t.verifyClimaticConditions}>
                
                {/* 👇 DIV CONTENEDOR CON EL DEGRADADO ÁMBAR/AMARILLO OSCURO COMPATIBLE CON TYPESCRIPT 👇 */}
                <div className="bg-gradient-to-br from-[#1c1917]/85 to-[#451a03]/65 border border-[#fbbf24]/25 rounded-xl p-4 md:p-6 -mx-4 -my-4 md:-mx-6 md:-my-6">
                    
                    <form onSubmit={verificarCondicionesClimaticas} className="space-y-3 md:space-y-4">

                      {/* ID numérico de la semilla cuyo gemelo digital se quiere consultar */}
                      <div>
                        <Label htmlFor="idSemilla" style={{ fontSize: "0.8rem", fontWeight: 600, color: "#fde68a" }}>
                          {t.seedId} <span className="text-red-500 text-xs">*</span>
                        </Label>
                        <Input
                          id="idSemilla"
                          name="idSemilla"
                          type="number"
                          required
                          min="1"
                          placeholder="Ej: 1 · 2 · 3 (ver IDs en pestaña Consulta)"
                          className="mt-1 border-amber-200 focus:border-amber-400 focus:ring-amber-100"
                        />
                        <FieldHint text="Ingresa el número entero de la semilla. Puedes ver todos los IDs disponibles en la pestaña Consulta." />
                      </div>

                      <Button
                        type="submit"
                        className="w-full text-sm md:text-base py-1 md:py-2 bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" /> {t.verifyConditionsButton}
                      </Button>

                      {/* Resultado en tabla — muestra datos del Gemelo Digital */}
                      {resultCondicion && (
                        <ResultCard
                          result={{
                            ok:           resultCondicion.ok,
                            title:        resultCondicion.ok ? "Datos del Gemelo Digital" : "Error al verificar condiciones",
                            description: resultCondicion.ok ? "Telemetría y trazabilidad de la semilla" : undefined,
                            rows: resultCondicion.ok
                              ? resultCondicion.lines.map(l => ({
                                  label: l.label.replace(/^[🌱👤📍⛰️📋🚚🌡️💧]\s*/, ""),
                                  value: l.value,
                                  mono:  true,
                                }))
                              : undefined,
                            errorMessage: resultCondicion.ok
                              ? undefined
                              : resultCondicion.lines[0]?.value,
                          }}
                          variant="verificar"
                        />
                      )}
                    </form>

                </div>
            </DarkSectionB>

        </div>
        </>
    );
};

export default Biodiversidad;