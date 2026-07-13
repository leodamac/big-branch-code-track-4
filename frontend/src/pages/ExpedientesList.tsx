import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import type { ExpedienteEstado, ExpedienteListItem, EstadoRuc, TipoNotaCredito } from '../types';

import { apiClient, ApiError, formatMonto } from '../services/apiClient';

import {

  FolderOpen, Plus, Search, Filter, ArrowUpRight,

  Activity, CheckCircle, Clock, Ban, AlertOctagon, User, DollarSign, Calendar,

  RefreshCw

} from 'lucide-react';



const POLL_INTERVAL_MS = 7000;



const statusConfig: Record<ExpedienteEstado, { label: string; bg: string; text: string; icon: React.ReactNode }> = {

  RECIBIDO: { label: 'Recibido', bg: 'bg-[#e7f3f8]', text: 'text-[#0b6e99]', icon: <Clock className="w-3 h-3" /> },

  EN_VALIDACION: { label: 'En Validación', bg: 'bg-[#fbf3db]', text: 'text-[#9f6a00]', icon: <Activity className="w-3 h-3 animate-pulse" /> },

  PENDIENTE_DOCUMENTACION: { label: 'Falta Docs', bg: 'bg-[#eae4f2]', text: 'text-[#6940a5]', icon: <AlertOctagon className="w-3 h-3" /> },

  LISTO_PARA_NEGOCIAR: { label: 'Listo Negociar', bg: 'bg-[#ddedea]', text: 'text-[#0f7b6c]', icon: <CheckCircle className="w-3 h-3" /> },

  EN_NEGOCIACION: { label: 'En Bolsa', bg: 'bg-[#f4dfeb]', text: 'text-[#ad1a72]', icon: <ArrowUpRight className="w-3 h-3" /> },

  CERRADO: { label: 'Cerrado', bg: 'bg-ink-100', text: 'text-ink-600', icon: <CheckCircle className="w-3 h-3" /> },

  RECHAZADO: { label: 'Rechazado', bg: 'bg-[#fbe4e4]', text: 'text-[#e03e3e]', icon: <Ban className="w-3 h-3" /> },

  CANCELADO: { label: 'Cancelado', bg: 'bg-ink-100', text: 'text-ink-500', icon: <Ban className="w-3 h-3" /> },

};



const emptyForm = {

  cliente_ruc: '',

  razon_social: '',

  estado_ruc: 'ACTIVO' as EstadoRuc,

  numero_autorizacion: '',

  tipo: 'NCD' as TipoNotaCredito,

  valor_nominal: '',

  saldo_disponible: '',

  monto_a_negociar: '',

};



export const ExpedientesList: React.FC = () => {

  const navigate = useNavigate();

  const { isOperador, role } = useAuth();



  const [expedientes, setExpedientes] = useState<ExpedienteListItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [statusFilter, setStatusFilter] = useState<string>('ALL');



  const [isModalOpen, setIsModalOpen] = useState(false);

  const [form, setForm] = useState(emptyForm);

  const [isSaving, setIsSaving] = useState(false);

  const [saveError, setSaveError] = useState<string | null>(null);



  const isFirstLoad = useRef(true);



  const fetchExpedientes = useCallback(async () => {

    try {

      const data = await apiClient.expedientes.listar();

      setExpedientes(data);

      setErrorMsg(null);

    } catch (err) {

      setErrorMsg(err instanceof Error ? err.message : 'Error al obtener expedientes');

    } finally {

      if (isFirstLoad.current) {

        setIsLoading(false);

        isFirstLoad.current = false;

      }

    }

  }, []);



  useEffect(() => {

    fetchExpedientes();

    const interval = setInterval(fetchExpedientes, POLL_INTERVAL_MS);

    return () => clearInterval(interval);

  }, [fetchExpedientes]);



  const resetForm = () => {

    setForm(emptyForm);

    setSaveError(null);

  };



  const handleCreateCase = async (e: React.FormEvent) => {

    e.preventDefault();

    setSaveError(null);



    const valorNominal = parseFloat(form.valor_nominal);

    const saldoDisponible = parseFloat(form.saldo_disponible);

    const montoNegociar = parseFloat(form.monto_a_negociar);



    if (montoNegociar > saldoDisponible) {

      setSaveError('El monto a negociar no puede exceder el saldo disponible.');

      return;

    }



    setIsSaving(true);

    try {

      await apiClient.expedientes.crear({

        cliente_ruc: form.cliente_ruc,

        razon_social: form.razon_social.toUpperCase(),

        estado_ruc: form.estado_ruc,

        nota: {

          numero_autorizacion: form.numero_autorizacion,

          ruc_beneficiario: form.cliente_ruc,

          valor_nominal: valorNominal,

          saldo_disponible: saldoDisponible,

          tipo: form.tipo,

          historial_endosos: [],

        },

        monto_a_negociar: montoNegociar,

        responsable: role === 'OPERADOR' ? 'Operador de Valores' : 'Oficial de Cumplimiento',

      });

      setIsModalOpen(false);

      resetForm();

      fetchExpedientes();

    } catch (err) {

      if (err instanceof ApiError) {

        setSaveError(err.status === 409 ? err.message : `Error al crear expediente: ${err.message}`);

      } else {

        setSaveError('Error inesperado al crear el expediente.');

      }

    } finally {

      setIsSaving(false);

    }

  };



  const filteredExpedientes = expedientes.filter((exp) => {

    const term = searchTerm.toLowerCase();

    const matchesSearch =

      exp.id.toLowerCase().includes(term) ||

      exp.cliente.ruc.includes(searchTerm) ||

      exp.cliente.razon_social.toLowerCase().includes(term) ||

      exp.nota_credito.numero_autorizacion.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || exp.estado === statusFilter;

    return matchesSearch && matchesStatus;

  });



  const totalCases = expedientes.length;

  const inValidationCount = expedientes.filter((e) => e.estado === 'EN_VALIDACION').length;

  const readyCount = expedientes.filter((e) => e.estado === 'LISTO_PARA_NEGOCIAR').length;

  const totalMontoNegociable = expedientes.reduce((sum, e) => sum + parseFloat(e.monto_a_negociar), 0);



  return (

    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in space-y-8">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>

          <h1 className="text-3xl font-bold tracking-tight text-ink-900 text-ink-800 font-bold">

            Expedientes de Notas de Crédito

          </h1>

          <p className="text-ink-500 text-sm mt-1">

            Asistente inteligente para la validación y negociación de NCD en la Bolsa de Valores.

          </p>

        </div>



        {isOperador && (

          <button

            onClick={() => navigate('/expedientes/nuevo')}

            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-ink-900 rounded-xl text-sm font-semibold shadow-lg hover:shadow-brand-500/20 transition-all duration-200"

          >

            <Plus className="w-4 h-4" />

            <span>Crear Expediente (manual)</span>

          </button>

        )}

      </div>



      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="glass-panel p-5 rounded-2xl border border-ink-200/80 flex items-center gap-4 glow-brand">

          <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">

            <FolderOpen className="w-6 h-6" />

          </div>

          <div>

            <div className="text-xs text-ink-400 font-semibold tracking-wider">EXPEDIENTES TOTALES</div>

            <div className="text-2xl font-bold text-ink-800 mt-0.5">{totalCases}</div>

          </div>

        </div>



        <div className="glass-panel p-5 rounded-2xl border border-ink-200/80 flex items-center gap-4">

          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">

            <Activity className="w-6 h-6 animate-pulse" />

          </div>

          <div>

            <div className="text-xs text-ink-400 font-semibold tracking-wider">EN VALIDACIÓN</div>

            <div className="text-2xl font-bold text-ink-800 mt-0.5">{inValidationCount}</div>

          </div>

        </div>



        <div className="glass-panel p-5 rounded-2xl border border-ink-200/80 flex items-center gap-4">

          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">

            <CheckCircle className="w-6 h-6" />

          </div>

          <div>

            <div className="text-xs text-ink-400 font-semibold tracking-wider">LISTOS NEGOCIAR</div>

            <div className="text-2xl font-bold text-ink-800 mt-0.5">{readyCount}</div>

          </div>

        </div>



        <div className="glass-panel p-5 rounded-2xl border border-ink-200/80 flex items-center gap-4">

          <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">

            <DollarSign className="w-6 h-6" />

          </div>

          <div>

            <div className="text-xs text-ink-400 font-semibold tracking-wider">VALOR A NEGOCIAR</div>

            <div className="text-2xl font-bold text-ink-800 mt-0.5">${formatMonto(totalMontoNegociable)}</div>

          </div>

        </div>

      </div>



      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-ink-50/40 p-4 rounded-2xl border border-ink-200/80">

        <div className="relative w-full sm:w-80">

          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />

          <input

            type="text"

            placeholder="Buscar por RUC, Razón Social, ID..."

            value={searchTerm}

            onChange={(e) => setSearchTerm(e.target.value)}

            className="w-full pl-10 pr-4 py-2 bg-white/80 border border-ink-200 hover:border-ink-300/80 focus:border-brand-500/60 rounded-xl text-sm text-ink-700 placeholder-slate-500 focus:outline-none transition-colors duration-150"

          />

        </div>



        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">

          <Filter className="w-3.5 h-3.5 text-ink-400 mr-1 hidden md:block" />

          {['ALL', 'RECIBIDO', 'EN_VALIDACION', 'PENDIENTE_DOCUMENTACION', 'LISTO_PARA_NEGOCIAR'].map((status) => (

            <button

              key={status}

              onClick={() => setStatusFilter(status)}

              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${

                statusFilter === status

                  ? 'bg-brand-50 text-brand-600 border border-brand-200 shadow-md shadow-brand-500/5'

                  : 'bg-transparent text-ink-500 border border-transparent hover:text-ink-700 hover:bg-ink-100'

              }`}

            >

              {status === 'ALL' ? 'Todos' : statusConfig[status as ExpedienteEstado]?.label || status}

            </button>

          ))}

        </div>

      </div>



      <div className="glass-panel rounded-2xl border border-ink-200/80 overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full border-collapse text-left">

            <thead>

              <tr className="border-b border-ink-200/80 bg-ink-50/20 text-ink-500 font-semibold text-xs tracking-wider uppercase">

                <th className="py-4 px-6">ID / Creación</th>

                <th className="py-4 px-6">Cliente (RUC)</th>

                <th className="py-4 px-6">Nota Autorización</th>

                <th className="py-4 px-6 text-right">Monto / Nominal</th>

                <th className="py-4 px-6 text-center">Estado</th>

                <th className="py-4 px-6">Responsable</th>

                <th className="py-4 px-6 text-center">Acción</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-800/60 text-ink-600 text-sm">

              {isLoading ? (

                <tr>

                  <td colSpan={7} className="py-12 text-center text-ink-400">

                    <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />

                    <p className="font-medium">Cargando expedientes desde la API...</p>

                  </td>

                </tr>

              ) : errorMsg ? (

                <tr>

                  <td colSpan={7} className="py-12 text-center text-red-500 bg-red-50">

                    <AlertOctagon className="w-8 h-8 text-red-500 mx-auto mb-3" />

                    <p className="font-semibold text-red-700">{errorMsg}</p>

                    <p className="text-xs text-ink-400 mt-1">Verifica que el backend esté corriendo en {import.meta.env.VITE_API_URL || 'http://localhost:8000'}</p>

                  </td>

                </tr>

              ) : filteredExpedientes.length > 0 ? (

                filteredExpedientes.map((exp) => {

                  const status = statusConfig[exp.estado] || { label: exp.estado, bg: 'bg-ink-200', text: 'text-ink-500', icon: null };

                  return (

                    <tr key={exp.id} className="hover:bg-ink-200/10 transition-colors duration-100 group">

                      <td className="py-4 px-6">

                        <div className="font-semibold text-ink-700 group-hover:text-brand-600 transition-colors duration-150 font-mono text-xs" title={exp.id}>

                          {exp.id.slice(0, 8)}…

                        </div>

                        <div className="text-xs text-ink-400 flex items-center gap-1 mt-1">

                          <Calendar className="w-3 h-3" />

                          <span>{new Date(exp.created_at).toLocaleDateString('es-EC')}</span>

                        </div>

                      </td>

                      <td className="py-4 px-6">

                        <div className="font-medium text-ink-700 truncate max-w-[200px]">{exp.cliente.razon_social}</div>

                        <div className="text-xs font-mono text-ink-500 mt-0.5">{exp.cliente.ruc}</div>

                      </td>

                      <td className="py-4 px-6">

                        <div className="font-mono text-xs text-ink-500 truncate max-w-[150px]" title={exp.nota_credito.numero_autorizacion}>

                          {exp.nota_credito.numero_autorizacion}

                        </div>

                        <div className="text-[10px] px-1.5 py-0.5 bg-ink-50 border border-ink-200 text-ink-400 rounded font-medium mt-1 w-max">

                          {exp.nota_credito.tipo}

                        </div>

                      </td>

                      <td className="py-4 px-6 text-right">

                        <div className="font-bold text-ink-700">${formatMonto(exp.monto_a_negociar)}</div>

                        <div className="text-xs text-ink-400 mt-0.5">Nominal: ${formatMonto(exp.nota_credito.valor_nominal)}</div>

                      </td>

                      <td className="py-4 px-6 text-center">

                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.bg} ${status.text}`}>

                          {status.icon}

                          <span>{status.label}</span>

                        </span>

                      </td>

                      <td className="py-4 px-6">

                        <div className="flex items-center gap-2 text-ink-600">

                          <div className="w-6 h-6 rounded-full bg-ink-200 flex items-center justify-center text-xs text-ink-500 border border-ink-300">

                            <User className="w-3.5 h-3.5" />

                          </div>

                          <span className="font-medium">{exp.responsable}</span>

                        </div>

                      </td>

                      <td className="py-4 px-6 text-center">

                        <button

                          onClick={() => navigate(`/expedientes/${exp.id}`)}

                          className="px-3 py-1.5 bg-ink-50 hover:bg-brand-600 hover:text-ink-900 border border-ink-200 hover:border-brand-500 text-ink-600 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 mx-auto"

                        >

                          <span>Ver Detalle</span>

                          <ArrowUpRight className="w-3.5 h-3.5" />

                        </button>

                      </td>

                    </tr>

                  );

                })

              ) : (

                <tr>

                  <td colSpan={7} className="py-12 text-center text-ink-400">

                    <FolderOpen className="w-12 h-12 text-slate-650 mx-auto mb-3" />

                    <p className="font-medium">No se encontraron expedientes</p>

                    <p className="text-xs text-ink-400 mt-1">

                      El pipeline los va creando solo desde el SRI cada pocos segundos — o crea uno manual arriba.

                    </p>

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>



      {isModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm animate-fade-in">

          <div className="w-full max-w-lg glass-panel rounded-2xl border border-ink-200 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">

            <div className="px-6 py-4 bg-ink-50/40 border-b border-ink-200/80 flex items-center justify-between sticky top-0">

              <h3 className="font-bold text-ink-700 text-lg">Crear Expediente Manual</h3>

              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-ink-500 hover:text-ink-700 text-sm">✕</button>

            </div>



            <form onSubmit={handleCreateCase} className="p-6 space-y-4">

              {saveError && (

                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">{saveError}</div>

              )}



              <div className="grid grid-cols-2 gap-4">

                <div className="space-y-1.5">

                  <label className="text-xs font-semibold text-ink-500 uppercase">RUC Cliente</label>

                  <input type="text" maxLength={13} required placeholder="1790012345001" value={form.cliente_ruc}

                    onChange={(e) => setForm((f) => ({ ...f, cliente_ruc: e.target.value.replace(/\D/g, '') }))}

                    className="w-full px-3 py-2 bg-white border border-ink-200 focus:border-brand-500/60 rounded-xl text-sm text-ink-700 placeholder-slate-600 focus:outline-none transition-colors" />

                </div>

                <div className="space-y-1.5">

                  <label className="text-xs font-semibold text-ink-500 uppercase">Estado RUC</label>

                  <select value={form.estado_ruc} onChange={(e) => setForm((f) => ({ ...f, estado_ruc: e.target.value as EstadoRuc }))}

                    className="w-full px-3 py-2 bg-white border border-ink-200 focus:border-brand-500/60 rounded-xl text-sm text-ink-700 focus:outline-none transition-colors">

                    <option value="ACTIVO">ACTIVO</option>

                    <option value="SUSPENDIDO">SUSPENDIDO</option>

                  </select>

                </div>

              </div>



              <div className="space-y-1.5">

                <label className="text-xs font-semibold text-ink-500 uppercase">Razón Social</label>

                <input type="text" required placeholder="EMPRESA DE PRUEBA S.A." value={form.razon_social}

                  onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))}

                  className="w-full px-3 py-2 bg-white border border-ink-200 focus:border-brand-500/60 rounded-xl text-sm text-ink-700 placeholder-slate-600 focus:outline-none transition-colors" />

              </div>



              <div className="grid grid-cols-2 gap-4">

                <div className="space-y-1.5">

                  <label className="text-xs font-semibold text-ink-500 uppercase">Número Autorización</label>

                  <input type="text" maxLength={37} required placeholder="37 dígitos" value={form.numero_autorizacion}

                    onChange={(e) => setForm((f) => ({ ...f, numero_autorizacion: e.target.value.replace(/\D/g, '') }))}

                    className="w-full px-3 py-2 bg-white border border-ink-200 focus:border-brand-500/60 rounded-xl text-sm text-ink-700 placeholder-slate-600 focus:outline-none transition-colors" />

                </div>

                <div className="space-y-1.5">

                  <label className="text-xs font-semibold text-ink-500 uppercase">Tipo Nota</label>

                  <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoNotaCredito }))}

                    className="w-full px-3 py-2 bg-white border border-ink-200 focus:border-brand-500/60 rounded-xl text-sm text-ink-700 focus:outline-none transition-colors">

                    <option value="NCD">NCD</option>

                    <option value="NCD_ISD">NCD_ISD</option>

                  </select>

                </div>

              </div>



              <div className="grid grid-cols-3 gap-4">

                <div className="space-y-1.5">

                  <label className="text-xs font-semibold text-ink-500 uppercase">Valor Nominal ($)</label>

                  <input type="number" step="0.01" min="0.01" required placeholder="0.00" value={form.valor_nominal}

                    onChange={(e) => setForm((f) => ({ ...f, valor_nominal: e.target.value }))}

                    className="w-full px-3 py-2 bg-white border border-ink-200 focus:border-brand-500/60 rounded-xl text-sm text-ink-700 placeholder-slate-600 focus:outline-none transition-colors" />

                </div>

                <div className="space-y-1.5">

                  <label className="text-xs font-semibold text-ink-500 uppercase">Saldo Disp. ($)</label>

                  <input type="number" step="0.01" min="0.01" required placeholder="0.00" value={form.saldo_disponible}

                    onChange={(e) => setForm((f) => ({ ...f, saldo_disponible: e.target.value }))}

                    className="w-full px-3 py-2 bg-white border border-ink-200 focus:border-brand-500/60 rounded-xl text-sm text-ink-700 placeholder-slate-600 focus:outline-none transition-colors" />

                </div>

                <div className="space-y-1.5">

                  <label className="text-xs font-semibold text-ink-500 uppercase">Monto Negociar ($)</label>

                  <input type="number" step="0.01" min="0.01" required placeholder="0.00" value={form.monto_a_negociar}

                    onChange={(e) => setForm((f) => ({ ...f, monto_a_negociar: e.target.value }))}

                    className="w-full px-3 py-2 bg-white border border-ink-200 focus:border-brand-500/60 rounded-xl text-sm text-ink-700 placeholder-slate-600 focus:outline-none transition-colors" />

                </div>

              </div>



              <div className="pt-4 flex items-center justify-end gap-3 border-t border-ink-200/60">

                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }}

                  className="px-4 py-2 border border-ink-200 hover:border-ink-300 text-ink-500 hover:text-ink-700 rounded-xl text-sm font-semibold transition-all">

                  Cancelar

                </button>

                <button type="submit" disabled={isSaving}

                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:opacity-50 text-ink-900 rounded-xl text-sm font-semibold shadow-lg hover:shadow-brand-500/10 transition-all">

                  {isSaving ? 'Guardando...' : 'Guardar Expediente'}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

};

