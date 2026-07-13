from datetime import datetime
from typing import Any
from uuid import UUID

from sqlmodel import Field, SQLModel

from app.models.enums import EstadoRUC


class ClienteCreate(SQLModel):
    ruc: str = Field(min_length=1, max_length=13)
    razon_social: str = Field(min_length=1, max_length=255)
    estado_ruc: EstadoRUC
    datos_kyc: dict[str, Any] = {}


class ClienteRead(SQLModel):
    id: UUID
    ruc: str
    razon_social: str
    estado_ruc: EstadoRUC
    created_at: datetime

