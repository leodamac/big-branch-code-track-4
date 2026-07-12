from typing import List
from uuid import UUID

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import BaseRepository
from app.models.models import HistorialEstado


class HistorialEstadoRepository(BaseRepository[HistorialEstado]):

    def __init__(self, session: AsyncSession):
        super().__init__(HistorialEstado, session)

    async def list_by_expediente(self, expediente_id: UUID) -> List[HistorialEstado]:
        statement = (
            select(self.model)
            .where(self.model.expediente_id == expediente_id)
            .order_by(self.model.created_at.asc())
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())
