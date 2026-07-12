from decimal import Decimal
from uuid import UUID

from sqlmodel import SQLModel

from app.models.enums import EstadoExpediente, EstadoRUC
from app.schemas.cliente import ClienteRead
from app.schemas.documento import DocumentoRead
from app.schemas.historial_estado import HistorialEstadoRead
from app.schemas.nota_credito import NotaCreditoCreate, NotaCreditoRead
from app.schemas.riesgo import RiesgoRead


class ExpedienteCreate(SQLModel):
    cliente_ruc: str
    razon_social: str
    estado_ruc: EstadoRUC
    nota: NotaCreditoCreate
    monto_a_negociar: Decimal
    responsable: str


class ExpedienteRead(SQLModel):
    id: UUID
    estado: EstadoExpediente
    cliente_id: UUID
    nota_id: UUID
    monto_a_negociar: Decimal
    responsable: str


class ExpedienteListItem(SQLModel):
    id: UUID
    estado: EstadoExpediente
    monto_a_negociar: Decimal
    cliente: ClienteRead
    nota_credito: NotaCreditoRead


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
