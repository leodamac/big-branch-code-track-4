from typing import Any
from uuid import UUID

from sqlmodel import SQLModel

from app.models.enums import EstadoRiesgo, NivelRiesgo


class RiesgoRead(SQLModel):
    id: UUID
    expediente_id: UUID
    descripcion: str
    nivel: NivelRiesgo
    estado: EstadoRiesgo
    evidencia: dict[str, Any]


class RiesgoList(SQLModel):
    items: list[RiesgoRead]


class RiesgoResolverRequest(SQLModel):
    usuario: str
    comentarios: str | None = None
