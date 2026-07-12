from uuid import UUID

from sqlmodel import Field, SQLModel

from app.models.enums import EstadoExpediente


class CambiarEstadoRequest(SQLModel):
    evento: str = Field(min_length=1, max_length=50)
    usuario: str = Field(min_length=1, max_length=255)
    comentarios: str | None = Field(default=None, max_length=2000)


class CambiarEstadoResponse(SQLModel):
    expediente_id: UUID
    estado_anterior: EstadoExpediente
    estado_nuevo: EstadoExpediente
