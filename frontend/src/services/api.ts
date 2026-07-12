import type { 
  Expediente, ExpedienteEstado, Documento, Riesgo, DashboardInfo, TipoDocumento
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Global state to track whether API is offline and falling back to localStorage
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

// LocalStorage Mock Helpers
const INITIAL_MOCK_EXPEDIENTES: Expediente[] = [
  {
    id: "EXP-2026-001",
    cliente_id: "cli-1",
    cliente: {
      id: "cli-1",
      ruc: "1790012345001",
      razon_social: "EMPRESA DE PRUEBA S.A.",
      estado_ruc: "ACTIVO",
      created_at: "2026-01-01T00:00:00Z"
    },
    nota_id: "nota-1",
    nota: {
      id: "nota-1",
      numero_autorizacion: "1234567890123456789012345678901234567",
      ruc_beneficiario: "1790012345001",
      valor_nominal: 15000.00,
      saldo_disponible: 12000.00,
      tipo: "NCD",
      created_at: "2026-01-15T00:00:00Z"
    },
    estado: "RECIBIDO",
    monto_a_negociar: 10000.00,
    responsable: "Alejandro Rivera",
    created_at: "2026-07-10T09:00:00Z",
    updated_at: "2026-07-10T09:30:00Z"
  },
  {
    id: "EXP-2026-002",
    cliente_id: "cli-2",
    cliente: {
      id: "cli-2",
      ruc: "1790056789001",
      razon_social: "EMPRESA COMPRADORA C.A.",
      estado_ruc: "ACTIVO",
      created_at: "2026-02-10T00:00:00Z"
    },
    nota_id: "nota-2",
    nota: {
      id: "nota-2",
      numero_autorizacion: "1111111111111111111111111111111111111",
      ruc_beneficiario: "1790056789001",
      valor_nominal: 25000.00,
      saldo_disponible: 25000.00,
      tipo: "NCD",
      created_at: "2026-01-15T00:00:00Z"
    },
    estado: "EN_VALIDACION",
    monto_a_negociar: 25000.00,
    responsable: "Lucia Fernandez",
    created_at: "2026-07-11T10:15:00Z",
    updated_at: "2026-07-11T10:45:00Z"
  },
  {
    id: "EXP-2026-003",
    cliente_id: "cli-3",
    cliente: {
      id: "cli-3",
      ruc: "1712345678001",
      razon_social: "JUAN PEREZ GOMEZ",
      estado_ruc: "ACTIVO",
      created_at: "2026-03-01T00:00:00Z"
    },
    nota_id: "nota-3",
    nota: {
      id: "nota-3",
      numero_autorizacion: "2222222222222222222222222222222222222",
      ruc_beneficiario: "1712345678001",
      valor_nominal: 5000.00,
      saldo_disponible: 5000.00,
      tipo: "NCD",
      created_at: "2026-01-15T00:00:00Z"
    },
    estado: "PENDIENTE_DOCUMENTACION",
    monto_a_negociar: 5000.00,
    responsable: "Carlos Ortega",
    created_at: "2026-07-11T14:20:00Z",
    updated_at: "2026-07-11T15:00:00Z"
  },
  {
    id: "EXP-2026-004",
    cliente_id: "cli-4",
    cliente: {
      id: "cli-4",
      ruc: "1790012345001",
      razon_social: "EMPRESA DE PRUEBA S.A.",
      estado_ruc: "ACTIVO",
      created_at: "2026-01-01T00:00:00Z"
    },
    nota_id: "nota-4",
    nota: {
      id: "nota-4",
      numero_autorizacion: "3333333333333333333333333333333333333",
      ruc_beneficiario: "1790012345001",
      valor_nominal: 10000.00,
      saldo_disponible: 10000.00,
      tipo: "NCD",
      created_at: "2026-01-15T00:00:00Z"
    },
    estado: "LISTO_PARA_NEGOCIAR",
    monto_a_negociar: 8000.00,
    responsable: "Alejandro Rivera",
    created_at: "2026-07-11T08:00:00Z",
    updated_at: "2026-07-11T17:30:00Z"
  }
];

const getLocalStorageExpedientes = (): Expediente[] => {
  const data = localStorage.getItem('mock_expedientes');
  if (!data) {
    localStorage.setItem('mock_expedientes', JSON.stringify(INITIAL_MOCK_EXPEDIENTES));
    return INITIAL_MOCK_EXPEDIENTES;
  }
  return JSON.parse(data);
};

const saveLocalStorageExpedientes = (list: Expediente[]) => {
  localStorage.setItem('mock_expedientes', JSON.stringify(list));
};

// Polling storage simulation
const mockDocExtractionStatus: Record<string, { status: string; progress: number; data?: any }> = {};

// HTTP Client wrapper with automatic offline detection and localStorage fallback
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
      const message = errBody.error?.message || `API Error: ${response.statusText}`;
      const code = errBody.error?.code || 'API_ERROR';
      throw new APIException(message, code, response.status);
    }

    const json = await response.json();
    return json.data as T;
  } catch (error: any) {
    // If it's a TypeError or network failure, trigger offline mode fallback
    if (error instanceof TypeError || error.name === 'TypeError' || error.message?.includes('fetch')) {
      setOfflineMode(true);
      return mockFallback<T>(path, options);
    }
    
    // Propagate API exception
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

// Fallback logic for LocalStorage mock
function mockFallback<T>(path: string, options: RequestInit = {}): T {
  const method = options.method || 'GET';
  const match = (regex: RegExp) => path.match(regex);

  // GET /api/expedientes
  if (method === 'GET' && path === '/api/expedientes') {
    return getLocalStorageExpedientes() as T;
  }

  // GET /api/expedientes/antecedentes?ruc=...
  if (method === 'GET' && path.startsWith('/api/expedientes/antecedentes')) {
    const ruc = new URL(path, 'http://x').searchParams.get('ruc') || '';
    const list = getLocalStorageExpedientes();
    const antecedents = list.filter(e => e.cliente?.ruc === ruc);
    return antecedents as T;
  }

  // GET /api/expedientes/{id}
  let m = match(/^\/api\/expedientes\/([^\/]+)$/);
  if (method === 'GET' && m) {
    const id = m[1];
    const list = getLocalStorageExpedientes();
    const found = list.find(e => e.id === id);
    if (!found) throw new APIException(`Expediente no encontrado: ${id}`, 'EXPEDIENTE_NO_ENCONTRADO', 404);
    return found as T;
  }

  // POST /api/expedientes
  if (method === 'POST' && path === '/api/expedientes') {
    const body = JSON.parse(options.body as string);
    const list = getLocalStorageExpedientes();
    
    // Check duplication rule (R13)
    const exists = list.some(e => e.nota?.numero_autorizacion === body.nota_autorizacion && e.estado !== 'CERRADO' && e.estado !== 'CANCELADO');
    if (exists) {
      throw new APIException('Ya existe un expediente activo para esta nota de crédito.', 'EXPEDIENTE_DUPLICADO', 400);
    }

    const newExp: Expediente = {
      id: `EXP-2026-00${list.length + 1}`,
      cliente_id: `cli-${Date.now()}`,
      cliente: {
        id: `cli-${Date.now()}`,
        ruc: body.cliente_ruc,
        razon_social: body.razon_social || 'NUEVO CLIENTE S.A.',
        estado_ruc: 'ACTIVO',
        created_at: new Date().toISOString()
      },
      nota_id: `nota-${Date.now()}`,
      nota: {
        id: `nota-${Date.now()}`,
        numero_autorizacion: body.nota_autorizacion,
        ruc_beneficiario: body.cliente_ruc,
        valor_nominal: body.valor_nominal || 1000.00,
        saldo_disponible: body.valor_nominal || 1000.00,
        tipo: 'NCD',
        created_at: new Date().toISOString()
      },
      estado: 'RECIBIDO',
      monto_a_negociar: body.monto_a_negociar || 500.00,
      responsable: body.usuario || 'Operador Asistido',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    saveLocalStorageExpedientes([newExp, ...list]);
    return newExp as T;
  }

  // POST /api/expedientes/{id}/documentos
  m = match(/^\/api\/expedientes\/([^\/]+)\/documentos$/);
  if (method === 'POST' && m) {
    const expedienteId = m[1];
    // In FormData, we retrieve key-values
    const formData = options.body as FormData;
    const tipo = formData.get('tipo') as TipoDocumento;
    const docId = `doc-${expedienteId}-${tipo}`;

    // Initialize extraction status for polling
    mockDocExtractionStatus[docId] = {
      status: 'PROCESSING',
      progress: 20
    };

    // Simulate async processing (polling updates)
    let progress = 20;
    const interval = setInterval(() => {
      progress += 40;
      if (progress >= 100) {
        clearInterval(interval);
        mockDocExtractionStatus[docId] = {
          status: 'READY',
          progress: 100,
          data: {
            id: docId,
            expediente_id: expedienteId,
            tipo,
            version: 1,
            hash_sha256: `sha256-mock-${Date.now()}`,
            storage_path: `/uploads/mock-${tipo.toLowerCase()}.pdf`
          }
        };
      } else {
        mockDocExtractionStatus[docId].progress = progress;
      }
    }, 1000);

    return { status: 'PENDING', hash: `sha256-pending-${Date.now()}` } as T;
  }

  // GET /api/expedientes/{id}/documentos/{doc_id}/estado
  m = match(/^\/api\/expedientes\/([^\/]+)\/documentos\/([^\/]+)\/estado$/);
  if (method === 'GET' && m) {
    const docId = m[2];
    const status = mockDocExtractionStatus[docId] || { status: 'READY', progress: 100, data: { id: docId, tipo: 'CEDULA' } };
    return status as T;
  }

  // POST /api/expedientes/{id}/validar
  m = match(/^\/api\/expedientes\/([^\/]+)\/validar$/);
  if (method === 'POST' && m) {
    const id = m[1];
    const list = getLocalStorageExpedientes();
    const found = list.find(e => e.id === id);
    if (!found) throw new APIException('Expediente no encontrado', 'EXPEDIENTE_NO_ENCONTRADO', 404);
    
    // Simulate validation response
    return {
      status: 'success',
      riesgos_encontrados: 1,
      timestamp: new Date().toISOString()
    } as T;
  }

  // GET /api/expedientes/{id}/riesgos
  m = match(/^\/api\/expedientes\/([^\/]+)\/riesgos$/);
  if (method === 'GET' && m) {
    const id = m[1];
    const list = getLocalStorageExpedientes();
    const found = list.find(e => e.id === id);
    if (!found) throw new APIException('Expediente no encontrado', 'EXPEDIENTE_NO_ENCONTRADO', 404);

    // Mock compliance analysis
    const listRiesgos: Riesgo[] = [];
    if (found.monto_a_negociar > (found.nota?.saldo_disponible || 0)) {
      listRiesgos.push({
        id: 'r-excede-saldo',
        expediente_id: id,
        descripcion: 'El monto solicitado excede el saldo disponible de la nota.',
        nivel: 'ALTO',
        estado: 'ABIERTO',
        regla_activadora: 'R1',
        created_at: new Date().toISOString()
      });
    }
    
    return listRiesgos as T;
  }

  // GET /api/expedientes/{id}/siguiente-accion
  m = match(/^\/api\/expedientes\/([^\/]+)\/siguiente-accion$/);
  if (method === 'GET' && m) {
    const id = m[1];
    const list = getLocalStorageExpedientes();
    const found = list.find(e => e.id === id);
    if (!found) throw new APIException('Expediente no encontrado', 'EXPEDIENTE_NO_ENCONTRADO', 404);

    const exceeds = found.monto_a_negociar > (found.nota?.saldo_disponible || 0);

    return {
      viabilidad_financiera: {
        aprobado: !exceeds,
        motivo_rechazo: exceeds ? 'El monto excede el saldo disponible' : ''
      },
      sugerencia_tesoreria: {
        rango_descuento_sugerido: '5.0% - 7.5%',
        monto_nominal_negociable: found.monto_a_negociar,
        observaciones_liquidez: 'Alta liquidez en mercado secundario'
      },
      proxima_accion: {
        codigo_accion: exceeds ? 'SOLICITAR_CORRECCION_MONTO' : 'PREPARAR_ORDEN',
        descripcion_sugerida: exceeds 
          ? 'El monto solicitado a negociar excede el saldo disponible. Solicitar corrección.'
          : 'Preparar borrador de orden de negociación.'
      }
    } as T;
  }

  // POST /api/expedientes/{id}/estado
  m = match(/^\/api\/expedientes\/([^\/]+)\/estado$/);
  if (method === 'POST' && m) {
    const id = m[1];
    const body = JSON.parse(options.body as string);
    const list = getLocalStorageExpedientes();
    const foundIndex = list.findIndex(e => e.id === id);
    if (foundIndex === -1) throw new APIException('Expediente no encontrado', 'EXPEDIENTE_NO_ENCONTRADO', 404);

    const exp = list[foundIndex];
    
    // Simulate transition
    const updatedExp: Expediente = {
      ...exp,
      estado: body.estado_nuevo || body.evento, // Map to new state
      updated_at: new Date().toISOString()
    };

    list[foundIndex] = updatedExp;
    saveLocalStorageExpedientes(list);
    return updatedExp as T;
  }

  // GET /api/expedientes/{id}/dashboard
  m = match(/^\/api\/expedientes\/([^\/]+)\/dashboard$/);
  if (method === 'GET' && m) {
    const id = m[1];
    const list = getLocalStorageExpedientes();
    const found = list.find(e => e.id === id);
    if (!found) throw new APIException('Expediente no encontrado', 'EXPEDIENTE_NO_ENCONTRADO', 404);

    const dbInfo: DashboardInfo = {
      expediente_id: id,
      estado_actual: found.estado,
      monto_a_negociar: found.monto_a_negociar,
      responsable: found.responsable,
      riesgos: [],
      sugerencia: {
        codigo_accion: 'PREPARAR_ORDEN',
        descripcion_sugerida: 'Todo validado correctamente.'
      }
    };
    return dbInfo as T;
  }

  throw new APIException(`Mock Fallback: Endpoint no implementado [${method}] ${path}`, 'ENDPOINT_NO_IMPLEMENTADO', 500);
}

// REST API Methods implementation
export const api = {
  getExpedientes: () => {
    return request<Expediente[]>('/api/expedientes');
  },

  getExpedienteById: (id: string) => {
    return request<Expediente>(`/api/expedientes/${id}`);
  },

  getAntecedentes: (ruc: string) => {
    return request<Expediente[]>(`/api/expedientes/antecedentes?ruc=${ruc}`);
  },

  crearExpediente: (params: {
    cliente_ruc: string;
    razon_social: string;
    nota_autorizacion: string;
    valor_nominal: number;
    monto_a_negociar: number;
    usuario: string;
  }) => {
    return request<Expediente>('/api/expedientes', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  subirDocumento: (expedienteId: string, tipo: TipoDocumento, file: File) => {
    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('file', file);

    // Bypass json request header wrapping since it is multipart
    return request<{ status: string; hash: string }>(`/api/expedientes/${expedienteId}/documentos`, {
      method: 'POST',
      body: formData,
      headers: {} // empty headers allows fetch to set multipart boundary
    });
  },

  getDocExtractionStatus: (expedienteId: string, docId: string) => {
    return request<{ status: 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED'; progress: number; data?: Documento }>(
      `/api/expedientes/${expedienteId}/documentos/${docId}/estado`
    );
  },

  validarExpediente: (expedienteId: string) => {
    return request<{ status: string; riesgos_encontrados: number }>(`/api/expedientes/${expedienteId}/validar`, {
      method: 'POST'
    });
  },

  getRiesgos: (expedienteId: string) => {
    return request<Riesgo[]>(`/api/expedientes/${expedienteId}/riesgos`);
  },

  getSugerencia: (expedienteId: string) => {
    return request<{
      viabilidad_financiera: { aprobado: boolean; motivo_rechazo: string };
      sugerencia_tesoreria: { rango_descuento_sugerido: string; monto_nominal_negociable: number; observaciones_liquidez: string };
      proxima_accion: { codigo_accion: string; descripcion_sugerida: string };
    }>(`/api/expedientes/${expedienteId}/siguiente-accion`);
  },

  cambiarEstado: (expedienteId: string, params: {
    estado_nuevo: ExpedienteEstado;
    comentarios: string;
    usuario: string;
  }) => {
    return request<Expediente>(`/api/expedientes/${expedienteId}/estado`, {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  getDashboardInfo: (expedienteId: string) => {
    return request<DashboardInfo>(`/api/expedientes/${expedienteId}/dashboard`);
  }
};
