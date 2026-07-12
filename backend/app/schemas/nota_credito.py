from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlmodel import SQLModel

from app.models.enums import TipoNotaCredito


class NotaCreditoCreate(SQLModel):
    numero_autorizacion: str
    ruc_beneficiario: str
    valor_nominal: Decimal
    saldo_disponible: Decimal
    tipo: TipoNotaCredito
    historial_endosos: list[dict[str, Any]] = []


class NotaCreditoRead(SQLModel):
    id: UUID
    numero_autorizacion: str
    ruc_beneficiario: str
    valor_nominal: Decimal
    saldo_disponible: Decimal
    tipo: TipoNotaCredito
