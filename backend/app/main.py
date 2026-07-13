import asyncio
import contextlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api import api_router
from app.core.config import settings
from app.core.database import Database
from app.core.redis_client import RedisClient
from app.core.sri_database import SriDatabase
from app.services.expediente_extraction_worker import extraer_periodicamente
from app.services.sri_nota_generator import generar_notas_periodicamente


@asynccontextmanager
async def lifespan(app: FastAPI):
    await Database.connect()
    await RedisClient.connect()
    await SriDatabase.connect()

    tareas: list[asyncio.Task] = []
    if settings.SRI_GENERADOR_ACTIVO:
        tareas.append(
            asyncio.create_task(
                generar_notas_periodicamente(settings.SRI_GENERADOR_INTERVALO_SEGUNDOS)
            )
        )
    if settings.EXTRACCION_SRI_ACTIVA:
        tareas.append(
            asyncio.create_task(
                extraer_periodicamente(settings.EXTRACCION_SRI_INTERVALO_SEGUNDOS)
            )
        )

    yield

    for tarea in tareas:
        tarea.cancel()
    for tarea in tareas:
        with contextlib.suppress(asyncio.CancelledError):
            await tarea

    await SriDatabase.disconnect()
    await RedisClient.disconnect()
    await Database.disconnect()


app = FastAPI(title="RetoTaws API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
