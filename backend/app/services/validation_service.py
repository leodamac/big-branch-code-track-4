from typing import Optional
from uuid import UUID

from app.agents.compliance_agent import ComplianceAgent
from app.models.enums import EstadoExpediente, EstadoRiesgo, NivelRiesgo
from app.models.models import Riesgo
from app.repositories.expediente_repository import ExpedienteRepository
from app.repositories.riesgo_repository import RiesgoRepository
from app.services.state_service import StateService


class ValidationService:
    """Servicio de reglas de negocio: genera riesgos (vía ComplianceAgent) y
    gestiona su ciclo de vida"""

    def __init__(
        self,
        expediente_repo: ExpedienteRepository,
        riesgo_repo: RiesgoRepository,
        state_service: StateService,
        compliance_agent: Optional[ComplianceAgent] = None,
    ):
        self.expediente_repo = expediente_repo
        self.riesgo_repo = riesgo_repo
        self.state_service = state_service
        self.compliance_agent = compliance_agent or ComplianceAgent()

    async def validar_expediente(self, expediente_id: UUID, usuario: str) -> Optional[dict]:
        expediente = await self.expediente_repo.get_full(expediente_id)
        if expediente is None:
            return None

        datos_cliente = {
            "ruc": expediente.cliente.ruc,
            "razon_social": expediente.cliente.razon_social,
            "estado_ruc": expediente.cliente.estado_ruc.value,
        }
        # No se incluye monto_a_negociar ni saldo_disponible: la viabilidad
        # financiera (monto vs. saldo) es responsabilidad exclusiva del
        # TreasuryAgent (R1/R2), no del ComplianceAgent. Además,
        # saldo_disponible aquí ya refleja el saldo DESPUÉS de la reserva
        # atómica en ApplicationService._reservar_saldo — compararlo contra
        # monto_a_negociar generaría un falso positivo en todos los casos.
        datos_nota = {
            "numero_autorizacion": expediente.nota_credito.numero_autorizacion,
            "ruc_beneficiario": expediente.nota_credito.ruc_beneficiario,
            "tipo": expediente.nota_credito.tipo.value,
            "historial_endosos": expediente.nota_credito.historial_endosos,
        }
        documentos_presentes = [
            {
                "tipo": doc.tipo.value,
                "version": doc.version,
                "es_activo": doc.es_activo,
                "subido_en": doc.created_at.isoformat(),
            }
            for doc in expediente.documentos
        ]

        riesgos_detectados = await self.compliance_agent.analizar_riesgos(
            datos_cliente, datos_nota, documentos_presentes
        )

        for riesgo_dict in riesgos_detectados:
            try:
                nivel = NivelRiesgo(riesgo_dict.get("nivel"))
            except ValueError:
                nivel = NivelRiesgo.MEDIO

            riesgo = Riesgo(
                expediente_id=expediente.id,
                descripcion=riesgo_dict.get("descripcion", "Riesgo detectado por el agente de IA"),
                nivel=nivel,
                evidencia={
                    "regla_activadora": riesgo_dict.get("regla_activadora"),
                    "detalle": riesgo_dict.get("evidencia"),
                },
            )
            await self.riesgo_repo.create(riesgo)

        if expediente.estado == EstadoExpediente.RECIBIDO:
            await self.state_service.cambiar_estado(
                expediente,
                EstadoExpediente.EN_VALIDACION,
                usuario,
                "Inicio de validación",
            )

        todos_los_riesgos = await self.riesgo_repo.list_by_expediente(expediente.id)
        abiertos = [r for r in todos_los_riesgos if r.estado == EstadoRiesgo.ABIERTO]
        resumen = {
            "criticos": sum(1 for r in abiertos if r.nivel == NivelRiesgo.CRITICO),
            "altos": sum(1 for r in abiertos if r.nivel == NivelRiesgo.ALTO),
            "medios": sum(1 for r in abiertos if r.nivel == NivelRiesgo.MEDIO),
            "bajos": sum(1 for r in abiertos if r.nivel == NivelRiesgo.BAJO),
        }
        puede_avanzar = resumen["criticos"] == 0 and resumen["altos"] == 0

        return {
            "expediente_id": expediente.id,
            "resultado": "VALIDACION_COMPLETADA",
            "estado": expediente.estado,
            "resumen_riesgos": resumen,
            "puede_avanzar": puede_avanzar,
        }

    async def listar_riesgos(self, expediente_id: UUID) -> list[Riesgo]:
        return await self.riesgo_repo.list_by_expediente(expediente_id)

    async def resolver_riesgo(
        self, expediente_id: UUID, riesgo_id: UUID
    ) -> Optional[Riesgo]:
        riesgo = await self.riesgo_repo.get(riesgo_id, expediente_id)
        if riesgo is None:
            return None
        return await self.riesgo_repo.resolver(riesgo)
