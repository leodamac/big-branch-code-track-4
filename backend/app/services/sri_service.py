from datetime import datetime, timezone
from typing import Any, Optional

from app.models.sri_models import ContribuyenteSri, NotaSri
from app.repositories.contribuyente_sri_repository import ContribuyenteSriRepository
from app.repositories.nota_sri_repository import NotaSriRepository


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _nota_a_dict(nota: NotaSri) -> dict[str, Any]:
    return {
        "numeroAutorizacion": nota.numero_autorizacion,
        "claveAcceso": nota.clave_acceso,
        "rucEmisor": nota.ruc_emisor,
        "razonSocialEmisor": nota.razon_social_emisor,
        "rucBeneficiario": nota.ruc_beneficiario,
        "razonSocialBeneficiario": nota.razon_social_beneficiario,
        "tipo": nota.tipo,
        "valorNominal": str(nota.valor_nominal),
        "saldoDisponible": str(nota.saldo_disponible),
        "fechaEmision": nota.fecha_emision,
        "estadoSri": nota.estado_sri,
        "historialEndosos": nota.historial_endosos,
    }


def _contribuyente_a_dict(contribuyente: ContribuyenteSri) -> dict[str, Any]:
    return {
        "ruc": contribuyente.ruc,
        "razonSocial": contribuyente.razon_social,
        "estado": contribuyente.estado,
    }


class SriService:
    """Servicio del mock del SRI: consultas y entrega de notas pendientes"""

    def __init__(
        self,
        nota_repo: NotaSriRepository,
        contribuyente_repo: ContribuyenteSriRepository,
    ):
        self.nota_repo = nota_repo
        self.contribuyente_repo = contribuyente_repo

    async def consultar_nota(self, numero_autorizacion: str) -> Optional[dict]:
        nota = await self.nota_repo.get_by_numero_autorizacion(numero_autorizacion)
        if nota is None:
            return None
        return {
            "estado": "AUTORIZADO",
            "data": _nota_a_dict(nota),
            "timestamp": _timestamp(),
        }

    async def validar_nota(self, numero_autorizacion: str) -> dict:
        nota = await self.nota_repo.get_by_numero_autorizacion(numero_autorizacion)
        if nota is None:
            return {
                "estado": "NO_VALIDO",
                "data": {
                    "numeroAutorizacion": numero_autorizacion,
                    "valido": False,
                    "motivo": "NOTA_NO_ENCONTRADA",
                },
                "timestamp": _timestamp(),
            }

        if nota.estado_sri == "BLOQUEADA":
            return {
                "estado": "VALIDO_CON_RESTRICCIONES",
                "data": {
                    "numeroAutorizacion": numero_autorizacion,
                    "valido": True,
                    "saldoDisponible": str(nota.saldo_disponible),
                    "estadoSri": nota.estado_sri,
                    "bloqueos": [
                        {
                            "motivo": "NOTA_BLOQUEADA_POR_SRI",
                            "descripcion": "Bloqueo administrativo",
                        }
                    ],
                },
                "timestamp": _timestamp(),
            }

        return {
            "estado": "VALIDO",
            "data": {
                "numeroAutorizacion": numero_autorizacion,
                "valido": True,
                "saldoDisponible": str(nota.saldo_disponible),
                "estadoSri": nota.estado_sri,
                "bloqueos": [],
            },
            "timestamp": _timestamp(),
        }

    async def consultar_contribuyente(self, ruc: str) -> Optional[dict]:
        contribuyente = await self.contribuyente_repo.get_by_ruc(ruc)
        if contribuyente is None:
            return None
        return {
            "estado": contribuyente.estado,
            "data": _contribuyente_a_dict(contribuyente),
            "timestamp": _timestamp(),
        }

    async def obtener_nota_pendiente(self) -> Optional[dict]:
        nota = await self.nota_repo.get_pendiente()
        if nota is None:
            return None
        await self.nota_repo.marcar_entregada(nota)
        return {
            "estado": "AUTORIZADO",
            "data": _nota_a_dict(nota),
            "timestamp": _timestamp(),
        }
