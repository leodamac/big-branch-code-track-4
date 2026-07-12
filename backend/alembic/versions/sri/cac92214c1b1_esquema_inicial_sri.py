"""esquema inicial sri

Revision ID: cac92214c1b1
Revises:
Create Date: 2026-07-12 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'cac92214c1b1'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = ('sri',)
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'notas_sri',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('numero_autorizacion', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('clave_acceso', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('ruc_emisor', sqlmodel.sql.sqltypes.AutoString(length=13), nullable=False),
        sa.Column('razon_social_emisor', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('ruc_beneficiario', sqlmodel.sql.sqltypes.AutoString(length=13), nullable=False),
        sa.Column('razon_social_beneficiario', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('tipo', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('valor_nominal', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('saldo_disponible', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('fecha_emision', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('estado_sri', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('historial_endosos', sa.JSON(), nullable=False),
        sa.Column('entregada', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('notas_sri', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notas_sri_numero_autorizacion'), ['numero_autorizacion'], unique=True)
        batch_op.create_index(batch_op.f('ix_notas_sri_ruc_beneficiario'), ['ruc_beneficiario'], unique=False)
        batch_op.create_index(batch_op.f('ix_notas_sri_entregada'), ['entregada'], unique=False)

    op.create_table(
        'contribuyentes_sri',
        sa.Column('ruc', sqlmodel.sql.sqltypes.AutoString(length=13), nullable=False),
        sa.Column('razon_social', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column('estado', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.PrimaryKeyConstraint('ruc'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('contribuyentes_sri')
    with op.batch_alter_table('notas_sri', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notas_sri_entregada'))
        batch_op.drop_index(batch_op.f('ix_notas_sri_ruc_beneficiario'))
        batch_op.drop_index(batch_op.f('ix_notas_sri_numero_autorizacion'))
    op.drop_table('notas_sri')
