from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, Numeric
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class NotaSri(SQLModel, table=True):
    """Representa una nota de crédito tal como la ve el SRI. Vive en su
    propia base de datos (sri_mock.db), separada de nuestro negocio."""

    __tablename__ = "notas_sri"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    numero_autorizacion: str = Field(max_length=100, unique=True, index=True, nullable=False)
    clave_acceso: str = Field(max_length=100, nullable=False)

    ruc_emisor: str = Field(max_length=13, nullable=False)
    razon_social_emisor: str = Field(max_length=255, nullable=False)

    ruc_beneficiario: str = Field(max_length=13, index=True, nullable=False)
    razon_social_beneficiario: str = Field(max_length=255, nullable=False)

    tipo: str = Field(max_length=20, nullable=False)
    valor_nominal: Decimal = Field(sa_column=Column(Numeric(14, 2), nullable=False))
    saldo_disponible: Decimal = Field(sa_column=Column(Numeric(14, 2), nullable=False))

    fecha_emision: str = Field(max_length=20, nullable=False)
    estado_sri: str = Field(max_length=20, nullable=False)

    historial_endosos: list[dict[str, Any]] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
    )

    # True una vez que /notas/pendiente ya la entregó (no se vuelve a
    # ofrecer, aunque le quede saldo).
    entregada: bool = Field(default=False, index=True, nullable=False)

    created_at: datetime = Field(default_factory=utc_now, nullable=False)


class ContribuyenteSri(SQLModel, table=True):
    """Registro de contribuyentes tal como lo consulta el SRI."""

    __tablename__ = "contribuyentes_sri"

    ruc: str = Field(max_length=13, primary_key=True)
    razon_social: str = Field(max_length=255, nullable=False)
    estado: str = Field(max_length=20, nullable=False)
