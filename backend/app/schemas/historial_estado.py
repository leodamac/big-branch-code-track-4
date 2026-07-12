from datetime import datetime

from sqlmodel import SQLModel

from app.models.enums import EstadoExpediente


class HistorialEstadoRead(SQLModel):
    estado_anterior: EstadoExpediente | None
    estado_nuevo: EstadoExpediente
    usuario: str
    comentarios: str | None
    created_at: datetime


class HistorialEstadoList(SQLModel):
    items: list[HistorialEstadoRead]
