from typing import Optional

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import BaseRepository
from app.models.models import Cliente


class ClienteRepository(BaseRepository[Cliente]):

    def __init__(self, session: AsyncSession):
        super().__init__(Cliente, session)

    async def get_by_ruc(self, ruc: str) -> Optional[Cliente]:
        statement = select(self.model).where(self.model.ruc == ruc)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()
