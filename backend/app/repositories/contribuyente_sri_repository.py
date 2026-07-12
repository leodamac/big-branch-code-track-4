from typing import Optional

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import BaseRepository
from app.models.sri_models import ContribuyenteSri


class ContribuyenteSriRepository(BaseRepository[ContribuyenteSri]):

    def __init__(self, session: AsyncSession):
        super().__init__(ContribuyenteSri, session)

    async def get_by_ruc(self, ruc: str) -> Optional[ContribuyenteSri]:
        statement = select(self.model).where(self.model.ruc == ruc)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def listar_rucs(self) -> list[str]:
        result = await self.session.execute(select(self.model.ruc))
        return list(result.scalars().all())
