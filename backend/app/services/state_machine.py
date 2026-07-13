from app.models.enums import EstadoExpediente

# Máquina de estados: qué "evento" es válido desde cada estado y a qué
# estado nuevo transiciona.
TRANSICIONES: dict[EstadoExpediente, dict[str, EstadoExpediente]] = {
    EstadoExpediente.RECIBIDO: {
        "INICIAR_VALIDACION": EstadoExpediente.EN_VALIDACION,
        "CANCELAR": EstadoExpediente.CANCELADO,
        "CANCELADO": EstadoExpediente.CANCELADO,
    },
    EstadoExpediente.EN_VALIDACION: {
        "VALIDACION_COMPLETADA": EstadoExpediente.LISTO_PARA_NEGOCIAR,
        "DOCUMENTACION_FALTANTE": EstadoExpediente.PENDIENTE_DOCUMENTACION,
        "RECHAZAR": EstadoExpediente.RECHAZADO,
        "CANCELAR": EstadoExpediente.CANCELADO,
        "CANCELADO": EstadoExpediente.CANCELADO,
    },
    EstadoExpediente.PENDIENTE_DOCUMENTACION: {
        "DOCUMENTACION_COMPLETADA": EstadoExpediente.EN_VALIDACION,
        "CANCELAR": EstadoExpediente.CANCELADO,
        "CANCELADO": EstadoExpediente.CANCELADO,
    },
    EstadoExpediente.LISTO_PARA_NEGOCIAR: {
        "INICIAR_NEGOCIACION": EstadoExpediente.EN_NEGOCIACION,
        "CANCELAR": EstadoExpediente.CANCELADO,
        "CANCELADO": EstadoExpediente.CANCELADO,
    },
    EstadoExpediente.EN_NEGOCIACION: {
        "CERRAR_NEGOCIACION": EstadoExpediente.CERRADO,
        "RECHAZAR": EstadoExpediente.RECHAZADO,
        "CANCELAR": EstadoExpediente.CANCELADO,
        "CANCELADO": EstadoExpediente.CANCELADO,
    },
}

ESTADOS_TERMINALES = {
    EstadoExpediente.CERRADO,
    EstadoExpediente.RECHAZADO,
    EstadoExpediente.CANCELADO,
}


class TransicionInvalidaError(Exception):
    pass
