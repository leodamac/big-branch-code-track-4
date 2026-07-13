import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ExpedienteEstado, ExpedienteListItem } from '../types';
import { apiClient, formatMonto } from '../services/apiClient';
import {
  FolderOpen, Search, ArrowUpRight,
  Activity, CheckCircle, Clock, Ban, AlertOctagon, User, FileWarning, Calendar,
  RefreshCw,
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

export const ExpedientesList: React.FC = () => {
  const navigate = useNavigate();

  const [expedientes, setExpedientes] = useState<ExpedienteListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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
  const missingDocsCount = expedientes.filter((e) => e.estado === 'PENDIENTE_DOCUMENTACION').length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          Expedientes de Notas de Crédito
        </h1>
        <p className="text-ink-500 text-sm mt-1">
          Asistente inteligente para la validación y negociación de NCD extraídas del SRI.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`panel p-3.5 sm:p-4 rounded-lg flex items-center gap-3 sm:gap-3.5 min-w-0 text-left transition-shadow duration-150 hover:shadow-sm ${
            statusFilter === 'ALL' ? 'ring-2 ring-brand-400' : ''
          }`}
        >
          <div className="w-10 h-10 shrink-0 rounded-md bg-brand-50 flex items-center justify-center text-brand-600">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-ink-500 font-medium tracking-wide truncate">EXPEDIENTES TOTALES</div>
            <div className="text-xl sm:text-2xl font-semibold text-ink-900 mt-0.5">{totalCases}</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'EN_VALIDACION' ? 'ALL' : 'EN_VALIDACION')}
          className={`panel p-3.5 sm:p-4 rounded-lg flex items-center gap-3 sm:gap-3.5 min-w-0 text-left transition-shadow duration-150 hover:shadow-sm ${
            statusFilter === 'EN_VALIDACION' ? 'ring-2 ring-[#9f6a00]' : ''
          }`}
        >
          <div className="w-10 h-10 shrink-0 rounded-md bg-[#fbf3db] flex items-center justify-center text-[#9f6a00]">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-ink-500 font-medium tracking-wide truncate">EN VALIDACIÓN</div>
            <div className="text-xl sm:text-2xl font-semibold text-ink-900 mt-0.5">{inValidationCount}</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'LISTO_PARA_NEGOCIAR' ? 'ALL' : 'LISTO_PARA_NEGOCIAR')}
          className={`panel p-3.5 sm:p-4 rounded-lg flex items-center gap-3 sm:gap-3.5 min-w-0 text-left transition-shadow duration-150 hover:shadow-sm ${
            statusFilter === 'LISTO_PARA_NEGOCIAR' ? 'ring-2 ring-[#0f7b6c]' : ''
          }`}
        >
          <div className="w-10 h-10 shrink-0 rounded-md bg-[#ddedea] flex items-center justify-center text-[#0f7b6c]">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-ink-500 font-medium tracking-wide truncate">LISTOS NEGOCIAR</div>
            <div className="text-xl sm:text-2xl font-semibold text-ink-900 mt-0.5">{readyCount}</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'PENDIENTE_DOCUMENTACION' ? 'ALL' : 'PENDIENTE_DOCUMENTACION')}
          className={`panel p-3.5 sm:p-4 rounded-lg flex items-center gap-3 sm:gap-3.5 min-w-0 text-left transition-shadow duration-150 hover:shadow-sm ${
            statusFilter === 'PENDIENTE_DOCUMENTACION' ? 'ring-2 ring-[#6940a5]' : ''
          }`}
        >
          <div className="w-10 h-10 shrink-0 rounded-md bg-[#eae4f2] flex items-center justify-center text-[#6940a5]">
            <FileWarning className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-ink-500 font-medium tracking-wide truncate">FALTA DOCS</div>
            <div className="text-xl sm:text-2xl font-semibold text-ink-900 mt-0.5">{missingDocsCount}</div>
          </div>
        </button>
      </div>

      <div className="bg-ink-50 p-3.5 rounded-lg border border-ink-200">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
          <input
            type="text"
            placeholder="Buscar por RUC, Razón Social, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-ink-200 hover:border-ink-300 focus:border-brand-400 rounded-md text-sm text-ink-800 placeholder-ink-400 focus:outline-none transition-colors duration-150"
          />
        </div>
      </div>

      <div className="panel rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50 text-ink-500 font-semibold text-xs tracking-wide uppercase">
                <th className="py-3 px-6">ID / Creación</th>
                <th className="py-3 px-6">Cliente (RUC)</th>
                <th className="py-3 px-6">Nota Autorización</th>
                <th className="py-3 px-6 text-right">Monto a Negociar</th>
                <th className="py-3 px-6 text-center">Estado</th>
                <th className="py-3 px-6">Responsable</th>
                <th className="py-3 px-6 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-200 text-ink-700 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-500">
                    <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-3" />
                    <p className="font-medium">Cargando expedientes desde la API...</p>
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center bg-[#fbe4e4]/20">
                    <AlertOctagon className="w-6 h-6 text-[#e03e3e] mx-auto mb-3" />
                    <p className="font-semibold text-[#e03e3e]">{errorMsg}</p>
                    <p className="text-xs text-ink-500 mt-1">Verifica que el backend esté corriendo en {import.meta.env.VITE_API_URL || 'http://localhost:8000'}</p>
                  </td>
                </tr>
              ) : filteredExpedientes.length > 0 ? (
                filteredExpedientes.map((exp) => {
                  const status = statusConfig[exp.estado] || { label: exp.estado, bg: 'bg-ink-100', text: 'text-ink-600', icon: null };
                  return (
                    <tr key={exp.id} className="hover:bg-ink-50 transition-colors duration-100 group">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-ink-800 group-hover:text-brand-600 transition-colors duration-150 font-mono text-xs" title={exp.id}>
                          {exp.id.slice(0, 8)}…
                        </div>
                        <div className="text-xs text-ink-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(exp.created_at).toLocaleDateString('es-EC')}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-ink-800 truncate max-w-[200px]">{exp.cliente.razon_social}</div>
                        <div className="text-xs font-mono text-ink-500 mt-0.5">{exp.cliente.ruc}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-mono text-xs text-ink-500 truncate max-w-[150px]" title={exp.nota_credito.numero_autorizacion}>
                          {exp.nota_credito.numero_autorizacion}
                        </div>
                        <div className="text-[10px] px-1.5 py-0.5 bg-ink-100 text-ink-600 rounded font-medium mt-1 w-max">
                          {exp.nota_credito.tipo}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="font-semibold text-ink-800">${formatMonto(exp.monto_a_negociar)}</div>
                        <div className="text-xs text-ink-500 mt-0.5">Nominal: ${formatMonto(exp.nota_credito.valor_nominal)}</div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}`}>
                          {status.icon}
                          <span>{status.label}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-ink-700">
                          <div className="w-6 h-6 rounded-full bg-ink-100 flex items-center justify-center text-xs text-ink-500">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium">{exp.responsable}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => navigate(`/expedientes/${exp.id}`)}
                          className="px-3 py-1.5 bg-white hover:bg-brand-600 hover:text-white border border-ink-200 hover:border-brand-600 text-ink-700 rounded-md text-xs font-semibold transition-colors duration-150 flex items-center gap-1.5 mx-auto"
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
                  <td colSpan={7} className="py-12 text-center text-ink-500">
                    <FolderOpen className="w-10 h-10 text-ink-300 mx-auto mb-3" />
                    <p className="font-medium">No se encontraron expedientes</p>
                    <p className="text-xs text-ink-400 mt-1">
                      El pipeline los va creando solo desde el SRI cada pocos segundos.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
