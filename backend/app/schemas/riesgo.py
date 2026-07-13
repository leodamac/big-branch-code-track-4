from datetime import datetime
from typing import Any
from uuid import UUID

from sqlmodel import Field, SQLModel

from app.models.enums import EstadoRiesgo, NivelRiesgo


class RiesgoRead(SQLModel):
    id: UUID
    expediente_id: UUID
    descripcion: str
    nivel: NivelRiesgo
    estado: EstadoRiesgo
    evidencia: dict[str, Any]
    created_at: datetime



class RiesgoList(SQLModel):
    items: list[RiesgoRead]


class RiesgoResolverRequest(SQLModel):
    usuario: str = Field(min_length=1, max_length=255)
    comentarios: str | None = Field(default=None, max_length=2000)
