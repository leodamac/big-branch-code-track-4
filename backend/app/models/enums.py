from enum import Enum


class EstadoRUC(str, Enum):
    ACTIVO = "ACTIVO"
    SUSPENDIDO = "SUSPENDIDO"


class TipoNotaCredito(str, Enum):
    NCD = "NCD"
    NCD_ISD = "NCD_ISD"


class EstadoExpediente(str, Enum):
    RECIBIDO = "RECIBIDO"
    EN_VALIDACION = "EN_VALIDACION"
    PENDIENTE_DOCUMENTACION = "PENDIENTE_DOCUMENTACION"
    LISTO_PARA_NEGOCIAR = "LISTO_PARA_NEGOCIAR"
    EN_NEGOCIACION = "EN_NEGOCIACION"
    CERRADO = "CERRADO"
    RECHAZADO = "RECHAZADO"
    CANCELADO = "CANCELADO"


class TipoDocumento(str, Enum):
    CEDULA = "CEDULA"
    PAPELETA = "PAPELETA"
    CERTIFICADO = "CERTIFICADO"
    PLANILLA = "PLANILLA"
    KYC = "KYC"
    CESION = "CESION"
    NOTA = "NOTA"


class NivelRiesgo(str, Enum):
    CRITICO = "CRITICO"
    ALTO = "ALTO"
    MEDIO = "MEDIO"
    BAJO = "BAJO"


class EstadoRiesgo(str, Enum):
    ABIERTO = "ABIERTO"
    RESUELTO = "RESUELTO"
