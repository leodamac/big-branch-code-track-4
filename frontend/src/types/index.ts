export type UserRole = 'OPERADOR' | 'CUMPLIMIENTO';

export type EstadoRuc = 'ACTIVO' | 'SUSPENDIDO';

export type TipoNotaCredito = 'NCD' | 'NCD_ISD';

export type ExpedienteEstado =
  | 'RECIBIDO'
  | 'EN_VALIDACION'
  | 'PENDIENTE_DOCUMENTACION'
  | 'LISTO_PARA_NEGOCIAR'
  | 'EN_NEGOCIACION'
  | 'CERRADO'
  | 'RECHAZADO'
  | 'CANCELADO';

export type TipoDocumento =
  | 'CEDULA'
  | 'PAPELETA'
  | 'CERTIFICADO'
  | 'PLANILLA'
  | 'KYC'
  | 'CESION'
  | 'NOTA';

export type RiesgoNivel = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO';

export type RiesgoEstado = 'ABIERTO' | 'RESUELTO';

// Nota: los campos Decimal del backend (FastAPI/Pydantic) serializan como
// STRING en el JSON (ej. "5000.00"), no como number. Se tipan como string
// aquí a propósito; usa parseMonto() de apiClient.ts para convertirlos.

export interface Cliente {
  id: string;
  ruc: string;
  razon_social: string;
  estado_ruc: EstadoRuc;
}

export interface Endoso {
  endosante: string;
  razonSocialEndosante?: string;
  endosatario: string;
  razonSocialEndosatario?: string;
  fecha: string;
}

export interface NotaCredito {
  id: string;
  numero_autorizacion: string;
  ruc_beneficiario: string;
  valor_nominal: string;
  saldo_disponible: string;
  tipo: TipoNotaCredito;
}

export interface Documento {
  id: string;
  expediente_id: string;
  tipo: TipoDocumento;
  version: number;
  storage_path: string;
  hash_sha256: string;
  es_activo: boolean;
}

export interface Riesgo {
  id: string;
  expediente_id: string;
  descripcion: string;
  nivel: RiesgoNivel;
  estado: RiesgoEstado;
  evidencia: {
    regla_activadora?: string;
    detalle?: string;
    [key: string]: unknown;
  };
}

export interface HistorialEstado {
  estado_anterior: ExpedienteEstado | null;
  estado_nuevo: ExpedienteEstado;
  usuario: string;
  comentarios: string | null;
  created_at: string;
}

// GET /expedientes (cada item de la lista)
export interface ExpedienteListItem {
  id: string;
  estado: ExpedienteEstado;
  monto_a_negociar: string;
  responsable: string;
  created_at: string;
  updated_at?: string;
  cliente: Cliente;
  nota_credito: NotaCredito;
  documentos?: Documento[];
  riesgos?: Riesgo[];
}

// POST /expedientes (respuesta)
export interface ExpedienteRead {
  id: string;
  estado: ExpedienteEstado;
  cliente_id: string;
  nota_id: string;
  monto_a_negociar: string;
  responsable: string;
}

// GET /expedientes/{id}
export interface ExpedienteDetail {
  id: string;
  estado: ExpedienteEstado;
  monto_a_negociar: string;
  responsable: string;
  cliente: Cliente;
  nota_credito: NotaCredito & { historial_endosos?: Endoso[] };
  documentos: Documento[];
  riesgos: Riesgo[];
  historial_estados: HistorialEstado[];
}

// GET /expedientes/antecedentes?ruc=...
export interface ExpedienteAntecedente {
  id: string;
  estado: ExpedienteEstado;
  numero_autorizacion: string;
}

export interface AntecedentesResponse {
  cliente: Cliente;
  expedientes_anteriores: ExpedienteAntecedente[];
}

// POST /expedientes/{id}/validar
export interface ResumenRiesgos {
  criticos: number;
  altos: number;
  medios: number;
  bajos: number;
}

export interface ValidacionResponse {
  expediente_id: string;
  resultado: string;
  estado: ExpedienteEstado;
  resumen_riesgos: ResumenRiesgos;
  puede_avanzar: boolean;
}

// POST /expedientes/{id}/estado
export interface CambiarEstadoResponse {
  expediente_id: string;
  estado_anterior: ExpedienteEstado;
  estado_nuevo: ExpedienteEstado;
}

// GET /expedientes/{id}/siguiente-accion
export type CodigoAccion = 'PREPARAR_ORDEN' | 'SOLICITAR_CORRECCION_MONTO' | 'ENVIAR_CUMPLIMIENTO';

export interface SiguienteAccionResponse {
  viabilidad_financiera: {
    aprobado: boolean | null;
    motivo_rechazo: string | null;
  };
  sugerencia_tesoreria: {
    rango_descuento_sugerido: string | null;
    monto_nominal_negociable: number;
    observaciones_liquidez: string | null;
  };
  proxima_accion: {
    codigo_accion: CodigoAccion;
    descripcion_sugerida: string;
  };
  _error?: string;
}

// POST /expedientes/{id}/siguiente-accion/aceptar
export interface AceptarAccionResponse {
  expediente_id: string;
  accion_aceptada: string;
  estado: ExpedienteEstado;
}

// Payload para POST /expedientes (creación manual)
export interface CrearExpedientePayload {
  cliente_ruc: string;
  razon_social: string;
  estado_ruc: EstadoRuc;
  nota: {
    numero_autorizacion: string;
    ruc_beneficiario: string;
    valor_nominal: number;
    saldo_disponible: number;
    tipo: TipoNotaCredito;
    historial_endosos: Endoso[];
  };
  monto_a_negociar: number;
  responsable: string;
}
