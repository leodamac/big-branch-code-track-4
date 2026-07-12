from uuid import UUID

from sqlmodel import SQLModel

from app.models.enums import EstadoExpediente


class CambiarEstadoRequest(SQLModel):
    evento: str
    usuario: str
    comentarios: str | None = None


class CambiarEstadoResponse(SQLModel):
    expediente_id: UUID
    estado_anterior: EstadoExpediente
    estado_nuevo: EstadoExpediente
