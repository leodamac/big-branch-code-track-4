from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlmodel import Field, SQLModel

from app.models.enums import EstadoExpediente, EstadoRUC
from app.schemas.cliente import ClienteRead
from app.schemas.documento import DocumentoRead
from app.schemas.historial_estado import HistorialEstadoRead
from app.schemas.nota_credito import NotaCreditoCreate, NotaCreditoRead
from app.schemas.riesgo import RiesgoRead


class ExpedienteCreate(SQLModel):
    cliente_ruc: str = Field(min_length=1, max_length=13)
    razon_social: str = Field(min_length=1, max_length=255)
    estado_ruc: EstadoRUC
    nota: NotaCreditoCreate
    monto_a_negociar: Decimal
    responsable: str = Field(min_length=1, max_length=255)


class ExpedienteRead(SQLModel):
    id: UUID
    estado: EstadoExpediente
    cliente_id: UUID
    nota_id: UUID
    monto_a_negociar: Decimal
    responsable: str
    created_at: datetime
    updated_at: datetime


class ExpedienteListItem(SQLModel):
    id: UUID
    estado: EstadoExpediente
    monto_a_negociar: Decimal
    responsable: str
    created_at: datetime
    cliente: ClienteRead
    nota_credito: NotaCreditoRead
    responsable: str
    created_at: datetime
    updated_at: datetime


class ExpedienteList(SQLModel):
    items: list[ExpedienteListItem]


class ExpedienteDetail(SQLModel):
    id: UUID
    estado: EstadoExpediente
    monto_a_negociar: Decimal
    responsable: str
    cliente: ClienteRead
    nota_credito: NotaCreditoRead
    documentos: list[DocumentoRead]
    riesgos: list[RiesgoRead]
    historial_estados: list[HistorialEstadoRead]
    created_at: datetime
    updated_at: datetime

