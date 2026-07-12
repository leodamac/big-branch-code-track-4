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

export interface Cliente {
  id: string;
  ruc: string;
  razon_social: string;
  estado_ruc: EstadoRuc;
  datos_kyc?: Record<string, any>;
  created_at: string;
}

export interface Endoso {
  endosante: string;
  razonSocialEndosante?: string;
  endosatario: string;
  razonSocialEndosatario?: string;
  fecha: string;
  valido?: boolean;
}

export interface NotaCredito {
  id: string;
  numero_autorizacion: string;
  ruc_beneficiario: string;
  valor_nominal: number;
  saldo_disponible: number;
  tipo: TipoNotaCredito;
  historial_endosos?: Endoso[];
  created_at: string;
}

export interface Documento {
  id: string;
  expediente_id: string;
  tipo: TipoDocumento;
  version: number;
  storage_path: string;
  hash_sha256: string;
  es_activo: boolean;
  created_at: string;
}

export interface Riesgo {
  id: string;
  expediente_id: string;
  descripcion: string;
  nivel: RiesgoNivel;
  estado: RiesgoEstado;
  evidencia?: Record<string, any> | string;
  created_at: string;
}

export interface HistorialEstados {
  id: string;
  expediente_id: string;
  estado_anterior: ExpedienteEstado | null;
  estado_nuevo: ExpedienteEstado;
  usuario: string;
  comentarios: string;
  created_at: string;
}

export interface Expediente {
  id: string;
  cliente_id: string;
  cliente?: Cliente;
  nota_id: string;
  nota?: NotaCredito;
  estado: ExpedienteEstado;
  monto_a_negociar: number;
  responsable: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardInfo {
  expediente_id: string;
  estado_actual: ExpedienteEstado;
  riesgos: Riesgo[];
  sugerencia?: {
    codigo_accion: string;
    descripcion_sugerida: string;
    rango_descuento_sugerido?: string;
  };
  monto_a_negociar: number;
  responsable: string;
}
