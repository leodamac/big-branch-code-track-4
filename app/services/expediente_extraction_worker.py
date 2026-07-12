"""
Worker de nuestra propia API: cada cierto tiempo llama al SriApiClient (HTTP
real, no acceso directo a datos) para pedir una nota pendiente, y si hay
una, crea un expediente a partir de ella vía ApplicationService — el mismo
camino que usaría cualquier creación real.
"""

import asyncio
import logging
from decimal import Decimal

from app.core.database import Database
from app.core.sri_client import SriApiClient
from app.models.enums import EstadoRUC, TipoNotaCredito
from app.repositories.cliente_repository import ClienteRepository
from app.repositories.expediente_repository import ExpedienteRepository
from app.repositories.historial_estado_repository import HistorialEstadoRepository
from app.repositories.nota_credito_repository import NotaCreditoRepository
from app.schemas.expediente import ExpedienteCreate
from app.schemas.nota_credito import NotaCreditoCreate
from app.services.application_service import ApplicationService, SaldoInsuficienteError

logger = logging.getLogger(__name__)

MONTO_MINIMO = Decimal("50")


async def _extraer_una_nota(cliente_sri: SriApiClient) -> None:
    nota_sri = await cliente_sri.obtener_nota_pendiente()
    if nota_sri is None:
        logger.info("[EXTRACCION] Sin notas pendientes en el SRI, se omite este ciclo")
        return

    saldo_disponible = Decimal(nota_sri["saldoDisponible"])
    if saldo_disponible < MONTO_MINIMO:
        logger.info(
            "[EXTRACCION] Nota %s con saldo insuficiente (%s), se omite",
            nota_sri["numeroAutorizacion"],
            saldo_disponible,
        )
        return

    ruc_beneficiario = nota_sri["rucBeneficiario"]
    contribuyente = await cliente_sri.consultar_contribuyente(ruc_beneficiario)
    estado_ruc = EstadoRUC(contribuyente["estado"]) if contribuyente else EstadoRUC.ACTIVO

    monto_a_negociar = min(saldo_disponible, max(MONTO_MINIMO, saldo_disponible * Decimal("0.5")))

    data = ExpedienteCreate(
        cliente_ruc=ruc_beneficiario,
        razon_social=nota_sri["razonSocialBeneficiario"],
        estado_ruc=estado_ruc,
        nota=NotaCreditoCreate(
            numero_autorizacion=nota_sri["numeroAutorizacion"],
            ruc_beneficiario=ruc_beneficiario,
            valor_nominal=Decimal(nota_sri["valorNominal"]),
            saldo_disponible=saldo_disponible,
            tipo=TipoNotaCredito(nota_sri["tipo"]),
            historial_endosos=nota_sri["historialEndosos"],
        ),
        monto_a_negociar=monto_a_negociar,
        responsable="pipeline-extraccion",
    )

    async with Database.SessionLocal() as session:
        service = ApplicationService(
            ClienteRepository(session),
            NotaCreditoRepository(session),
            ExpedienteRepository(session),
            HistorialEstadoRepository(session),
        )
        try:
            expediente = await service.crear_expediente(data)
            await session.commit()
            logger.info(
                "[EXTRACCION] Expediente %s creado desde el SRI (nota %s)",
                expediente.id,
                nota_sri["numeroAutorizacion"],
            )
        except SaldoInsuficienteError as e:
            await session.rollback()
            logger.warning("[EXTRACCION] No se pudo crear expediente: %s", e)


async def extraer_periodicamente(intervalo_segundos: int = 10) -> None:
    logger.info(
        "[EXTRACCION] Worker de extracción del SRI iniciado (cada %ss)", intervalo_segundos
    )
    cliente_sri = SriApiClient()
    try:
        while True:
            await asyncio.sleep(intervalo_segundos)
            try:
                await _extraer_una_nota(cliente_sri)
            except Exception:
                logger.exception("[EXTRACCION] Error inesperado en el ciclo de extracción")
    except asyncio.CancelledError:
        logger.info("[EXTRACCION] Worker de extracción del SRI detenido")
        raise
