from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import JSON, Column, Numeric, Text, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

from app.models.enums import (
    EstadoExpediente,
    EstadoRiesgo,
    EstadoRUC,
    NivelRiesgo,
    TipoDocumento,
    TipoNotaCredito,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


# =========================================================
# CLIENTE
# =========================================================


class Cliente(SQLModel, table=True):
    __tablename__ = "cliente"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    ruc: str = Field(
        max_length=13,
        unique=True,
        index=True,
        nullable=False,
    )

    razon_social: str = Field(
        max_length=255,
        nullable=False,
    )

    estado_ruc: EstadoRUC = Field(
        nullable=False,
    )

    datos_kyc: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(
            JSON,
            nullable=False,
        ),
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
    )

    # Un cliente puede tener muchos expedientes.
    expedientes: list["Expediente"] = Relationship(
        back_populates="cliente",
    )


# =========================================================
# NOTA DE CRÉDITO
# =========================================================


class NotaCredito(SQLModel, table=True):
    __tablename__ = "nota_credito"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    numero_autorizacion: str = Field(
        max_length=100,
        unique=True,
        index=True,
        nullable=False,
    )

    ruc_beneficiario: str = Field(
        max_length=13,
        index=True,
        nullable=False,
    )

    valor_nominal: Decimal = Field(
        sa_column=Column(
            Numeric(14, 2),
            nullable=False,
        ),
    )

    saldo_disponible: Decimal = Field(
        sa_column=Column(
            Numeric(14, 2),
            nullable=False,
        ),
    )

    tipo: TipoNotaCredito = Field(
        nullable=False,
    )

    historial_endosos: list[dict[str, Any]] = Field(
        default_factory=list,
        sa_column=Column(
            JSON,
            nullable=False,
        ),
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
    )

    # Una nota puede repartirse entre varios expedientes (1 a muchos).
    expedientes: list["Expediente"] = Relationship(
        back_populates="nota_credito",
    )


# =========================================================
# EXPEDIENTE
# =========================================================


class Expediente(SQLModel, table=True):
    __tablename__ = "expediente"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    cliente_id: UUID = Field(
        foreign_key="cliente.id",
        index=True,
        nullable=False,
    )

    # Sin unique=True: una nota_credito puede repartirse entre varios
    # expedientes (1 a muchos).
    nota_id: UUID = Field(
        foreign_key="nota_credito.id",
        index=True,
        nullable=False,
    )

    estado: EstadoExpediente = Field(
        default=EstadoExpediente.RECIBIDO,
        index=True,
        nullable=False,
    )

    monto_a_negociar: Decimal = Field(
        sa_column=Column(
            Numeric(14, 2),
            nullable=False,
        ),
    )

    responsable: str = Field(
        max_length=255,
        index=True,
        nullable=False,
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
    )

    updated_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
    )

    # Muchos expedientes pertenecen a un cliente.
    cliente: "Cliente" = Relationship(
        back_populates="expedientes",
    )

    # Cada expediente sigue apuntando a una sola nota de crédito.
    nota_credito: "NotaCredito" = Relationship(
        back_populates="expedientes",
    )

    # Un expediente puede tener muchos documentos.
    documentos: list["Documento"] = Relationship(
        back_populates="expediente",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
        },
    )

    # Un expediente puede tener muchos riesgos.
    riesgos: list["Riesgo"] = Relationship(
        back_populates="expediente",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
        },
    )

    # Un expediente puede tener muchos registros históricos.
    historial_estados: list["HistorialEstado"] = Relationship(
        back_populates="expediente",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
        },
    )


# =========================================================
# DOCUMENTO
# =========================================================


class Documento(SQLModel, table=True):
    __tablename__ = "documento"

    __table_args__ = (
        UniqueConstraint(
            "expediente_id",
            "tipo",
            "version",
            name="uq_documento_expediente_tipo_version",
        ),
    )

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    expediente_id: UUID = Field(
        foreign_key="expediente.id",
        index=True,
        nullable=False,
    )

    tipo: TipoDocumento = Field(
        index=True,
        nullable=False,
    )

    version: int = Field(
        default=1,
        ge=1,
        nullable=False,
    )

    storage_path: str = Field(
        max_length=500,
        nullable=False,
    )

    hash_sha256: str = Field(
        max_length=64,
        index=True,
        nullable=False,
    )

    es_activo: bool = Field(
        default=True,
        index=True,
        nullable=False,
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
    )

    expediente: "Expediente" = Relationship(
        back_populates="documentos",
    )


# =========================================================
# RIESGO
# =========================================================


class Riesgo(SQLModel, table=True):
    __tablename__ = "riesgo"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    expediente_id: UUID = Field(
        foreign_key="expediente.id",
        index=True,
        nullable=False,
    )

    descripcion: str = Field(
        sa_column=Column(
            Text,
            nullable=False,
        ),
    )

    nivel: NivelRiesgo = Field(
        index=True,
        nullable=False,
    )

    estado: EstadoRiesgo = Field(
        default=EstadoRiesgo.ABIERTO,
        index=True,
        nullable=False,
    )

    evidencia: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(
            JSON,
            nullable=False,
        ),
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
    )

    expediente: "Expediente" = Relationship(
        back_populates="riesgos",
    )


# =========================================================
# HISTORIAL DE ESTADOS
# =========================================================


class HistorialEstado(SQLModel, table=True):
    __tablename__ = "historial_estados"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
    )

    expediente_id: UUID = Field(
        foreign_key="expediente.id",
        index=True,
        nullable=False,
    )

    # En el primer registro puede no existir estado anterior.
    estado_anterior: EstadoExpediente | None = Field(
        default=None,
        nullable=True,
    )

    estado_nuevo: EstadoExpediente = Field(
        nullable=False,
    )

    usuario: str = Field(
        max_length=255,
        nullable=False,
    )

    comentarios: str | None = Field(
        default=None,
        sa_column=Column(
            Text,
            nullable=True,
        ),
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        nullable=False,
    )

    expediente: "Expediente" = Relationship(
        back_populates="historial_estados",
    )
