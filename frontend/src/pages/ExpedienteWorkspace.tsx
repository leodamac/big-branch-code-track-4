import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Activity, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ExpedienteWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { role } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all duration-150"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Workspace de Expediente
              </h1>
              <span className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                {id}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              Visualización y validación inteligente del expediente de nota de crédito.
            </p>
          </div>
        </div>

        <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          <span>Vista activa: {role === 'OPERADOR' ? 'Operador de Valores' : 'Oficial de Cumplimiento'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Placeholder Left Panel: PDF Viewer */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col min-h-[500px]">
          <div className="px-6 py-4 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              <span className="font-semibold text-sm text-slate-200">Visor de Documentos</span>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950/40 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-slate-500">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="font-medium text-slate-300">Documento no seleccionado o cargado</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              En el Path P13 implementaremos el cargador y visor interactivo de PDFs y XMLs.
            </p>
          </div>
        </div>

        {/* Placeholder Right Panel: Workspace form */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-400" />
              Estado del Expediente
            </h3>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Estado actual:</span>
                <span className="px-2 py-0.5 text-xs font-bold font-mono rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  RECIBIDO
                </span>
              </div>
              <div className="h-px bg-slate-800/60" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Responsable:</span>
                <span className="text-slate-200 font-medium">Asignado por IA</span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Riesgos Detectados
            </h3>
            <div className="text-center py-6 text-slate-500 text-sm">
              <p>No se ha iniciado la validación de este expediente.</p>
              {role === 'OPERADOR' ? (
                <button className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-lg hover:shadow-brand-500/10 transition-all duration-200">
                  Iniciar Validación
                </button>
              ) : (
                <p className="text-xs text-slate-600 mt-2">
                  Solo el rol de Operador puede iniciar el flujo de validación.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
