from typing import Generic, Type, TypeVar, Optional
from sqlmodel import SQLModel
from sqlalchemy.ext.asyncio import AsyncSession

ModelType = TypeVar("ModelType", bound=SQLModel)

class BaseRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def create(self, obj_in: ModelType) -> ModelType:
        self.session.add(obj_in)
        await self.session.flush()
        return obj_in

    async def delete(self, obj) -> Optional[ModelType]:
        await self.session.delete(obj)
        await self.session.flush()

    async def update(self):
        await self.session.flush()
