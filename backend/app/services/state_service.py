from typing import Optional
from uuid import UUID

from app.models.enums import EstadoExpediente
from app.models.models import Expediente, HistorialEstado, utc_now
from app.repositories.expediente_repository import ExpedienteRepository
from app.repositories.historial_estado_repository import HistorialEstadoRepository
from app.services.state_machine import TRANSICIONES, TransicionInvalidaError


class StateService:
    """Servicio para las transiciones de estado del expediente"""

    def __init__(
        self,
        expediente_repo: ExpedienteRepository,
        historial_repo: HistorialEstadoRepository,
    ):
        self.expediente_repo = expediente_repo
        self.historial_repo = historial_repo

    async def cambiar_estado(
        self,
        expediente: Expediente,
        nuevo_estado: EstadoExpediente,
        usuario: str,
        comentarios: Optional[str] = None,
    ) -> Expediente:
        estado_anterior = expediente.estado
        expediente.estado = nuevo_estado
        expediente.updated_at = utc_now()

        historial = HistorialEstado(
            expediente_id=expediente.id,
            estado_anterior=estado_anterior,
            estado_nuevo=nuevo_estado,
            usuario=usuario,
            comentarios=comentarios,
        )
        await self.historial_repo.create(historial)
        await self.expediente_repo.update()
        return expediente

    async def procesar_evento(
        self,
        expediente_id: UUID,
        evento: str,
        usuario: str,
        comentarios: Optional[str] = None,
    ) -> Optional[dict]:
        expediente = await self.expediente_repo.get(expediente_id)
        if expediente is None:
            return None

        transiciones_validas = TRANSICIONES.get(expediente.estado, {})
        nuevo_estado = transiciones_validas.get(evento)
        if nuevo_estado is None:
            raise TransicionInvalidaError(
                f"El evento '{evento}' no es válido desde el estado '{expediente.estado.value}'"
            )

        estado_anterior = expediente.estado
        await self.cambiar_estado(expediente, nuevo_estado, usuario, comentarios)

        return {
            "expediente_id": expediente.id,
            "estado_anterior": estado_anterior,
            "estado_nuevo": expediente.estado,
        }

    async def obtener_historial(self, expediente_id: UUID) -> list[HistorialEstado]:
        return await self.historial_repo.list_by_expediente(expediente_id)
