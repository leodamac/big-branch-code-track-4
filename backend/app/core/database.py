from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.core.config import settings


class Database:
    engine = None
    SessionLocal = None

    @classmethod
    async def connect(cls):
        url = settings.DATABASE_URL.replace(
            "sqlite://",
            "sqlite+aiosqlite://",
            1
        )

        cls.engine = create_async_engine(
            url,
            echo=False,
            future=True,
            pool_size=5,
            max_overflow=10
        )

        cls.SessionLocal = async_sessionmaker(
            bind=cls.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

    @classmethod
    async def disconnect(cls):
        if cls.engine:
            await cls.engine.dispose()
