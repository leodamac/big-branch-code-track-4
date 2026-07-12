from typing import List
from uuid import UUID

from sqlmodel import select
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import BaseRepository
from app.models.enums import TipoDocumento
from app.models.models import Documento


class DocumentoRepository(BaseRepository[Documento]):

    def __init__(self, session: AsyncSession):
        super().__init__(Documento, session)

    async def get_max_version(self, expediente_id: UUID, tipo: TipoDocumento) -> int:
        statement = select(func.max(self.model.version)).where(
            self.model.expediente_id == expediente_id,
            self.model.tipo == tipo,
        )
        result = await self.session.execute(statement)
        version = result.scalar_one_or_none()
        return version or 0

    async def desactivar_activos(self, expediente_id: UUID, tipo: TipoDocumento) -> None:
        statement = select(self.model).where(
            self.model.expediente_id == expediente_id,
            self.model.tipo == tipo,
            self.model.es_activo.is_(True),
        )
        result = await self.session.execute(statement)
        activos = result.scalars().all()
        for documento in activos:
            documento.es_activo = False

    async def list_by_expediente(
        self, expediente_id: UUID, solo_activos: bool = False
    ) -> List[Documento]:
        statement = select(self.model).where(self.model.expediente_id == expediente_id)
        if solo_activos:
            statement = statement.where(self.model.es_activo.is_(True))
        statement = statement.order_by(self.model.tipo, self.model.version.desc())
        result = await self.session.execute(statement)
        return list(result.scalars().all())
