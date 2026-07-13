// src/services/apiClient.ts
//
// Abstracción central para hablar con la API real (FastAPI, backend/).
// Un solo backend, así que a diferencia de un ApiClient multi-servicio,
// esto expone un namespace `expedientes` con un método tipado por endpoint.

import type {
  AceptarAccionResponse,
  AntecedentesResponse,
  CambiarEstadoResponse,
  CrearExpedientePayload,
  Documento,
  ExpedienteDetail,
  ExpedienteListItem,
  ExpedienteRead,
  Riesgo,
  HistorialEstado,
  SiguienteAccionResponse,
  TipoDocumento,
  ValidacionResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export class NetworkError extends Error {
  constructor() {
    super('No se pudo conectar con la API. Verifica que el backend esté corriendo.');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor() {
    super('La solicitud tardó demasiado y fue cancelada.');
    this.name = 'TimeoutError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

// Los campos Decimal del backend llegan como string (ej. "5000.00").
// Usar esto para convertirlos donde haga falta hacer aritmética o formato.
export const parseMonto = (valor: string | number): number =>
  typeof valor === 'number' ? valor : parseFloat(valor);

export const formatMonto = (valor: string | number): string =>
  parseMonto(valor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

class ApiClient {
  private baseUrl: string = API_BASE_URL;
  private defaultTimeout: number = 20000;

  async ping(): Promise<boolean> {
    try {
      await this.request('/api/expedientes', { params: { limit: 1 }, timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  }

  private buildUrl(path: string, params?: RequestOptions['params']): string {
    let url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    if (params) {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) search.set(key, String(value));
      }
      const qs = search.toString();
      if (qs) url += `?${qs}`;
    }
    return url;
  }

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, timeout = this.defaultTimeout, ...fetchOptions } = options;
    const url = this.buildUrl(path, params);

    const isFormData = fetchOptions.body instanceof FormData;
    const headers: HeadersInit = isFormData
      ? { ...fetchOptions.headers }
      : { 'Content-Type': 'application/json', ...fetchOptions.headers };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new TimeoutError();
      }
      throw new NetworkError();
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      let detail: unknown = null;
      try {
        detail = await response.json();
      } catch {
        // el body no era JSON, se ignora
      }
      const detailObj = detail as { detail?: unknown } | null;
      let message: string;
      if (typeof detailObj?.detail === 'string') {
        message = detailObj.detail;
      } else if (detailObj?.detail) {
        message = JSON.stringify(detailObj.detail);
      } else {
        message = response.statusText || 'Error en la petición';
      }
      throw new ApiError(message, response.status, detail);
    }

    if (response.status === 204) return {} as T;

    try {
      return (await response.json()) as T;
    } catch {
      return {} as T;
    }
  }

  expedientes = {
    listar: (limit = 50, offset = 0) =>
      this.request<{ items: ExpedienteListItem[] }>('/api/expedientes', {
        params: { limit, offset },
      }).then((r) => r.items),

    crear: (payload: CrearExpedientePayload) =>
      this.request<ExpedienteRead>('/api/expedientes', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    obtener: (id: string) => this.request<ExpedienteDetail>(`/api/expedientes/${id}`),

    antecedentes: (ruc: string) =>
      this.request<AntecedentesResponse>('/api/expedientes/antecedentes', { params: { ruc } }),

    validar: (id: string, usuario: string) =>
      this.request<ValidacionResponse>(`/api/expedientes/${id}/validar`, {
        method: 'POST',
        body: JSON.stringify({ usuario }),
      }),

    cambiarEstado: (id: string, evento: string, usuario: string, comentarios?: string) =>
      this.request<CambiarEstadoResponse>(`/api/expedientes/${id}/estado`, {
        method: 'POST',
        body: JSON.stringify({ evento, usuario, comentarios }),
      }),

    historial: (id: string) =>
      this.request<{ items: HistorialEstado[] }>(`/api/expedientes/${id}/historial`).then(
        (r) => r.items
      ),

    siguienteAccion: (id: string) =>
      this.request<SiguienteAccionResponse>(`/api/expedientes/${id}/siguiente-accion`),

    aceptarSiguienteAccion: (id: string, accion: string, usuario: string, comentarios?: string) =>
      this.request<AceptarAccionResponse>(`/api/expedientes/${id}/siguiente-accion/aceptar`, {
        method: 'POST',
        body: JSON.stringify({ accion, usuario, comentarios }),
      }),

    subirDocumento: (id: string, tipo: TipoDocumento, file: File) => {
      const formData = new FormData();
      formData.append('tipo', tipo);
      formData.append('file', file);
      return this.request<Documento>(`/api/expedientes/${id}/documentos`, {
        method: 'POST',
        body: formData,
      });
    },

    listarDocumentos: (id: string, soloActivos = false) =>
      this.request<{ items: Documento[] }>(`/api/expedientes/${id}/documentos`, {
        params: { solo_activos: soloActivos },
      }).then((r) => r.items),

    listarRiesgos: (id: string) =>
      this.request<{ items: Riesgo[] }>(`/api/expedientes/${id}/riesgos`).then((r) => r.items),

    resolverRiesgo: (id: string, riesgoId: string, usuario: string, comentarios?: string) =>
      this.request<Riesgo>(`/api/expedientes/${id}/riesgos/${riesgoId}/resolver`, {
        method: 'POST',
        body: JSON.stringify({ usuario, comentarios }),
      }),
  };
}

export const apiClient = new ApiClient();
