from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import TypeAdapter

from app.agents.treasury_agent import TreasuryAgent
from app.models.enums import EstadoExpediente
from app.models.models import Cliente, Expediente, HistorialEstado, NotaCredito
from app.repositories.cliente_repository import ClienteRepository
from app.repositories.expediente_repository import ExpedienteRepository
from app.repositories.historial_estado_repository import HistorialEstadoRepository
from app.repositories.nota_credito_repository import NotaCreditoRepository
from app.schemas.antecedentes import AntecedentesResponse, ExpedienteAntecedente
from app.schemas.expediente import ExpedienteCreate, ExpedienteDetail, ExpedienteListItem
from app.services.cache_service import CacheService


class SaldoInsuficienteError(Exception):
    pass


_list_item_adapter = TypeAdapter(list[ExpedienteListItem])

_CACHE_KEY_LISTA_DEFAULT = "expedientes:lista:default"


def _cache_key_expediente(expediente_id: UUID) -> str:
    return f"expediente:{expediente_id}"


class ApplicationService:
    """Servicio orquestador: crea/lista/obtiene expedientes, con caché Redis"""

    def __init__(
        self,
        cliente_repo: ClienteRepository,
        nota_repo: NotaCreditoRepository,
        expediente_repo: ExpedienteRepository,
        historial_repo: HistorialEstadoRepository,
        treasury_agent: Optional[TreasuryAgent] = None,
    ):
        self.cliente_repo = cliente_repo
        self.nota_repo = nota_repo
        self.expediente_repo = expediente_repo
        self.historial_repo = historial_repo
        self.cache = CacheService()
        self.treasury_agent = treasury_agent or TreasuryAgent()

    async def invalidar_cache_expediente(self, expediente_id: UUID) -> None:
        await self.cache.delete(_cache_key_expediente(expediente_id), _CACHE_KEY_LISTA_DEFAULT)

    async def _get_or_create_cliente(self, data: ExpedienteCreate) -> Cliente:
        cliente = await self.cliente_repo.get_by_ruc(data.cliente_ruc)
        if cliente is not None:
            return cliente
        cliente = Cliente(
            ruc=data.cliente_ruc,
            razon_social=data.razon_social,
            estado_ruc=data.estado_ruc,
        )
        return await self.cliente_repo.create(cliente)

    async def _get_or_create_nota(self, data: ExpedienteCreate) -> NotaCredito:
        nota = await self.nota_repo.get_by_numero_autorizacion(
            data.nota.numero_autorizacion
        )
        if nota is not None:
            return nota
        nota = NotaCredito(**data.nota.model_dump())
        return await self.nota_repo.create(nota)

    async def _reservar_saldo(self, nota_id: UUID, monto: Decimal) -> NotaCredito:
        # Lock por fila sobre la nota mientras se valida y descuenta el
        # saldo: evita que dos expedientes concurrentes sobregiren la misma
        # nota. Real en Postgres/Supabase (producción); no-op en SQLite (dev
        # local).
        nota = await self.nota_repo.get_for_update(nota_id)
        if nota is None:
            raise ValueError("Nota de crédito no encontrada")
        if nota.saldo_disponible < monto:
            raise SaldoInsuficienteError(
                f"Saldo disponible ({nota.saldo_disponible}) insuficiente para reservar {monto}"
            )
        nota.saldo_disponible -= monto
        await self.nota_repo.update()
        return nota

    async def crear_expediente(self, data: ExpedienteCreate) -> Expediente:
        cliente = await self._get_or_create_cliente(data)
        nota = await self._get_or_create_nota(data)

        await self._reservar_saldo(nota.id, data.monto_a_negociar)

        expediente = Expediente(
            cliente_id=cliente.id,
            nota_id=nota.id,
            estado=EstadoExpediente.RECIBIDO,
            monto_a_negociar=data.monto_a_negociar,
            responsable=data.responsable,
        )
        await self.expediente_repo.create(expediente)

        historial = HistorialEstado(
            expediente_id=expediente.id,
            estado_anterior=None,
            estado_nuevo=EstadoExpediente.RECIBIDO,
            usuario=data.responsable,
            comentarios="Creación del expediente",
        )
        await self.historial_repo.create(historial)

        await self.cache.delete(_CACHE_KEY_LISTA_DEFAULT)
        return expediente

    async def listar_expedientes(
        self, limit: int = 50, offset: int = 0
    ) -> list[ExpedienteListItem]:
        usar_cache = limit == 50 and offset == 0

        if usar_cache:
            cached = await self.cache.get(_CACHE_KEY_LISTA_DEFAULT)
            if cached is not None:
                return _list_item_adapter.validate_json(cached)

        expedientes = await self.expediente_repo.list_all(limit, offset)
        items = [
            ExpedienteListItem.model_validate(e, from_attributes=True) for e in expedientes
        ]

        if usar_cache:
            await self.cache.set(
                _CACHE_KEY_LISTA_DEFAULT, _list_item_adapter.dump_json(items).decode()
            )

        return items

    async def obtener_expediente_completo(
        self, expediente_id: UUID
    ) -> Optional[ExpedienteDetail]:
        cache_key = _cache_key_expediente(expediente_id)

        cached = await self.cache.get(cache_key)
        if cached is not None:
            return ExpedienteDetail.model_validate_json(cached)

        expediente = await self.expediente_repo.get_full(expediente_id)
        if expediente is None:
            return None

        detail = ExpedienteDetail.model_validate(expediente, from_attributes=True)
        await self.cache.set(cache_key, detail.model_dump_json())
        return detail

    async def buscar_antecedentes(self, ruc: str) -> Optional[AntecedentesResponse]:
        cliente = await self.cliente_repo.get_by_ruc(ruc)
        if cliente is None:
            return None

        expedientes = await self.expediente_repo.list_by_cliente(cliente.id)

        return AntecedentesResponse(
            cliente=cliente,
            expedientes_anteriores=[
                ExpedienteAntecedente(
                    id=e.id,
                    estado=e.estado,
                    numero_autorizacion=e.nota_credito.numero_autorizacion,
                )
                for e in expedientes
            ],
        )

    async def obtener_siguiente_accion(self, expediente_id: UUID) -> Optional[dict]:
        expediente = await self.expediente_repo.get_full(expediente_id)
        if expediente is None:
            return None

        datos_nota = {
            "numero_autorizacion": expediente.nota_credito.numero_autorizacion,
            "valor_nominal": str(expediente.nota_credito.valor_nominal),
            "saldo_disponible": str(expediente.nota_credito.saldo_disponible),
            "tipo": expediente.nota_credito.tipo.value,
        }
        return await self.treasury_agent.sugerir_negociacion(
            datos_nota, expediente.monto_a_negociar
        )

    async def aceptar_siguiente_accion(
        self,
        expediente_id: UUID,
        accion: str,
        usuario: str,
        comentarios: Optional[str] = None,
    ) -> Optional[dict]:
        expediente = await self.expediente_repo.get(expediente_id)
        if expediente is None:
            return None

        # No mapeamos codigo_accion a una transición de estado: los valores
        # del agente (PREPARAR_ORDEN, SOLICITAR_CORRECCION_MONTO,
        # ENVIAR_CUMPLIMIENTO) no corresponden 1 a 1 con los eventos de
        # state_machine.py. Solo dejamos constancia en el historial; el
        # cambio de estado real lo sigue disparando el operador vía
        # POST /estado si corresponde.
        detalle = f"Acción de tesorería aceptada: {accion}"
        if comentarios:
            detalle += f" — {comentarios}"

        historial = HistorialEstado(
            expediente_id=expediente.id,
            estado_anterior=expediente.estado,
            estado_nuevo=expediente.estado,
            usuario=usuario,
            comentarios=detalle,
        )
        await self.historial_repo.create(historial)

        return {
            "expediente_id": expediente.id,
            "accion_aceptada": accion,
            "estado": expediente.estado,
        }
