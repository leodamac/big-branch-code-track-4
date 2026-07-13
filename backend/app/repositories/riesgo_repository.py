from typing import List, Optional
from uuid import UUID

from sqlmodel import select
from sqlalchemy import case, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import BaseRepository
from app.models.enums import EstadoRiesgo, NivelRiesgo
from app.models.models import Riesgo

_ORDEN_NIVEL = case(
    (Riesgo.nivel == NivelRiesgo.CRITICO, 1),
    (Riesgo.nivel == NivelRiesgo.ALTO, 2),
    (Riesgo.nivel == NivelRiesgo.MEDIO, 3),
    (Riesgo.nivel == NivelRiesgo.BAJO, 4),
)


class RiesgoRepository(BaseRepository[Riesgo]):

    def __init__(self, session: AsyncSession):
        super().__init__(Riesgo, session)

    async def list_by_expediente(self, expediente_id: UUID) -> List[Riesgo]:
        statement = (
            select(self.model)
            .where(self.model.expediente_id == expediente_id)
            .order_by(_ORDEN_NIVEL)
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def get(self, riesgo_id: UUID, expediente_id: UUID) -> Optional[Riesgo]:
        statement = select(self.model).where(
            self.model.id == riesgo_id, self.model.expediente_id == expediente_id
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def resolver(self, riesgo: Riesgo) -> Riesgo:
        riesgo.estado = EstadoRiesgo.RESUELTO
        await self.session.flush()
        return riesgo

    async def delete_by_expediente(self, expediente_id: UUID) -> None:
        await self.session.execute(
            delete(self.model).where(self.model.expediente_id == expediente_id)
        )
        await self.session.flush()
