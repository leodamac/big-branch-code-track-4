import type { 
  Expediente, ExpedienteEstado, Documento, Riesgo, DashboardInfo, TipoDocumento
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Global state to track connection status
let isOfflineMode = false;
const listeners = new Set<(offline: boolean) => void>();

export const registerOfflineListener = (listener: (offline: boolean) => void) => {
  listeners.add(listener);
  listener(isOfflineMode);
  return () => {
    listeners.delete(listener);
  };
};

const setOfflineMode = (offline: boolean) => {
  if (isOfflineMode !== offline) {
    isOfflineMode = offline;
    listeners.forEach(l => l(offline));
  }
};

export const getOfflineMode = () => isOfflineMode;

// HTTP Client wrapper with automatic error parsing and status mapping
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    setOfflineMode(false);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const message = errBody.detail || errBody.error?.message || `API Error: ${response.statusText}`;
      const code = errBody.error?.code || 'API_ERROR';
      throw new APIException(message, code, response.status);
    }

    const json = await response.json();
    return (json && json.data !== undefined ? json.data : json) as T;
  } catch (error: any) {
    setOfflineMode(true);
    throw error;
  }
}

export class APIException extends Error {
  code: string;
  status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = 'APIException';
    this.code = code;
    this.status = status;
  }
}

// REST API Methods implementation
export const api = {
  getExpedientes: async () => {
    const res = await request<{ items: any[] }>('/api/expedientes');
    const items = res.items || [];
    return items.map(item => ({
      ...item,
      nota: item.nota_credito
    })) as Expediente[];
  },

  getExpedienteById: async (id: string) => {
    const data = await request<any>(`/api/expedientes/${id}`);
    return {
      ...data,
      nota: data.nota_credito
    } as Expediente;
  },

  getAntecedentes: async (ruc: string) => {
    const res = await request<{ expedientes_anteriores: any[] }>(`/api/expedientes/antecedentes?ruc=${ruc}`);
    return res.expedientes_anteriores || [];
  },

  crearExpediente: (params: {
    cliente_ruc: string;
    razon_social: string;
    nota_autorizacion: string;
    valor_nominal: number;
    monto_a_negociar: number;
    usuario: string;
  }) => {
    const mappedPayload = {
      cliente_ruc: params.cliente_ruc,
      razon_social: params.razon_social,
      estado_ruc: 'ACTIVO',
      nota: {
        numero_autorizacion: params.nota_autorizacion,
        ruc_beneficiario: params.cliente_ruc,
        valor_nominal: params.valor_nominal,
        saldo_disponible: params.valor_nominal,
        tipo: 'NCD',
        historial_endosos: []
      },
      monto_a_negociar: params.monto_a_negociar,
      responsable: params.usuario
    };
    return request<Expediente>('/api/expedientes', {
      method: 'POST',
      body: JSON.stringify(mappedPayload)
    });
  },

  subirDocumento: (expedienteId: string, tipo: TipoDocumento, file: File) => {
    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('file', file);

    return request<Documento>(`/api/expedientes/${expedienteId}/documentos`, {
      method: 'POST',
      body: formData,
      headers: {}
    });
  },

  getDocExtractionStatus: async (expedienteId: string, docId: string) => {
    try {
      const response = await request<{ items: Documento[] } | Documento[]>(`/api/expedientes/${expedienteId}/documentos`);
      const items = Array.isArray(response) ? response : (response.items || []);
      const docType = docId.split('-').pop() as TipoDocumento;
      const doc = items.find(d => d.tipo === docType && d.es_activo);
      if (doc) {
        return {
          status: 'READY' as const,
          progress: 100,
          data: doc
        };
      }
      return {
        status: 'PROCESSING' as const,
        progress: 50
      };
    } catch (err) {
      return {
        status: 'FAILED' as const,
        progress: 0
      };
    }
  },

  validarExpediente: (expedienteId: string) => {
    return request<any>(`/api/expedientes/${expedienteId}/validar`, {
      method: 'POST',
      body: JSON.stringify({ usuario: 'Operador Asistido' })
    });
  },

  getRiesgos: async (expedienteId: string) => {
    const res = await request<{ items: Riesgo[] }>(`/api/expedientes/${expedienteId}/riesgos`);
    return res.items || [];
  },

  getSugerencia: (expedienteId: string) => {
    return request<{
      viabilidad_financiera: { aprobado: boolean; motivo_rechazo: string };
      sugerencia_tesoreria: { rango_descuento_sugerido: string; monto_nominal_negociable: number; observaciones_liquidez: string };
      proxima_accion: { codigo_accion: string; descripcion_sugerida: string };
    }>(`/api/expedientes/${expedienteId}/siguiente-accion`);
  },

  cambiarEstado: async (expedienteId: string, params: {
    estado_nuevo: ExpedienteEstado;
    comentarios: string;
    usuario: string;
  }) => {
    const currentExp = await api.getExpedienteById(expedienteId);
    const estado_actual = currentExp.estado;
    const estado_nuevo = params.estado_nuevo;

    let evento = '';
    if (estado_actual === 'RECIBIDO' && estado_nuevo === 'EN_VALIDACION') {
      evento = 'INICIAR_VALIDACION';
    } else if (estado_actual === 'EN_VALIDACION') {
      if (estado_nuevo === 'LISTO_PARA_NEGOCIAR') {
        evento = 'VALIDACION_COMPLETADA';
      } else if (estado_nuevo === 'PENDIENTE_DOCUMENTACION') {
        evento = 'DOCUMENTACION_FALTANTE';
      } else if (estado_nuevo === 'RECHAZADO') {
        evento = 'RECHAZAR';
      }
    } else if (estado_actual === 'PENDIENTE_DOCUMENTACION' && estado_nuevo === 'EN_VALIDACION') {
      evento = 'DOCUMENTACION_COMPLETADA';
    } else if (estado_actual === 'LISTO_PARA_NEGOCIAR' && estado_nuevo === 'EN_NEGOCIACION') {
      evento = 'INICIAR_NEGOCIACION';
    } else if (estado_actual === 'EN_NEGOCIACION') {
      if (estado_nuevo === 'CERRADO') {
        evento = 'CERRAR_NEGOCIACION';
      } else if (estado_nuevo === 'RECHAZADO') {
        evento = 'RECHAZAR';
      }
    }

    if (!evento) {
      evento = estado_nuevo;
    }

    const payload = {
      evento: evento,
      usuario: params.usuario,
      comentarios: params.comentarios || ''
    };

    await request<any>(`/api/expedientes/${expedienteId}/estado`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return await api.getExpedienteById(expedienteId);
  },

  getDashboardInfo: (expedienteId: string) => {
    return request<DashboardInfo>(`/api/expedientes/${expedienteId}/dashboard`);
  }
};
