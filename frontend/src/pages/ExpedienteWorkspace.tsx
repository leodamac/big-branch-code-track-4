import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { EndosantesTimeline } from '../components/EndosantesTimeline';
import type { 
  Expediente, ExpedienteEstado, Documento, Riesgo, Endoso, TipoDocumento, RiesgoNivel 
} from '../types';
import { 
  ArrowLeft, FileText, Activity, AlertTriangle, CheckCircle, Clock, 
  Ban, Shield, ArrowUpRight, Upload, Check, Edit2, AlertOctagon,
  ChevronDown, ChevronUp, FileCode, CheckSquare, RefreshCw, Layers
} from 'lucide-react';

// Help functions to calculate mock risks based on current data
const getInitialDocuments = (expId: string): Documento[] => {
  const baseDocs: Partial<Documento>[] = [
    { tipo: 'CEDULA', es_activo: true, version: 1 },
    { tipo: 'PAPELETA', es_activo: true, version: 1 },
    { tipo: 'NOTA', es_activo: true, version: 1 }
  ];

  if (expId === 'EXP-2026-002' || expId === 'EXP-2026-004') {
    baseDocs.push(
      { tipo: 'CERTIFICADO', es_activo: true, version: 1 },
      { tipo: 'PLANILLA', es_activo: true, version: 1 },
      { tipo: 'KYC', es_activo: true, version: 1 },
      { tipo: 'CESION', es_activo: true, version: 1 }
    );
  }

  return baseDocs.map((d, i) => ({
    id: `doc-${expId}-${i}`,
    expediente_id: expId,
    tipo: d.tipo as TipoDocumento,
    version: d.version || 1,
    storage_path: `/uploads/mock-${d.tipo?.toLowerCase()}.pdf`,
    hash_sha256: `hash-sha256-mock-${d.tipo}-${expId}`,
    es_activo: true,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString()
  }));
};

const getInitialEndosos = (expId: string, clientRuc: string): Endoso[] => {
  if (expId === 'EXP-2026-001') {
    return [
      {
        endosante: "1790012345001",
        razonSocialEndosante: "EMPRESA DE PRUEBA S.A.",
        endosatario: "1790056789001",
        razonSocialEndosatario: "EMPRESA COMPRADORA C.A.",
        fecha: "2026-03-10",
        valido: true
      }
    ];
  }
  if (expId === 'EXP-2026-004') {
    return [
      {
        endosante: "1790012345001",
        razonSocialEndosante: "EMPRESA DE PRUEBA S.A.",
        endosatario: "1790056789001",
        razonSocialEndosatario: "EMPRESA COMPRADORA C.A.",
        fecha: "2026-02-15",
        valido: true
      },
      {
        endosante: "1790056789001",
        razonSocialEndosante: "EMPRESA COMPRADORA C.A.",
        endosatario: clientRuc, // matches client RUC
        razonSocialEndosatario: "EMPRESA DE PRUEBA S.A.",
        fecha: "2026-03-20",
        valido: true
      }
    ];
  }
  return [];
};

export const ExpedienteWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { role, isOperador, isCumplimiento } = useAuth();

  // Load expediente from localStorage

  const [expediente, setExpediente] = useState<Expediente | null>(null);

  // Workspace-specific state
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [endosos, setEndosos] = useState<Endoso[]>([]);
  
  // Form editing state
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    ruc: '',
    razon_social: '',
    numero_autorizacion: '',
    tipo: 'NCD',
    valor_nominal: 0,
    saldo_disponible: 0,
    monto_a_negociar: 0
  });

  // Confirmed fields checklist (✔)
  const [confirmedFields, setConfirmedFields] = useState<Record<string, boolean>>({
    ruc: false,
    razon_social: false,
    numero_autorizacion: false,
    tipo: false,
    valor_nominal: false,
    saldo_disponible: false,
    monto_a_negociar: false
  });

  // Data sources
  const [fieldSources, setFieldSources] = useState<Record<string, 'IA' | 'REUTILIZADO' | 'MANUAL'>>({
    ruc: 'IA',
    razon_social: 'REUTILIZADO',
    numero_autorizacion: 'IA',
    tipo: 'IA',
    valor_nominal: 'IA',
    saldo_disponible: 'IA',
    monto_a_negociar: 'MANUAL'
  });

  // Simulation states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingDocType, setUploadingDocType] = useState<TipoDocumento | null>(null);
  
  // Risks state
  const [risks, setRisks] = useState<Riesgo[]>([]);
  const [showLowRisks, setShowLowRisks] = useState(false);

  // Suggestion & actions state
  const [sugerencia, setSugerencia] = useState<{
    codigo_accion: 'PREPARAR_ORDEN' | 'SOLICITAR_CORRECCION_MONTO' | 'ENVIAR_CUMPLIMIENTO' | 'VERIFICAR_ENDOSOS';
    descripcion_sugerida: string;
    rango_descuento_sugerido?: string;
  } | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [modalActionComments, setModalActionComments] = useState('');

  // Initial load
  useEffect(() => {
    let active = true;
    api.getExpedienteById(id!)
      .then((data) => {
        if (!active) return;
        setExpediente(data);
        setFormData({
          ruc: data.cliente?.ruc || '',
          razon_social: data.cliente?.razon_social || '',
          numero_autorizacion: data.nota?.numero_autorizacion || '',
          tipo: data.nota?.tipo || 'NCD',
          valor_nominal: data.nota?.valor_nominal || 0,
          saldo_disponible: data.nota?.saldo_disponible || 0,
          monto_a_negociar: data.monto_a_negociar || 0
        });

        // Initialize documents and endorsements
        const docs = getInitialDocuments(data.id);
        const endos = getInitialEndosos(data.id, data.cliente?.ruc || '');
        setDocuments(docs);
        setEndosos(endos);

        // Fetch risks and suggestions
        reloadRisksAndSuggestions(data.id);
      })
      .catch((err) => {
        console.error('Error loading expediente:', err);
      });



    return () => { active = false; };
  }, [id]);

  const reloadRisksAndSuggestions = (expId: string) => {
    api.getRiesgos(expId)
      .then((risksList) => {
        setRisks(risksList);
      })
      .catch(console.error);

    api.getSugerencia(expId)
      .then((sug) => {
        setSugerencia({
          codigo_accion: sug.proxima_accion.codigo_accion as any,
          descripcion_sugerida: sug.proxima_accion.descripcion_sugerida,
          rango_descuento_sugerido: sug.sugerencia_tesoreria.rango_descuento_sugerido
        });
      })
      .catch(console.error);
  };

  // Recalculate risks and suggestions dynamically when data or docs change
  useEffect(() => {
    if (!expediente) return;

    const newRisks: Riesgo[] = [];

    // Rule 1: Monto a negociar > Saldo disponible
    if (formData.monto_a_negociar > formData.saldo_disponible) {
      newRisks.push({
        id: 'r-monto-excede',
        expediente_id: expediente.id,
        descripcion: 'El monto solicitado a negociar excede el saldo disponible de la nota de crédito (Regla R1).',
        nivel: 'ALTO',
        estado: 'ABIERTO',
        regla_activadora: 'R1',
        created_at: new Date().toISOString()
      } as any);
    }

    // Rule MSG-15: Chain of endorsements broken
    // Check if there are endorsements, and if the last endosatario matches current client RUC
    if (endosos.length > 0) {
      const lastEndoso = endosos[endosos.length - 1];
      if (lastEndoso.endosatario !== formData.ruc) {
        newRisks.push({
          id: 'r-endoso-roto',
          expediente_id: expediente.id,
          descripcion: `El RUC del cliente (${formData.ruc}) no coincide con el último endosatario de la Nota (${lastEndoso.endosatario}). Cadena rota.`,
          nivel: 'CRITICO',
          estado: 'ABIERTO',
          regla_activadora: 'MSG-15',
          created_at: new Date().toISOString()
        } as any);
      }
    }

    // Rule R12: Check document completeness
    const requiredDocs: TipoDocumento[] = ['CEDULA', 'PAPELETA', 'CERTIFICADO', 'PLANILLA', 'KYC', 'CESION', 'NOTA'];
    const uploadedTypes = documents.map(d => d.tipo);
    const missingDocs = requiredDocs.filter(t => !uploadedTypes.includes(t));

    if (missingDocs.length > 0) {
      newRisks.push({
        id: 'r-docs-faltantes',
        expediente_id: expediente.id,
        descripcion: `Falta documentación obligatoria: ${missingDocs.join(', ')}.`,
        nivel: 'MEDIO',
        estado: 'ABIERTO',
        regla_activadora: 'R12',
        created_at: new Date().toISOString()
      } as any);
    }

    // General low risk information (informative)
    newRisks.push({
      id: 'r-info-sri',
      expediente_id: expediente.id,
      descripcion: 'Validación automatizada del SRI completada contra fuentes simuladas.',
      nivel: 'BAJO',
      estado: 'ABIERTO',
      regla_activadora: 'R5',
      created_at: new Date().toISOString()
    } as any);

    setRisks(newRisks);

    // Calculate suggestions (Analista de Tesorería mock agent)
    const hasCritical = newRisks.some(r => r.nivel === 'CRITICO');
    const hasHigh = newRisks.some(r => r.nivel === 'ALTO');

    if (hasCritical) {
      setSugerencia({
        codigo_accion: 'VERIFICAR_ENDOSOS',
        descripcion_sugerida: 'Revisar la cadena de endosos. El RUC del cliente no coincide con el último beneficiario. Enviar a Cumplimiento para aprobación especial.',
      });
    } else if (hasHigh) {
      setSugerencia({
        codigo_accion: 'SOLICITAR_CORRECCION_MONTO',
        descripcion_sugerida: 'Corregir el monto a negociar. El monto solicitado excede el saldo disponible actual del título.',
      });
    } else if (missingDocs.length > 0) {
      setSugerencia({
        codigo_accion: 'SOLICITAR_CORRECCION_MONTO', // Fallback, could be "SOLICITAR_DOCUMENTACION"
        descripcion_sugerida: 'Solicitar documentos pendientes al cliente para completar el expediente normativo.',
      });
    } else {
      setSugerencia({
        codigo_accion: 'PREPARAR_ORDEN',
        descripcion_sugerida: 'Preparar borrador de orden de negociación. Todos los riesgos críticos están resueltos y los documentos están completos.',
        rango_descuento_sugerido: formData.tipo === 'NCD_ISD' ? 'Descuento sugerido: 8.5% - 11.0% (Menor Liquidez ISD)' : 'Descuento sugerido: 5.0% - 7.5% (NCD Ordinaria)'
      });
    }
  }, [formData, documents, endosos, expediente]);

  if (!expediente) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Expediente no encontrado</h2>
        <Link to="/" className="text-brand-400 hover:underline mt-2 inline-block">
          Volver a la lista de expedientes
        </Link>
      </div>
    );
  }

  // Update field handlers
  const handleFieldConfirm = (field: string) => {
    setConfirmedFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleFieldChange = (field: string, val: string | number) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    setFieldSources(prev => ({ ...prev, [field]: 'MANUAL' }));
  };

  const toggleEdit = (field: string) => {
    setIsEditing(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Trigger file selection
  const handleFileUpload = (docType: TipoDocumento) => {
    if (isUploading) return;
    setUploadingDocType(docType);
    setTimeout(() => {
      document.getElementById('file-uploader-input')?.click();
    }, 100);
  };

  // Real uploader with HTTP polling fallback
  const handleRealFileUpload = (docType: TipoDocumento, file: File) => {
    setIsUploading(true);
    setUploadProgress(15);

    api.subirDocumento(expediente!.id, docType, file)
      .then(() => {
        setUploadProgress(40);
        // Start polling extraction status (every 1.5 seconds)
        const pollInterval = setInterval(() => {
          api.getDocExtractionStatus(expediente!.id, `doc-${expediente!.id}-${docType}`)
            .then((statusRes) => {
              setUploadProgress(statusRes.progress);
              
              if (statusRes.status === 'READY') {
                clearInterval(pollInterval);
                setIsUploading(false);
                setUploadingDocType(null);
                
                // Add or update documents list
                if (statusRes.data) {
                  setDocuments(prev => {
                    const filtered = prev.filter(d => d.tipo !== docType);
                    return [...filtered, statusRes.data!];
                  });
                }
                
                // If it is the NCD note, simulate fields auto-population (OCR)
                if (docType === 'NOTA') {
                  setFormData(prev => ({
                    ...prev,
                    numero_autorizacion: '1234567890123456789012345678901234567',
                    valor_nominal: 15000.00,
                    saldo_disponible: 12000.00,
                  }));
                  setFieldSources(prev => ({
                    ...prev,
                    numero_autorizacion: 'IA',
                    valor_nominal: 'IA',
                    saldo_disponible: 'IA',
                  }));
                  setEndosos([
                    {
                      endosante: "1790012345001",
                      razonSocialEndosante: "EMPRESA DE PRUEBA S.A.",
                      endosatario: "1790056789001",
                      razonSocialEndosatario: "EMPRESA COMPRADORA C.A.",
                      fecha: "2026-03-10",
                      valido: true
                    }
                  ]);
                }

                // Trigger validation on backend
                api.validarExpediente(expediente!.id)
                  .then(() => {
                    reloadRisksAndSuggestions(expediente!.id);
                  });
              } else if (statusRes.status === 'FAILED') {
                clearInterval(pollInterval);
                setIsUploading(false);
                setUploadingDocType(null);
                alert(`[MSG-05] Error al procesar extracción del documento ${docType}.`);
              }
            })
            .catch(() => {
              // Gracefully handle polling connection failure
              clearInterval(pollInterval);
              setIsUploading(false);
              setUploadingDocType(null);
            });
        }, 1500);
      })
      .catch((err) => {
        setIsUploading(false);
        setUploadingDocType(null);
        alert(`[MSG-05] Error al cargar archivo: ${err.message || err}`);
      });
  };

  // State transitions real integration
  const handleTransitionAction = () => {
    let newStatus: ExpedienteEstado = expediente.estado;
    const action = sugerencia?.codigo_accion;

    if (isCumplimiento) {
      // Compliance transitions
      if (expediente.estado === 'EN_VALIDACION') {
        newStatus = 'LISTO_PARA_NEGOCIAR';
      }
    } else {
      // Operator transitions
      if (expediente.estado === 'RECIBIDO') {
        newStatus = 'EN_VALIDACION';
      } else if (expediente.estado === 'EN_VALIDACION' && action === 'PREPARAR_ORDEN') {
        newStatus = 'LISTO_PARA_NEGOCIAR';
      } else if (expediente.estado === 'LISTO_PARA_NEGOCIAR') {
        newStatus = 'EN_NEGOCIACION';
      } else if (expediente.estado === 'EN_NEGOCIACION') {
        newStatus = 'CERRADO';
      }
    }

    api.cambiarEstado(expediente.id, {
      estado_nuevo: newStatus,
      comentarios: modalActionComments,
      usuario: role === 'OPERADOR' ? 'Operador de Valores' : 'Oficial de Cumplimiento'
    })
    .then((updatedExp) => {
      setExpediente(updatedExp);
      setIsActionModalOpen(false);
      setModalActionComments('');
      reloadRisksAndSuggestions(updatedExp.id);
    })
    .catch((err: any) => {
      alert(`[MSG-06] Error al transitar estado: ${err.message || err}`);
    });
  };

  const handleCancelCase = () => {
    if (!window.confirm('¿Está seguro de que desea CANCELAR este expediente?')) return;
    api.cambiarEstado(expediente.id, {
      estado_nuevo: 'CANCELADO',
      comentarios: 'Cancelado por el operador',
      usuario: 'Operador de Valores'
    })
    .then((updatedExp) => {
      setExpediente(updatedExp);
    })
    .catch((err: any) => {
      alert(`[MSG-06] Error al cancelar caso: ${err.message || err}`);
    });
  };

  const handleRejectCase = () => {
    const comments = prompt('Ingrese justificación para el rechazo del expediente:');
    if (comments === null) return;
    if (!comments.trim()) {
      alert('Debe ingresar una justificación.');
      return;
    }
    api.cambiarEstado(expediente.id, {
      estado_nuevo: 'RECHAZADO',
      comentarios: comments,
      usuario: 'Oficial de Cumplimiento'
    })
    .then((updatedExp) => {
      setExpediente(updatedExp);
    })
    .catch((err: any) => {
      alert(`[MSG-06] Error al rechazar caso: ${err.message || err}`);
    });
  };

  // Helper arrays for risks sorting
  const sortedRisks = [...risks].sort((a, b) => {
    const weights: Record<RiesgoNivel, number> = { CRITICO: 4, ALTO: 3, MEDIO: 2, BAJO: 1 };
    return weights[b.nivel] - weights[a.nivel];
  });

  const criticalOrHighRisks = sortedRisks.filter(r => r.nivel === 'CRITICO' || r.nivel === 'ALTO');
  const lowerRisks = sortedRisks.filter(r => r.nivel === 'MEDIO' || r.nivel === 'BAJO');

  const showFocusMode = (criticalOrHighRisks.length > 0);
  const visibleRisks = showFocusMode && !showLowRisks ? criticalOrHighRisks : sortedRisks;

  const statusColors: Record<ExpedienteEstado, string> = {
    RECIBIDO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    EN_VALIDACION: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    PENDIENTE_DOCUMENTACION: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    LISTO_PARA_NEGOCIAR: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    EN_NEGOCIACION: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    CERRADO: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    RECHAZADO: 'bg-red-500/10 text-red-400 border-red-500/20',
    CANCELADO: 'bg-slate-700/10 text-slate-400 border-slate-700/20'
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in space-y-8">
      {/* Hidden file input for real uploads */}
      <input
        type="file"
        id="file-uploader-input"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingDocType) {
            handleRealFileUpload(uploadingDocType, file);
          }
        }}
      />
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
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
                Workspace: {expediente.id}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border font-mono ${statusColors[expediente.estado]}`}>
                {expediente.estado}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">
              Cliente: <span className="text-slate-200 font-semibold">{formData.razon_social || expediente.cliente?.razon_social}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-450 flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-500" />
            <span>Rol: <strong className="text-slate-200">{role === 'OPERADOR' ? 'Operador de Valores' : 'Oficial de Cumplimiento'}</strong></span>
          </div>

          {isOperador && expediente.estado !== 'CERRADO' && expediente.estado !== 'CANCELADO' && expediente.estado !== 'RECHAZADO' && (
            <button
              onClick={handleCancelCase}
              className="px-3.5 py-2 bg-slate-950 hover:bg-red-950/20 border border-slate-850 hover:border-red-500/40 text-slate-450 hover:text-red-400 rounded-xl text-xs font-semibold transition-all"
            >
              Cancelar Caso
            </button>
          )}

          {isCumplimiento && expediente.estado === 'EN_VALIDACION' && (
            <div className="flex gap-2">
              <button
                onClick={handleRejectCase}
                className="px-3.5 py-2 bg-red-900/10 hover:bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold transition-all"
              >
                Rechazar Caso
              </button>
              <button
                onClick={() => setIsActionModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/10 transition-all"
              >
                Aprobar e Ir a Negociar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Docs & Endosos Timeline (7/12 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Uploader & Documents Checklist */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-brand-400" />
                Documentación Obligatoria (SRI / KYC)
              </h3>
              <span className="text-xs text-slate-500 font-mono font-medium">
                {documents.length} / 7 cargados
              </span>
            </div>

            <div className="p-6 space-y-4">
              {/* Drag-and-drop placeholder zone */}
              <div className="p-6 border-2 border-dashed border-slate-800/80 hover:border-brand-500/40 rounded-xl bg-slate-950/20 text-center transition-all group relative overflow-hidden">
                {isUploading ? (
                  <div className="py-4 space-y-3">
                    <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-slate-200">
                      Simulando Polling e Extracción por IA ({uploadingDocType})...
                    </p>
                    <div className="w-48 bg-slate-900 h-1.5 rounded-full mx-auto overflow-hidden">
                      <div 
                        className="bg-brand-500 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-slate-500 group-hover:text-brand-400 mx-auto mb-2 transition-colors" />
                    <p className="text-sm text-slate-300 font-medium">
                      Arrastra o selecciona un archivo para cargar
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Soporta PDFs escaneados y XMLs oficiales de Notas de Crédito
                    </p>
                  </div>
                )}
              </div>

              {/* Document items list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {(['CEDULA', 'PAPELETA', 'CERTIFICADO', 'PLANILLA', 'KYC', 'CESION', 'NOTA'] as TipoDocumento[]).map((type) => {
                  const doc = documents.find(d => d.tipo === type);
                  const isPresent = !!doc;
                  
                  return (
                    <div 
                      key={type}
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        isPresent 
                          ? 'bg-slate-900/40 border-slate-800/80 text-slate-200' 
                          : 'bg-slate-950/40 border-dashed border-slate-850 text-slate-500 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isPresent ? (
                          <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                        ) : (
                          <Clock className="w-4.5 h-4.5 text-slate-650 shrink-0" />
                        )}
                        <div className="truncate">
                          <div className={`text-xs font-bold tracking-wide ${isPresent ? 'text-slate-350' : 'text-slate-600'}`}>
                            {type}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {isPresent ? `v${doc.version} - ${doc.hash_sha256.substring(0, 12)}...` : 'Pendiente de cargar'}
                          </div>
                        </div>
                      </div>
                      
                      {isOperador && (
                        <button
                          onClick={() => handleFileUpload(type)}
                          disabled={isUploading}
                          className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all shrink-0 ${
                            isPresent 
                              ? 'bg-slate-900 border-slate-850 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-white' 
                              : 'bg-brand-500/10 border-brand-500/20 hover:bg-brand-500/20 text-brand-400 hover:text-brand-350'
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

          {/* Endorses Chain timeline (Path P15) */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-brand-400" />
                Cadena de Endosos Registrada en SRI
              </h3>
            </div>

            <div className="p-6">
              <EndosantesTimeline
                endosos={endosos}
                clienteRuc={formData.ruc}
                clienteRazonSocial={formData.razon_social}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Validation Form, Risks and Sugerencias (5/12 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Validation Form */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <CheckSquare className="w-4.5 h-4.5 text-brand-400" />
                Formulario de Datos Extraídos
              </h3>
            </div>

            <div className="p-6 space-y-5">
              {/* Form Input fields */}
              {Object.entries({
                ruc: { label: 'RUC Cliente', type: 'text', key: 'ruc' },
                razon_social: { label: 'Razón Social', type: 'text', key: 'razon_social' },
                numero_autorizacion: { label: 'Autorización NCD', type: 'text', key: 'numero_autorizacion' },
                tipo: { label: 'Tipo de Nota', type: 'select', key: 'tipo', options: ['NCD', 'NCD_ISD'] },
                valor_nominal: { label: 'Valor Nominal ($)', type: 'number', key: 'valor_nominal' },
                saldo_disponible: { label: 'Saldo Disponible ($)', type: 'number', key: 'saldo_disponible' },
                monto_a_negociar: { label: 'Monto a Negociar ($)', type: 'number', key: 'monto_a_negociar' }
              }).map(([fieldKey, field]) => {
                const isEditingField = isEditing[fieldKey];
                const isConfirmed = confirmedFields[fieldKey];
                const value = formData[fieldKey as keyof typeof formData];
                const source = fieldSources[fieldKey];
                
                return (
                  <div key={fieldKey} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        {field.label}
                        {/* Source badges */}
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                          source === 'IA' 
                            ? 'bg-brand-500/10 text-brand-400 border border-brand-500/10'
                            : source === 'REUTILIZADO'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/10'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {source === 'IA' ? 'IA (SRI)' : source === 'REUTILIZADO' ? 'Reutilizado' : 'Manual'}
                        </span>
                      </label>
                      
                      <div className="flex items-center gap-2">
                        {isOperador && (
                          <button
                            onClick={() => toggleEdit(fieldKey)}
                            className="text-slate-500 hover:text-slate-350 p-1 hover:bg-slate-900 rounded"
                            title="Editar campo"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleFieldConfirm(fieldKey)}
                          className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all ${
                            isConfirmed 
                              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400' 
                              : 'bg-slate-950 border-slate-850 text-slate-500 hover:border-slate-750 hover:text-slate-400'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>Confirmado</span>
                        </button>
                      </div>
                    </div>

                    {isEditingField ? (
                      field.type === 'select' ? (
                        <select
                          value={value}
                          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                          onBlur={() => toggleEdit(fieldKey)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-brand-500/60 rounded-xl text-sm text-slate-200 focus:outline-none transition-colors"
                        >
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          step="0.01"
                          value={value}
                          onChange={(e) => handleFieldChange(fieldKey, field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                          onBlur={() => toggleEdit(fieldKey)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-850 focus:border-brand-500/60 rounded-xl text-sm text-slate-200 focus:outline-none transition-colors"
                          autoFocus
                        />
                      )
                    ) : (
                      <div className="px-3 py-2 bg-slate-900/60 border border-slate-850/80 rounded-xl text-sm text-slate-200 font-mono flex items-center justify-between">
                        <span>
                          {field.type === 'number' 
                            ? `$ ${(value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : (value as string) || <span className="text-slate-600 font-sans text-xs italic">Pendiente de extracción</span>
                          }
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risks Analysis with Focus View (Subtask 13.4 & Rules R9/R29) */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
                Matriz de Riesgos
              </h3>
              
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-slate-400">
                {risks.length} Detectados
              </span>
            </div>

            <div className="p-6 space-y-4">
              {visibleRisks.length > 0 ? (
                <div className="space-y-3">
                  {visibleRisks.map((risk) => {
                    const colors: Record<RiesgoNivel, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
                      CRITICO: {
                        bg: 'bg-red-500/10',
                        border: 'border-red-500/30',
                        text: 'text-red-400',
                        icon: <Ban className="w-4 h-4 shrink-0" />
                      },
                      ALTO: {
                        bg: 'bg-orange-500/10',
                        border: 'border-orange-500/30',
                        text: 'text-orange-400',
                        icon: <AlertOctagon className="w-4 h-4 shrink-0" />
                      },
                      MEDIO: {
                        bg: 'bg-amber-500/10',
                        border: 'border-amber-500/30',
                        text: 'text-amber-400',
                        icon: <AlertTriangle className="w-4 h-4 shrink-0" />
                      },
                      BAJO: {
                        bg: 'bg-slate-500/10',
                        border: 'border-slate-800',
                        text: 'text-slate-400',
                        icon: <Clock className="w-4 h-4 shrink-0" />
                      }
                    };
                    
                    const clr = colors[risk.nivel];

                    return (
                      <div 
                        key={risk.id}
                        className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${clr.bg} ${clr.border} ${clr.text} animate-fade-in`}
                      >
                        {clr.icon}
                        <div className="space-y-1">
                          <div className="font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                            <span>Riesgo {risk.nivel}</span>
                            <span className="opacity-60">• Regla {risk.regla_activadora}</span>
                          </div>
                          <p className="text-slate-300 font-medium leading-relaxed">{risk.descripcion}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500/50" />
                  <p className="font-semibold text-slate-350">Sin riesgos detectados</p>
                  <p>Todos los controles normativos han sido validados.</p>
                </div>
              )}

              {/* Focus View toggle (Subtask 13.4 & R29) */}
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

          {/* Next Action suggest panel (Subtask 13.5) */}
          {sugerencia && (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden glow-brand">
              <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-brand-400" />
                  Sugerencia del Copiloto IA
                </h3>
                <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[9px] font-bold">
                  TESORERÍA AGENT
                </span>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-xl space-y-2.5">
                  <div className="font-bold text-brand-400 uppercase tracking-wider text-[9px]">
                    ACCIÓN PROPUESTA: {sugerencia.codigo_accion}
                  </div>
                  <p className="text-slate-350 font-medium leading-relaxed">
                    {sugerencia.descripcion_sugerida}
                  </p>
                  
                  {sugerencia.rango_descuento_sugerido && (
                    <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-lg w-max border border-slate-850">
                      <FileCode className="w-3.5 h-3.5 text-brand-400" />
                      <span>{sugerencia.rango_descuento_sugerido}</span>
                    </div>
                  )}
                </div>

                {/* Show/Hide execution button depending on role & status */}
                {expediente.estado !== 'CERRADO' && expediente.estado !== 'CANCELADO' && expediente.estado !== 'RECHAZADO' && (
                  isOperador ? (
                    <button
                      onClick={() => setIsActionModalOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-lg hover:shadow-brand-500/10 transition-all duration-150"
                    >
                      <span>Aceptar y Ejecutar Próxima Acción</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="text-center text-slate-550 italic text-[11px] py-1 border-t border-slate-850/60 mt-2">
                      Sugerencia orientada a la mesa operativa (Operador).
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Suggestion Confirmation Modal (Subtask 13.5) */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900/40 border-b border-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-slate-200 text-sm">
                Confirmar Acción y Transición
              </h3>
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="text-slate-400 hover:text-slate-250 text-xs"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-900/50 border border-slate-850 rounded-xl space-y-2">
                <span className="text-[9px] uppercase font-bold text-slate-500">Transición Propuesta:</span>
                
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="px-2 py-0.5 rounded font-mono border border-slate-800 bg-slate-950 text-slate-400">
                    {expediente.estado}
                  </span>
                  <span className="text-slate-600">→</span>
                  <span className="px-2 py-0.5 rounded font-mono border border-brand-500/20 bg-brand-500/10 text-brand-400 font-bold">
                    {isCumplimiento 
                      ? 'LISTO_PARA_NEGOCIAR' 
                      : expediente.estado === 'RECIBIDO' 
                        ? 'EN_VALIDACION' 
                        : expediente.estado === 'EN_VALIDACION'
                          ? 'LISTO_PARA_NEGOCIAR'
                          : expediente.estado === 'LISTO_PARA_NEGOCIAR'
                            ? 'EN_NEGOCIACION'
                            : 'CERRADO'
                    }
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Comentarios / Observaciones</label>
                <textarea
                  placeholder="Ingrese una justificación u observaciones para el registro de estados..."
                  value={modalActionComments}
                  onChange={(e) => setModalActionComments(e.target.value)}
                  className="w-full h-24 px-3 py-2 bg-slate-950 border border-slate-850 focus:border-brand-500/60 rounded-xl text-sm text-slate-200 placeholder-slate-650 focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-850/60">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-450 hover:text-slate-250 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTransitionAction}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-brand-500/15 transition-all"
                >
                  Confirmar y Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
