"""
Simula que, del lado del SRI, van llegando notas de crédito nuevas de otros
contribuyentes (fuera de nuestro control). Cada cierto tiempo inserta una
NotaSri nueva en la base propia del SRI (sri_mock.db), con
entregada=False, para que /api/sri/notas/pendiente tenga algo que ofrecer.
"""

import asyncio
import logging
import random
import string
from datetime import datetime, timezone
from decimal import Decimal

from app.core.sri_database import SriDatabase
from app.models.sri_models import NotaSri
from app.repositories.contribuyente_sri_repository import ContribuyenteSriRepository
from app.repositories.nota_sri_repository import NotaSriRepository

logger = logging.getLogger(__name__)

_RUC_EMISOR = "1790012345001"
_RAZON_SOCIAL_EMISOR = "SERVICIO DE RENTAS INTERNAS"
_TIPOS = ["NCD", "NCD_ISD"]
_ESTADOS_SRI = ["EMITIDA", "EMITIDA", "EMITIDA", "BLOQUEADA", "ANULADA"]


def _numero_autorizacion_aleatorio() -> str:
    return "".join(random.choices(string.digits, k=37))


def _clave_acceso_aleatoria() -> str:
    return "".join(random.choices(string.digits, k=49))


async def _generar_una_nota() -> None:
    async with SriDatabase.SessionLocal() as session:
        contribuyente_repo = ContribuyenteSriRepository(session)
        nota_repo = NotaSriRepository(session)

        rucs = await contribuyente_repo.listar_rucs()
        if not rucs:
            logger.warning("[SRI-GEN] No hay contribuyentes registrados, se omite este ciclo")
            return

        ruc_beneficiario = random.choice(rucs)
        contribuyente = await contribuyente_repo.get_by_ruc(ruc_beneficiario)

        valor_nominal = Decimal(random.randrange(1000, 30000))

        nota = NotaSri(
            numero_autorizacion=_numero_autorizacion_aleatorio(),
            clave_acceso=_clave_acceso_aleatoria(),
            ruc_emisor=_RUC_EMISOR,
            razon_social_emisor=_RAZON_SOCIAL_EMISOR,
            ruc_beneficiario=ruc_beneficiario,
            razon_social_beneficiario=contribuyente.razon_social,
            tipo=random.choice(_TIPOS),
            valor_nominal=valor_nominal,
            saldo_disponible=valor_nominal,
            fecha_emision=datetime.now(timezone.utc).date().isoformat(),
            estado_sri=random.choice(_ESTADOS_SRI),
            historial_endosos=[],
            entregada=False,
        )

        await nota_repo.create(nota)
        await session.commit()
        logger.info(
            "[SRI-GEN] Nueva nota %s generada para %s (valor: %s)",
            nota.numero_autorizacion,
            ruc_beneficiario,
            valor_nominal,
        )


async def generar_notas_periodicamente(intervalo_segundos: int = 15) -> None:
    logger.info("[SRI-GEN] Generador de notas del SRI iniciado (cada %ss)", intervalo_segundos)
    try:
        while True:
            await asyncio.sleep(intervalo_segundos)
            try:
                await _generar_una_nota()
            except Exception:
                logger.exception("[SRI-GEN] Error inesperado generando una nota")
    except asyncio.CancelledError:
        logger.info("[SRI-GEN] Generador de notas del SRI detenido")
        raise
