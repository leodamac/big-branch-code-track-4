from uuid import UUID

from sqlmodel import SQLModel

from app.models.enums import EstadoExpediente
from app.schemas.cliente import ClienteRead


class ExpedienteAntecedente(SQLModel):
    id: UUID
    estado: EstadoExpediente
    numero_autorizacion: str


class AntecedentesResponse(SQLModel):
    cliente: ClienteRead
    expedientes_anteriores: list[ExpedienteAntecedente]
