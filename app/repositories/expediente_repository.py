from typing import List, Optional
from uuid import UUID

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.repositories.base import BaseRepository
from app.models.models import Expediente


class ExpedienteRepository(BaseRepository[Expediente]):

    def __init__(self, session: AsyncSession):
        super().__init__(Expediente, session)

    async def get(self, expediente_id: UUID) -> Optional[Expediente]:
        return await self.session.get(self.model, expediente_id)

    async def get_full(self, expediente_id: UUID) -> Optional[Expediente]:
        statement = (
            select(self.model)
            .where(self.model.id == expediente_id)
            .options(
                selectinload(self.model.cliente),
                selectinload(self.model.nota_credito),
                selectinload(self.model.documentos),
                selectinload(self.model.riesgos),
                selectinload(self.model.historial_estados),
            )
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_all(self, limit: int = 50, offset: int = 0) -> List[Expediente]:
        statement = (
            select(self.model)
            .options(
                selectinload(self.model.cliente),
                selectinload(self.model.nota_credito),
            )
            .order_by(self.model.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def list_by_cliente(self, cliente_id: UUID) -> List[Expediente]:
        statement = (
            select(self.model)
            .where(self.model.cliente_id == cliente_id)
            .options(selectinload(self.model.nota_credito))
            .order_by(self.model.created_at.desc())
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())
