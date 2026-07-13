import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient, ApiError, formatMonto } from '../services/apiClient';
import type {
  ExpedienteDetail, ExpedienteEstado, TipoDocumento, RiesgoNivel, SiguienteAccionResponse,
} from '../types';
import {
  ArrowLeft, FileText, Activity, AlertTriangle, CheckCircle, Clock,
  Ban, Shield, AlertOctagon,
  ChevronDown, ChevronUp, FileCode, CheckSquare, RefreshCw, History, Wrench,
} from 'lucide-react';

// NOTA no se sube como documento: sus datos ya llegan estructurados desde el
// SRI (expediente.nota_credito), no hace falta pedirle un archivo al operador.
const TODOS_LOS_DOCS: TipoDocumento[] = ['CEDULA', 'PAPELETA', 'CERTIFICADO', 'PLANILLA', 'KYC', 'CESION'];

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
  RECIBIDO: 'bg-[#e7f3f8] text-[#0b6e99]',
  EN_VALIDACION: 'bg-[#fbf3db] text-[#9f6a00]',
  PENDIENTE_DOCUMENTACION: 'bg-[#eae4f2] text-[#6940a5]',
  LISTO_PARA_NEGOCIAR: 'bg-[#ddedea] text-[#0f7b6c]',
  EN_NEGOCIACION: 'bg-[#f4dfeb] text-[#ad1a72]',
  CERRADO: 'bg-ink-100 text-ink-600',
  RECHAZADO: 'bg-[#fbe4e4] text-[#e03e3e]',
  CANCELADO: 'bg-ink-100 text-ink-500',
};

const riesgoColors: Record<RiesgoNivel, { bg: string; text: string; icon: React.ReactNode }> = {
  CRITICO: { bg: 'bg-[#fbe4e4]', text: 'text-[#e03e3e]', icon: <Ban className="w-4 h-4 shrink-0" /> },
  ALTO: { bg: 'bg-[#faebdd]', text: 'text-[#d9730d]', icon: <AlertOctagon className="w-4 h-4 shrink-0" /> },
  MEDIO: { bg: 'bg-[#fbf3db]', text: 'text-[#9f6a00]', icon: <AlertTriangle className="w-4 h-4 shrink-0" /> },
  BAJO: { bg: 'bg-ink-100', text: 'text-ink-600', icon: <Clock className="w-4 h-4 shrink-0" /> },
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
  const [showLowRisks, setShowLowRisks] = useState(false);

  const [sugerencia, setSugerencia] = useState<SiguienteAccionResponse | null>(null);
  const [isLoadingSugerencia, setIsLoadingSugerencia] = useState(false);

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
        <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-3" />
        <p className="text-ink-500 text-sm">Cargando expediente...</p>
      </div>
    );
  }

  if (loadError || !expediente) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <AlertTriangle className="w-10 h-10 text-[#e03e3e] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-ink-900">Expediente no encontrado</h2>
        <p className="text-ink-500 text-sm mt-1">{loadError}</p>
        <Link to="/" className="text-brand-600 hover:underline mt-3 inline-block text-sm">
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
          <Link to="/" className="flex items-center justify-center w-9 h-9 rounded-md bg-white border border-ink-200 text-ink-500 hover:text-ink-900 hover:border-ink-300 transition-colors duration-150">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-ink-900 font-mono" title={expediente.id}>
                {expediente.id.slice(0, 13)}…
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${statusColors[expediente.estado]}`}>
                {expediente.estado}
              </span>
            </div>
            <p className="text-ink-500 text-sm mt-0.5">
              Cliente: <span className="text-ink-800 font-semibold">{expediente.cliente.razon_social}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-md bg-ink-50 border border-ink-200 text-xs font-medium text-ink-600 flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-500" />
            <span>Rol: <strong className="text-ink-800">{usuarioActual}</strong></span>
          </div>

          {esEstadoTerminal ? (
            <span className="text-xs text-ink-500 italic">Expediente en estado terminal, sin acciones disponibles.</span>
          ) : (
            <div className="flex gap-2">
              {transicionesDisponibles.map((t) => (
                <button
                  key={t.evento}
                  onClick={() => confirmarTransicion(t.evento)}
                  disabled={isTransitioning !== null}
                  className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
                    t.style === 'primary'
                      ? 'bg-brand-600 hover:bg-brand-700 text-white'
                      : t.style === 'danger'
                      ? 'bg-[#fbe4e4] hover:bg-[#f6d0d0] text-[#e03e3e]'
                      : 'bg-white hover:bg-ink-50 border border-ink-200 text-ink-700'
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
        <div className="p-3.5 rounded-md bg-[#fbe4e4] text-[#e03e3e] text-xs flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Datos de la nota / cliente (solo lectura, vienen del SRI) */}
          <div className="panel rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-ink-50 border-b border-ink-200">
              <h3 className="font-semibold text-sm text-ink-800 flex items-center gap-2">
                <CheckSquare className="w-4.5 h-4.5 text-brand-600" />
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
          <div className="panel rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-ink-50 border-b border-ink-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-ink-800 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-brand-600" />
                Documentación Obligatoria
              </h3>
              <span className="text-xs text-ink-500 font-mono font-medium">
                {documentosPorTipo.size} / {TODOS_LOS_DOCS.length} cargados
              </span>
            </div>

            <div className="p-6 space-y-4">
              {isUploading && (
                <div className="p-4 border border-dashed border-brand-300 rounded-md bg-brand-50 text-center">
                  <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
                  <p className="text-xs font-semibold text-ink-800">Subiendo {uploadingDocType}...</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TODOS_LOS_DOCS.map((type) => {
                  const doc = documentosPorTipo.get(type);
                  const isPresent = !!doc;
                  return (
                    <div
                      key={type}
                      className={`p-3 rounded-md border flex items-center justify-between transition-colors ${
                        isPresent ? 'bg-white border-ink-200 text-ink-800' : 'bg-ink-50 border-dashed border-ink-300 text-ink-500 hover:border-ink-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isPresent ? <CheckCircle className="w-4.5 h-4.5 text-[#0f7b6c] shrink-0" /> : <Clock className="w-4.5 h-4.5 text-ink-400 shrink-0" />}
                        <div className="truncate">
                          <div className={`text-xs font-bold tracking-wide ${isPresent ? 'text-ink-700' : 'text-ink-500'}`}>{type}</div>
                          <div className="text-[10px] text-ink-500 truncate mt-0.5">
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
                          className={`p-1.5 rounded-md border text-[10px] font-bold transition-colors shrink-0 disabled:opacity-50 ${
                            isPresent
                              ? 'bg-white border-ink-200 hover:bg-ink-50 text-ink-500 hover:text-ink-800'
                              : 'bg-brand-50 border-brand-200 hover:bg-brand-100 text-brand-600'
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

          {/* Historial */}
          <div className="panel rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-ink-50 border-b border-ink-200">
              <h3 className="font-semibold text-sm text-ink-800 flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-brand-600" />
                Historial de Estados
              </h3>
            </div>
            <div className="p-6 space-y-3">
              {expediente.historial_estados.length === 0 ? (
                <p className="text-xs text-ink-500 text-center py-2">Sin eventos registrados.</p>
              ) : (
                expediente.historial_estados.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs border-b border-ink-200 last:border-0 pb-3 last:pb-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 font-mono">
                        {h.estado_anterior && <span className="text-ink-500">{h.estado_anterior}</span>}
                        {h.estado_anterior && <span className="text-ink-400">→</span>}
                        <span className="text-ink-800 font-semibold">{h.estado_nuevo}</span>
                      </div>
                      <p className="text-ink-600 mt-0.5">{h.comentarios}</p>
                      <div className="text-[10px] text-ink-400 mt-0.5">
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
          <div className="panel rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-ink-50 border-b border-ink-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-ink-800 flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-brand-600" />
                Validación del Agente de Cumplimiento
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 border border-brand-200 text-[9px] font-bold">
                COMPLIANCE AGENT
              </span>
            </div>
            <div className="p-6">
              <p className="text-sm text-ink-800 font-semibold mb-4">
                Analiza documentos faltantes con IA y genera los riesgos correspondientes.
              </p>
              <button
                onClick={handleValidar}
                disabled={isValidating}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold transition-colors"
              >
                {isValidating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                <span>{isValidating ? 'Analizando con IA...' : 'Validar Documentos Faltantes'}</span>
              </button>
            </div>
          </div>

          {/* Riesgos: solo aparece si el agente detectó al menos uno */}
          {expediente.riesgos.length > 0 && (
            <div className="panel rounded-lg overflow-hidden">
              <div className="px-6 py-4 bg-ink-50 border-b border-ink-200 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-ink-800 flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-[#9f6a00]" />
                  Matriz de Riesgos
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-ink-100 text-ink-600">
                  {expediente.riesgos.length} Detectados
                </span>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  {visibleRisks.map((risk) => {
                    const esFalloDeSistema = risk.evidencia?.regla_activadora === 'SISTEMA';
                    const clr = riesgoColors[risk.nivel];
                    return (
                      <div key={risk.id} className={`p-3.5 rounded-md border border-transparent flex items-start gap-3 text-xs animate-fade-in ${clr.bg} ${clr.text}`}>
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
                          <p className="text-ink-700 font-medium leading-relaxed">{risk.descripcion}</p>
                          {risk.estado === 'RESUELTO' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0f7b6c] mt-1">
                              <CheckCircle className="w-3 h-3" /> Resuelto
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {showFocusMode && lowerRisks.length > 0 && (
                  <button
                    onClick={() => setShowLowRisks(!showLowRisks)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 hover:bg-ink-50 border border-transparent hover:border-ink-200 text-ink-500 hover:text-ink-800 rounded-md text-xs font-semibold transition-colors mt-4"
                  >
                    <span>{showLowRisks ? 'Ocultar riesgos informativos' : `Mostrar ${lowerRisks.length} riesgos informativos adicionales`}</span>
                    {showLowRisks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Siguiente acción (Agente de Tesorería) */}
          <div className="panel rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-ink-50 border-b border-ink-200 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-ink-800 flex items-center gap-2">
                <Activity className="w-4.5 h-4.5 text-brand-600" />
                Sugerencia del Agente de Tesorería
              </h3>
              <span className="px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 border border-brand-200 text-[9px] font-bold">
                TREASURY AGENT
              </span>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {!sugerencia ? (
                <button
                  onClick={handleCargarSugerencia}
                  disabled={isLoadingSugerencia}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-md text-xs font-semibold transition-colors"
                >
                  {isLoadingSugerencia ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                  <span>{isLoadingSugerencia ? 'Consultando IA...' : 'Consultar sugerencia'}</span>
                </button>
              ) : sugerencia._error ? (
                <div className="p-3.5 rounded-md bg-ink-50 border border-ink-200 text-ink-600 flex items-start gap-2.5">
                  <Wrench className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-bold text-[9px] uppercase tracking-wider text-ink-700">No se pudo evaluar automáticamente</div>
                    <p className="mt-1 leading-relaxed break-words">{sugerencia.proxima_accion.descripcion_sugerida}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-brand-50 border border-brand-200 rounded-md space-y-2.5">
                    <div className="font-bold text-brand-600 uppercase tracking-wider text-[9px]">
                      ACCIÓN PROPUESTA: {sugerencia.proxima_accion.codigo_accion}
                    </div>
                    <p className="text-ink-700 font-medium leading-relaxed break-words">{sugerencia.proxima_accion.descripcion_sugerida}</p>
                    {sugerencia.sugerencia_tesoreria.rango_descuento_sugerido && (
                      <div className="text-[10px] font-semibold text-ink-600 flex items-start gap-1.5 bg-white px-2.5 py-1.5 rounded-md border border-ink-200">
                        <FileCode className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                        <span className="break-words min-w-0">Descuento sugerido: {sugerencia.sugerencia_tesoreria.rango_descuento_sugerido}</span>
                      </div>
                    )}
                    {sugerencia.viabilidad_financiera.aprobado === false && (
                      <div className="text-[10px] font-semibold text-[#e03e3e] break-words">{sugerencia.viabilidad_financiera.motivo_rechazo}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de transición */}
      {pendingEvento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-lg border border-ink-200 shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-white border-b border-ink-200 flex items-center justify-between">
              <h3 className="font-semibold text-ink-900 text-sm">Confirmar Transición</h3>
              <button onClick={() => setPendingEvento(null)} className="text-ink-400 hover:text-ink-800 text-xs">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-ink-50 border border-ink-200 rounded-md space-y-2">
                <span className="text-[9px] uppercase font-bold text-ink-500">Evento:</span>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="px-2 py-0.5 rounded font-mono border border-ink-200 bg-white text-ink-600">{expediente.estado}</span>
                  <span className="text-ink-400">→</span>
                  <span className="px-2 py-0.5 rounded font-mono border border-brand-200 bg-brand-50 text-brand-600 font-bold">{pendingEvento}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-500 uppercase tracking-wide">Comentarios (opcional)</label>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  placeholder="Justificación u observaciones..."
                  className="w-full h-24 px-3 py-2 bg-white border border-ink-200 focus:border-brand-400 rounded-md text-sm text-ink-800 placeholder-ink-400 focus:outline-none transition-colors"
                />
              </div>
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-ink-200">
                <button onClick={() => setPendingEvento(null)} className="px-4 py-2 border border-ink-200 hover:bg-ink-50 text-ink-600 hover:text-ink-800 rounded-md text-sm font-semibold transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={ejecutarTransicion}
                  disabled={isTransitioning !== null}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-md text-sm font-semibold transition-colors"
                >
                  {isTransitioning ? 'Aplicando...' : 'Confirmar y Aplicar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCumplimiento && (
        <div className="text-[10px] text-ink-400 text-center italic">
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
    <div className="text-[9px] uppercase font-semibold text-ink-500 tracking-wider">{label}</div>
    <div className={`mt-0.5 ${mono ? 'font-mono' : ''} ${highlight ? 'text-brand-600 font-bold text-sm' : 'text-ink-800 font-medium'}`}>
      {value}
    </div>
  </div>
);
