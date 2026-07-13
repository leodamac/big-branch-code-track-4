import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient, ApiError, formatMonto } from '../services/apiClient';
import { EndosantesTimeline } from '../components/EndosantesTimeline';
import type {
  ExpedienteDetail, ExpedienteEstado, TipoDocumento, RiesgoNivel, SiguienteAccionResponse,
} from '../types';
import {
  ArrowLeft, FileText, Activity, AlertTriangle, CheckCircle, Clock,
  Ban, Shield, ArrowUpRight, AlertOctagon,
  ChevronDown, ChevronUp, FileCode, CheckSquare, RefreshCw, Layers, History, Wrench,
} from 'lucide-react';

const TODOS_LOS_DOCS: TipoDocumento[] = ['CEDULA', 'PAPELETA', 'CERTIFICADO', 'PLANILLA', 'KYC', 'CESION', 'NOTA'];

// Refleja exactamente app/services/state_machine.py del backend.
const TRANSICIONES: Record<ExpedienteEstado, { evento: string; label: string; style: 'primary' | 'danger' | 'neutral' }[]> = {
  RECIBIDO: [{ evento: 'INICIAR_VALIDACION', label: 'Iniciar Validación', style: 'primary' }],
  EN_VALIDACION: [
    { evento: 'VALIDACION_COMPLETADA', label: 'Validación Completada', style: 'primary' },
    { evento: 'DOCUMENTACION_FALTANTE', label: 'Falta Documentación', style: 'neutral' },
    { evento: 'RECHAZAR', label: 'Rechazar', style: 'danger' },
  ],
  PENDIENTE_DOCUMENTACION: [{ evento: 'DOCUMENTACION_COMPLETADA', label: 'Documentación Completa', style: 'primary' }],
  LISTO_PARA_NEGOCIAR: [{ evento: 'INICIAR_NEGOCIACION', label: 'Iniciar Negociación', style: 'primary' }],
  EN_NEGOCIACION: [
    { evento: 'CERRAR_NEGOCIACION', label: 'Cerrar Negociación', style: 'primary' },
    { evento: 'RECHAZAR', label: 'Rechazar', style: 'danger' },
  ],
  CERRADO: [],
  RECHAZADO: [],
  CANCELADO: [],
};

const statusColors: Record<ExpedienteEstado, string> = {
  RECIBIDO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  EN_VALIDACION: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  PENDIENTE_DOCUMENTACION: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  LISTO_PARA_NEGOCIAR: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  EN_NEGOCIACION: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  CERRADO: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  RECHAZADO: 'bg-red-500/10 text-red-400 border-red-500/20',
  CANCELADO: 'bg-slate-700/10 text-slate-400 border-slate-700/20',
};

const riesgoColors: Record<RiesgoNivel, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  CRITICO: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: <Ban className="w-4 h-4 shrink-0" /> },
  ALTO: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: <AlertOctagon className="w-4 h-4 shrink-0" /> },
  MEDIO: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: <AlertTriangle className="w-4 h-4 shrink-0" /> },
  BAJO: { bg: 'bg-slate-500/10', border: 'border-slate-800', text: 'text-slate-400', icon: <Clock className="w-4 h-4 shrink-0" /> },
};

const nivelPeso: Record<RiesgoNivel, number> = { CRITICO: 4, ALTO: 3, MEDIO: 2, BAJO: 1 };

export const ExpedienteWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role, isOperador, isCumplimiento } = useAuth();
  const usuarioActual = role === 'OPERADOR' ? 'Operador de Valores' : 'Oficial de Cumplimiento';

  const [expediente, setExpediente] = useState<ExpedienteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isValidating, setIsValidating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<TipoDocumento | null>(null);
  const [resolvingRiesgoId, setResolvingRiesgoId] = useState<string | null>(null);
  const [showLowRisks, setShowLowRisks] = useState(false);

  const [sugerencia, setSugerencia] = useState<SiguienteAccionResponse | null>(null);
  const [isLoadingSugerencia, setIsLoadingSugerencia] = useState(false);
  const [isAcceptingSugerencia, setIsAcceptingSugerencia] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState('');
  const [pendingEvento, setPendingEvento] = useState<string | null>(null);

  const cargarExpediente = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiClient.expedientes.obtener(id);
      setExpediente(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error al cargar el expediente');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cargarExpediente();
  }, [cargarExpediente]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Cargando expediente...</p>
      </div>
    );
  }

  if (loadError || !expediente) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Expediente no encontrado</h2>
        <p className="text-slate-500 text-sm mt-1">{loadError}</p>
        <Link to="/" className="text-brand-400 hover:underline mt-3 inline-block text-sm">
          Volver a la lista de expedientes
        </Link>
      </div>
    );
  }

  const handleValidar = async () => {
    setIsValidating(true);
    setActionError(null);
    try {
      await apiClient.expedientes.validar(expediente.id, usuarioActual);
      await cargarExpediente();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al validar');
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileSelected = async (docType: TipoDocumento, file: File) => {
    setIsUploading(true);
    setUploadingDocType(docType);
    setActionError(null);
    try {
      await apiClient.expedientes.subirDocumento(expediente.id, docType, file);
      await cargarExpediente();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al subir el documento');
    } finally {
      setIsUploading(false);
      setUploadingDocType(null);
    }
  };

  const handleResolverRiesgo = async (riesgoId: string) => {
    setResolvingRiesgoId(riesgoId);
    setActionError(null);
    try {
      await apiClient.expedientes.resolverRiesgo(expediente.id, riesgoId, usuarioActual);
      await cargarExpediente();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al resolver el riesgo');
    } finally {
      setResolvingRiesgoId(null);
    }
  };

  const handleCargarSugerencia = async () => {
    setIsLoadingSugerencia(true);
    setActionError(null);
    try {
      const data = await apiClient.expedientes.siguienteAccion(expediente.id);
      setSugerencia(data);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al consultar la sugerencia');
    } finally {
      setIsLoadingSugerencia(false);
    }
  };

  const handleAceptarSugerencia = async () => {
    if (!sugerencia) return;
    setIsAcceptingSugerencia(true);
    setActionError(null);
    try {
      await apiClient.expedientes.aceptarSiguienteAccion(
        expediente.id,
        sugerencia.proxima_accion.codigo_accion,
        usuarioActual
      );
      await cargarExpediente();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al registrar la aceptación');
    } finally {
      setIsAcceptingSugerencia(false);
    }
  };

  const confirmarTransicion = (evento: string) => {
    setPendingEvento(evento);
    setComentarios('');
  };

  const ejecutarTransicion = async () => {
    if (!pendingEvento) return;
    setIsTransitioning(pendingEvento);
    setActionError(null);
    try {
      await apiClient.expedientes.cambiarEstado(expediente.id, pendingEvento, usuarioActual, comentarios || undefined);
      setPendingEvento(null);
      await cargarExpediente();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setActionError(`Transición inválida: ${err.message}`);
      } else {
        setActionError(err instanceof Error ? err.message : 'Error al cambiar de estado');
      }
    } finally {
      setIsTransitioning(null);
    }
  };

  const documentosPorTipo = new Map(expediente.documentos.filter((d) => d.es_activo).map((d) => [d.tipo, d]));

  const sortedRisks = [...expediente.riesgos].sort((a, b) => nivelPeso[b.nivel] - nivelPeso[a.nivel]);
  const criticalOrHighRisks = sortedRisks.filter((r) => r.nivel === 'CRITICO' || r.nivel === 'ALTO');
  const lowerRisks = sortedRisks.filter((r) => r.nivel === 'MEDIO' || r.nivel === 'BAJO');
  const showFocusMode = criticalOrHighRisks.length > 0;
  const visibleRisks = showFocusMode && !showLowRisks ? criticalOrHighRisks : sortedRisks;

  const transicionesDisponibles = TRANSICIONES[expediente.estado];
  const esEstadoTerminal = transicionesDisponibles.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in space-y-8">
      <input
        type="file"
        id="file-uploader-input"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingDocType) handleFileSelected(uploadingDocType, file);
          e.target.value = '';
        }}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all duration-150">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono" title={expediente.id}>
                {expediente.id.slice(0, 13)}…
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border font-mono ${statusColors[expediente.estado]}`}>
                {expediente.estado}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              Cliente: <span className="text-slate-200 font-semibold">{expediente.cliente.razon_social}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-450 flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-500" />
            <span>Rol: <strong className="text-slate-200">{usuarioActual}</strong></span>
          </div>

          {esEstadoTerminal ? (
            <span className="text-xs text-slate-500 italic">Expediente en estado terminal, sin acciones disponibles.</span>
          ) : (
            <div className="flex gap-2">
              {transicionesDisponibles.map((t) => (
                <button
                  key={t.evento}
                  onClick={() => confirmarTransicion(t.evento)}
                  disabled={isTransitioning !== null}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${
                    t.style === 'primary'
                      ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/10'
                      : t.style === 'danger'
                      ? 'bg-red-900/10 hover:bg-red-900/20 border border-red-500/30 text-red-400'
                      : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Datos de la nota / cliente (solo lectura, vienen del SRI) */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <CheckSquare className="w-4.5 h-4.5 text-brand-400" />
                Datos del Cliente y la Nota (SRI)
              </h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4 text-xs">
              <Field label="RUC Cliente" value={expediente.cliente.ruc} mono />
              <Field label="Estado RUC" value={expediente.cliente.estado_ruc} />
              <Field label="Razón Social" value={expediente.cliente.razon_social} span2 />
              <Field label="Autorización NCD" value={expediente.nota_credito.numero_autorizacion} mono span2 />
              <Field label="Tipo de Nota" value={expediente.nota_credito.tipo} />
              <Field label="Responsable" value={expediente.responsable} />
              <Field label="Valor Nominal" value={`$ ${formatMonto(expediente.nota_credito.valor_nominal)}`} />
              <Field label="Saldo Disponible" value={`$ ${formatMonto(expediente.nota_credito.saldo_disponible)}`} />
              <Field label="Monto a Negociar" value={`$ ${formatMonto(expediente.monto_a_negociar)}`} span2 highlight />
            </div>
          </div>

          {/* Documentos */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-brand-400" />
                Documentación Obligatoria
              </h3>
              <span className="text-xs text-slate-500 font-mono font-medium">
                {documentosPorTipo.size} / {TODOS_LOS_DOCS.length} cargados
              </span>
            </div>

            <div className="p-6 space-y-4">
              {isUploading && (
                <div className="p-4 border border-dashed border-brand-500/40 rounded-xl bg-slate-950/20 text-center">
                  <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-200">Subiendo {uploadingDocType}...</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TODOS_LOS_DOCS.map((type) => {
                  const doc = documentosPorTipo.get(type);
                  const isPresent = !!doc;
                  return (
                    <div
                      key={type}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isPresent ? 'bg-slate-900/40 border-slate-800/80 text-slate-200' : 'bg-slate-950/40 border-dashed border-slate-850 text-slate-500 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isPresent ? <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" /> : <Clock className="w-4.5 h-4.5 text-slate-650 shrink-0" />}
                        <div className="truncate">
                          <div className={`text-xs font-bold tracking-wide ${isPresent ? 'text-slate-350' : 'text-slate-600'}`}>{type}</div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {isPresent ? `v${doc!.version} · ${doc!.hash_sha256.slice(0, 12)}…` : 'Pendiente de cargar'}
                          </div>
                        </div>
                      </div>
                      {isOperador && (
                        <button
                          onClick={() => {
                            setUploadingDocType(type);
                            setTimeout(() => document.getElementById('file-uploader-input')?.click(), 50);
                          }}
                          disabled={isUploading}
                          className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all shrink-0 disabled:opacity-50 ${
                            isPresent
                              ? 'bg-slate-900 border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white'
                              : 'bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/20 text-brand-400'
                          }`}
                        >
                          {isPresent ? 'Reemplazar' : 'Cargar'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Endosos */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-brand-400" />
                Cadena de Endosos Registrada en SRI
              </h3>
            </div>
            <div className="p-6">
              <EndosantesTimeline
                endosos={expediente.nota_credito.historial_endosos || []}
                clienteRuc={expediente.cliente.ruc}
                clienteRazonSocial={expediente.cliente.razon_social}
              />
            </div>
          </div>

          {/* Historial */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-brand-400" />
                Historial de Estados
              </h3>
            </div>
            <div className="p-6 space-y-3">
              {expediente.historial_estados.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">Sin eventos registrados.</p>
              ) : (
                expediente.historial_estados.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs border-b border-slate-850/60 last:border-0 pb-3 last:pb-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-mono">
                        {h.estado_anterior && <span className="text-slate-500">{h.estado_anterior}</span>}
                        {h.estado_anterior && <span className="text-slate-600">→</span>}
                        <span className="text-slate-200 font-semibold">{h.estado_nuevo}</span>
                      </div>
                      <p className="text-slate-400 mt-0.5">{h.comentarios}</p>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        {h.usuario} · {new Date(h.created_at).toLocaleString('es-EC')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Validar */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-brand-400" />
                Validación (Agente de Cumplimiento)
              </h3>
            </div>
            <div className="p-6">
              <p className="text-xs text-slate-400 mb-4">
                Analiza cliente, nota y documentos con IA, y genera los riesgos correspondientes.
              </p>
              <button
                onClick={handleValidar}
                disabled={isValidating}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
              >
                {isValidating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                <span>{isValidating ? 'Analizando con IA...' : 'Validar Expediente'}</span>
              </button>
            </div>
          </div>

          {/* Riesgos */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
                Matriz de Riesgos
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-slate-400">
                {expediente.riesgos.length} Detectados
              </span>
            </div>

            <div className="p-6 space-y-4">
              {visibleRisks.length > 0 ? (
                <div className="space-y-3">
                  {visibleRisks.map((risk) => {
                    const esFalloDeSistema = risk.evidencia?.regla_activadora === 'SISTEMA';
                    const clr = riesgoColors[risk.nivel];
                    return (
                      <div key={risk.id} className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs animate-fade-in ${clr.bg} ${clr.border} ${clr.text}`}>
                        {esFalloDeSistema ? <Wrench className="w-4 h-4 shrink-0" /> : clr.icon}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                            {esFalloDeSistema ? (
                              <span>FALLO TÉCNICO DEL AGENTE — revisar manualmente</span>
                            ) : (
                              <>
                                <span>Riesgo {risk.nivel}</span>
                                {risk.evidencia?.regla_activadora && <span className="opacity-60">· Regla {risk.evidencia.regla_activadora}</span>}
                              </>
                            )}
                          </div>
                          <p className="text-slate-300 font-medium leading-relaxed">{risk.descripcion}</p>
                          {risk.estado === 'ABIERTO' ? (
                            <button
                              onClick={() => handleResolverRiesgo(risk.id)}
                              disabled={resolvingRiesgoId === risk.id}
                              className="mt-1.5 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 hover:text-emerald-400 transition-all disabled:opacity-50"
                            >
                              {resolvingRiesgoId === risk.id ? 'Resolviendo...' : 'Marcar como resuelto'}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-1">
                              <CheckCircle className="w-3 h-3" /> Resuelto
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500/50" />
                  <p className="font-semibold text-slate-350">Sin riesgos detectados todavía</p>
                  <p>Corre la validación para que el agente los analice.</p>
                </div>
              )}

              {showFocusMode && lowerRisks.length > 0 && (
                <button
                  onClick={() => setShowLowRisks(!showLowRisks)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 hover:bg-slate-900 border border-transparent hover:border-slate-850 text-slate-450 hover:text-slate-300 rounded-xl text-xs font-semibold transition-all mt-4"
                >
                  <span>{showLowRisks ? 'Ocultar riesgos informativos' : `Mostrar ${lowerRisks.length} riesgos informativos adicionales`}</span>
                  {showLowRisks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Siguiente acción (Agente de Tesorería) */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden glow-brand">
            <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-brand-400" />
                Sugerencia del Agente de Tesorería
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[9px] font-bold">
                TREASURY AGENT
              </span>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {!sugerencia ? (
                <button
                  onClick={handleCargarSugerencia}
                  disabled={isLoadingSugerencia}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold transition-all"
                >
                  {isLoadingSugerencia ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                  <span>{isLoadingSugerencia ? 'Consultando IA...' : 'Consultar sugerencia'}</span>
                </button>
              ) : sugerencia._error ? (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 flex items-start gap-2.5">
                  <Wrench className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[9px] uppercase tracking-wider text-slate-300">No se pudo evaluar automáticamente</div>
                    <p className="mt-1 leading-relaxed">{sugerencia.proxima_accion.descripcion_sugerida}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-xl space-y-2.5">
                    <div className="font-bold text-brand-400 uppercase tracking-wider text-[9px]">
                      ACCIÓN PROPUESTA: {sugerencia.proxima_accion.codigo_accion}
                    </div>
                    <p className="text-slate-350 font-medium leading-relaxed">{sugerencia.proxima_accion.descripcion_sugerida}</p>
                    {sugerencia.sugerencia_tesoreria.rango_descuento_sugerido && (
                      <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-lg w-max border border-slate-850">
                        <FileCode className="w-3.5 h-3.5 text-brand-400" />
                        <span>Descuento sugerido: {sugerencia.sugerencia_tesoreria.rango_descuento_sugerido}</span>
                      </div>
                    )}
                    {sugerencia.viabilidad_financiera.aprobado === false && (
                      <div className="text-[10px] font-semibold text-red-400">{sugerencia.viabilidad_financiera.motivo_rechazo}</div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCargarSugerencia}
                      disabled={isLoadingSugerencia}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      Recalcular
                    </button>
                    <button
                      onClick={handleAceptarSugerencia}
                      disabled={isAcceptingSugerencia}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
                    >
                      <span>{isAcceptingSugerencia ? 'Registrando...' : 'Aceptar (queda en historial)'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-550 italic">
                    Aceptar solo deja constancia en el historial — no cambia el estado. Usa los botones de arriba para avanzar el expediente.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de transición */}
      {pendingEvento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm">Confirmar Transición</h3>
              <button onClick={() => setPendingEvento(null)} className="text-slate-400 hover:text-slate-250 text-xs">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-900/50 border border-slate-850 rounded-xl space-y-2">
                <span className="text-[9px] uppercase font-bold text-slate-500">Evento:</span>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="px-2 py-0.5 rounded font-mono border border-slate-800 bg-slate-950 text-slate-400">{expediente.estado}</span>
                  <span className="text-slate-600">→</span>
                  <span className="px-2 py-0.5 rounded font-mono border border-brand-500/20 bg-brand-500/10 text-brand-400 font-bold">{pendingEvento}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Comentarios (opcional)</label>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Justificación u observaciones..."
                  className="w-full h-24 px-3 py-2 bg-slate-950 border border-slate-850 focus:border-brand-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-650 focus:outline-none transition-colors"
                />
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-850/60">
                <button onClick={() => setPendingEvento(null)} className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-slate-250 rounded-xl text-sm font-semibold transition-all">
                  Cancelar
                </button>
                <button
                  onClick={ejecutarTransicion}
                  disabled={isTransitioning !== null}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg transition-all"
                >
                  {isTransitioning ? 'Aplicando...' : 'Confirmar y Aplicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCumplimiento && (
        <div className="text-[10px] text-slate-600 text-center italic">
          Rol de cumplimiento: mismos permisos de acción que el operador en este flujo (no hay aprobación diferenciada en el backend todavía).
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; mono?: boolean; span2?: boolean; highlight?: boolean }> = ({
  label, value, mono, span2, highlight,
}) => (
  <div className={span2 ? 'col-span-2' : ''}>
    <div className="text-[9px] uppercase font-semibold text-slate-500 tracking-wider">{label}</div>
    <div className={`mt-0.5 ${mono ? 'font-mono' : ''} ${highlight ? 'text-brand-400 font-bold text-sm' : 'text-slate-200 font-medium'}`}>
      {value}
    </div>
  </div>
);
