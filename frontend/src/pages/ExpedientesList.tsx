import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Expediente, ExpedienteEstado } from '../types';
import { api } from '../services/api';
import { 
  FolderOpen, Plus, Search, Filter, ArrowUpRight, 
  Activity, CheckCircle, Clock, Ban, AlertOctagon, User, DollarSign, Calendar,
  RefreshCw
} from 'lucide-react';



export const ExpedientesList: React.FC = () => {
  const navigate = useNavigate();
  const { isOperador } = useAuth();
  
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMsg(null);
    api.getExpedientes()
      .then((data) => {
        if (active) {
          setExpedientes(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setErrorMsg(err.message || 'Error al obtener expedientes');
          setIsLoading(false);
        }
      });
    return () => { active = false; };
  }, []);
  
  // State for Create Case Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRuc, setNewRuc] = useState('');
  const [newRazonSocial, setNewRazonSocial] = useState('');
  const [newAutorizacion, setNewAutorizacion] = useState('');
  const [newMonto, setNewMonto] = useState('');
  const [newValorNominal, setNewValorNominal] = useState('');

  // Status badges config
  const statusConfig: Record<ExpedienteEstado, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    RECIBIDO: { 
      label: 'Recibido', 
      bg: 'bg-blue-500/10 border-blue-500/30', 
      text: 'text-blue-400',
      icon: <Clock className="w-3 h-3" /> 
    },
    EN_VALIDACION: { 
      label: 'En Validación', 
      bg: 'bg-amber-500/10 border-amber-500/30', 
      text: 'text-amber-400',
      icon: <Activity className="w-3 h-3 animate-pulse" /> 
    },
    PENDIENTE_DOCUMENTACION: { 
      label: 'Falta Docs', 
      bg: 'bg-indigo-500/10 border-indigo-500/30', 
      text: 'text-indigo-400',
      icon: <AlertOctagon className="w-3 h-3" /> 
    },
    LISTO_PARA_NEGOCIAR: { 
      label: 'Listo Negociar', 
      bg: 'bg-emerald-500/10 border-emerald-500/30', 
      text: 'text-emerald-400',
      icon: <CheckCircle className="w-3 h-3" /> 
    },
    EN_NEGOCIACION: { 
      label: 'En Bolsa', 
      bg: 'bg-purple-500/10 border-purple-500/30', 
      text: 'text-purple-400',
      icon: <ArrowUpRight className="w-3 h-3" /> 
    },
    CERRADO: { 
      label: 'Cerrado', 
      bg: 'bg-slate-500/10 border-slate-500/30', 
      text: 'text-slate-400',
      icon: <CheckCircle className="w-3 h-3" /> 
    },
    RECHAZADO: { 
      label: 'Rechazado', 
      bg: 'bg-red-500/10 border-red-500/30', 
      text: 'text-red-400',
      icon: <Ban className="w-3 h-3" /> 
    },
    CANCELADO: { 
      label: 'Cancelado', 
      bg: 'bg-slate-700/10 border-slate-700/30', 
      text: 'text-slate-400',
      icon: <Ban className="w-3 h-3" /> 
    }
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuc || !newAutorizacion || !newMonto || !newValorNominal || !newRazonSocial) {
      alert('Por favor complete todos los campos');
      return;
    }

    const valNominal = parseFloat(newValorNominal);
    const valMonto = parseFloat(newMonto);

    if (valMonto > valNominal) {
      alert('El monto a negociar no puede exceder el valor nominal');
      return;
    }

    api.crearExpediente({
      cliente_ruc: newRuc,
      razon_social: newRazonSocial.toUpperCase(),
      nota_autorizacion: newAutorizacion,
      valor_nominal: valNominal,
      monto_a_negociar: valMonto,
      usuario: 'Operador Asistido'
    })
    .then((newExp) => {
      setExpedientes(prev => [newExp, ...prev]);
      setIsModalOpen(false);
      setNewRuc('');
      setNewRazonSocial('');
      setNewAutorizacion('');
      setNewMonto('');
      setNewValorNominal('');
    })
    .catch((err: any) => {
      alert(`Error al crear expediente: ${err.message || err}`);
    });
  };

  // Filter list
  const filteredExpedientes = expedientes.filter((exp) => {
    const matchesSearch = 
      exp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.cliente?.ruc.includes(searchTerm) ||
      exp.cliente?.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.nota?.numero_autorizacion.includes(searchTerm);
      
    const matchesStatus = statusFilter === 'ALL' || exp.estado === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate quick metrics
  const totalCases = expedientes.length;
  const inValidationCount = expedientes.filter(e => e.estado === 'EN_VALIDACION').length;
  const readyCount = expedientes.filter(e => e.estado === 'LISTO_PARA_NEGOCIAR').length;
  const totalMontoNegociable = expedientes.reduce((sum, e) => sum + e.monto_a_negociar, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Expedientes de Notas de Crédito
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Asistente inteligente para la validación y negociación de NCD en la Bolsa de Valores.
          </p>
        </div>

        {isOperador && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-brand-500/20 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Expediente</span>
          </button>
        )}
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 flex items-center gap-4 glow-brand">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold tracking-wider">EXPEDIENTES TOTALES</div>
            <div className="text-2xl font-bold text-slate-100 mt-0.5">{totalCases}</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold tracking-wider">EN VALIDACIÓN</div>
            <div className="text-2xl font-bold text-slate-100 mt-0.5">{inValidationCount}</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold tracking-wider">LISTOS NEGOCIAR</div>
            <div className="text-2xl font-bold text-slate-100 mt-0.5">{readyCount}</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold tracking-wider">VALOR A NEGOCIAR</div>
            <div className="text-2xl font-bold text-slate-100 mt-0.5">
              ${totalMontoNegociable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por RUC, Razón Social, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 focus:border-brand-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-colors duration-150"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 mr-1 hidden md:block" />
          {['ALL', 'RECIBIDO', 'EN_VALIDACION', 'PENDIENTE_DOCUMENTACION', 'LISTO_PARA_NEGOCIAR'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                statusFilter === status
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/30 shadow-md shadow-brand-500/5'
                  : 'bg-transparent text-slate-400 border border-transparent hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              {status === 'ALL' ? 'Todos' : statusConfig[status as ExpedienteEstado]?.label || status}
            </button>
          ))}
        </div>
      </div>

      {/* Table of cases */}
      <div className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-900/20 text-slate-400 font-semibold text-xs tracking-wider uppercase">
                <th className="py-4 px-6">ID / Creación</th>
                <th className="py-4 px-6">Cliente (RUC)</th>
                <th className="py-4 px-6">Nota Autorización</th>
                <th className="py-4 px-6 text-right">Monto / Nominal</th>
                <th className="py-4 px-6 text-center">Estado</th>
                <th className="py-4 px-6">Responsable</th>
                <th className="py-4 px-6 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-3" />
                    <p className="font-medium text-slate-405">Cargando expedientes desde la API...</p>
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-red-500 bg-red-950/5">
                    <AlertOctagon className="w-8 h-8 text-red-500 mx-auto mb-3" />
                    <p className="font-semibold text-red-400">{errorMsg}</p>
                    <p className="text-xs text-slate-500 mt-1">Por favor verifica que la API esté activa</p>
                  </td>
                </tr>
              ) : filteredExpedientes.length > 0 ? (
                filteredExpedientes.map((exp) => {
                  const status = statusConfig[exp.estado] || {
                    label: exp.estado,
                    bg: 'bg-slate-800',
                    text: 'text-slate-400',
                    icon: null
                  };
                  
                  return (
                    <tr 
                      key={exp.id}
                      className="hover:bg-slate-800/10 transition-colors duration-100 group"
                    >
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-200 group-hover:text-brand-400 transition-colors duration-150">
                          {exp.id}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(exp.created_at).toLocaleDateString('es-EC')}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-200 truncate max-w-[200px]">
                          {exp.cliente?.razon_social}
                        </div>
                        <div className="text-xs font-mono text-slate-400 mt-0.5">
                          {exp.cliente?.ruc}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-mono text-xs text-slate-400 truncate max-w-[150px]" title={exp.nota?.numero_autorizacion}>
                          {exp.nota?.numero_autorizacion}
                        </div>
                        <div className="text-[10px] px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-slate-500 rounded font-medium mt-1 w-max">
                          {exp.nota?.tipo}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="font-bold text-slate-200">
                          ${exp.monto_a_negociar.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Nominal: ${exp.nota?.valor_nominal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${status.bg} ${status.text}`}>
                          {status.icon}
                          <span>{status.label}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-slate-300">
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 border border-slate-700">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-medium">{exp.responsable}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => navigate(`/expedientes/${exp.id}`)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-brand-600 hover:text-white border border-slate-800 hover:border-brand-500 text-slate-300 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 mx-auto"
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
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <FolderOpen className="w-12 h-12 text-slate-650 mx-auto mb-3" />
                    <p className="font-medium">No se encontraron expedientes</p>
                    <p className="text-xs text-slate-600 mt-1">Intente cambiar el filtro o el término de búsqueda</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-lg">Crear Nuevo Expediente</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateCase} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">RUC Beneficiario</label>
                <input
                  type="text"
                  maxLength={13}
                  required
                  placeholder="ej. 1790012345001"
                  value={newRuc}
                  onChange={(e) => setNewRuc(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 focus:border-brand-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Razón Social</label>
                <input
                  type="text"
                  required
                  placeholder="ej. EMPRESA DE PRUEBA S.A."
                  value={newRazonSocial}
                  onChange={(e) => setNewRazonSocial(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 focus:border-brand-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase">Número Autorización NCD</label>
                <input
                  type="text"
                  maxLength={37}
                  required
                  placeholder="37 dígitos numéricos"
                  value={newAutorizacion}
                  onChange={(e) => setNewAutorizacion(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 focus:border-brand-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Valor Nominal ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={newValorNominal}
                    onChange={(e) => setNewValorNominal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 focus:border-brand-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase">Monto a Negociar ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={newMonto}
                    onChange={(e) => setNewMonto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 focus:border-brand-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-850/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-slate-200 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-brand-500/10 transition-all"
                >
                  Guardar Expediente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
