from typing import Any
from uuid import UUID

from sqlmodel import SQLModel

from app.models.enums import EstadoRUC


class ClienteCreate(SQLModel):
    ruc: str
    razon_social: str
    estado_ruc: EstadoRUC
    datos_kyc: dict[str, Any] = {}


class ClienteRead(SQLModel):
    id: UUID
    ruc: str
    razon_social: str
    estado_ruc: EstadoRUC
