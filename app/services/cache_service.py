from redis.exceptions import RedisError

from app.core.redis_client import RedisClient


class CacheService:
    """Helper que abstrae el acceso a Redis: centraliza el manejo de
    errores (RedisError) para que los demás services no repitan el mismo
    try/except en cada método."""

    def __init__(self):
        self.redis = RedisClient

    async def get(self, key: str) -> str | None:
        if not self.redis.client:
            return None
        try:
            return await self.redis.client.get(key)
        except RedisError as e:
            print(f"Error al leer '{key}' desde Redis: {e}")
            return None

    async def set(self, key: str, value: str, ttl: int = 60) -> None:
        if not self.redis.client:
            return
        try:
            await self.redis.client.setex(key, ttl, value)
        except RedisError as e:
            print(f"Error al guardar '{key}' en Redis: {e}")

    async def delete(self, *keys: str) -> None:
        if not self.redis.client or not keys:
            return
        try:
            await self.redis.client.delete(*keys)
        except RedisError as e:
            print(f"Error al eliminar {keys} de Redis: {e}")
