from typing import Optional
from uuid import UUID

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import BaseRepository
from app.models.models import NotaCredito


class NotaCreditoRepository(BaseRepository[NotaCredito]):

    def __init__(self, session: AsyncSession):
        super().__init__(NotaCredito, session)

    async def get_by_numero_autorizacion(
        self, numero_autorizacion: str
    ) -> Optional[NotaCredito]:
        statement = select(self.model).where(
            self.model.numero_autorizacion == numero_autorizacion
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_for_update(self, nota_id: UUID) -> Optional[NotaCredito]:
        # SELECT ... FOR UPDATE: bloquea la fila hasta el commit/rollback de
        # esta transacción. Lock real en Postgres/Supabase (motor de
        # producción); en SQLite (dev local) el dialecto lo ignora en silencio.
        statement = (
            select(self.model).where(self.model.id == nota_id).with_for_update()
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()
