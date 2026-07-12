import asyncio
import logging

import redis.asyncio as redis

from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisClient:
    client = None

    @classmethod
    async def connect(cls):
        try:
            cls.client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )

            await asyncio.wait_for(cls.client.ping(), timeout=3.0)

            logger.info("Redis conectado correctamente.")

        except Exception as e:
            cls.client = None
            logger.warning(f"Redis no disponible: {e}")

    @classmethod
    async def disconnect(cls):
        if cls.client:
            await cls.client.close()
