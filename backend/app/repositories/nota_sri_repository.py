from typing import Optional

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import BaseRepository
from app.models.sri_models import NotaSri


class NotaSriRepository(BaseRepository[NotaSri]):

    def __init__(self, session: AsyncSession):
        super().__init__(NotaSri, session)

    async def get_by_numero_autorizacion(
        self, numero_autorizacion: str
    ) -> Optional[NotaSri]:
        statement = select(self.model).where(
            self.model.numero_autorizacion == numero_autorizacion
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def get_pendiente(self) -> Optional[NotaSri]:
        statement = (
            select(self.model)
            .where(self.model.entregada.is_(False))
            .where(self.model.saldo_disponible > 0)
            .order_by(self.model.created_at.asc())
            .limit(1)
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def marcar_entregada(self, nota: NotaSri) -> NotaSri:
        nota.entregada = True
        await self.session.flush()
        return nota
