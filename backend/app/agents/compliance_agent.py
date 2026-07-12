"""
Agente IA para Debida Diligencia y Cumplimiento (sección 12.1 del README de
arquitectura). Reemplaza las reglas fijas que antes vivían en
validation_service.py: analiza cliente, nota y documentos, y devuelve una
lista de riesgos estructurados vía Gemini.
"""

import json
import logging
import re
from typing import Any

from google.genai import types

from app.agents.gemini_client import get_gemini_client
from app.core.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """Eres el "Agente IA para Debida Diligencia y Cumplimiento" de una Casa de Valores en Ecuador.
Tu objetivo es analizar un caso de negociación de Notas de Crédito Desmaterializadas (NCD) del SRI
y devolver una lista estructurada de riesgos detectados de forma determinística.

REGLAS DE NEGOCIO A EVALUAR:
- R9 (Criticidad): Identifica riesgos Críticos (bloquean), Altos (acción inmediata), Medios (revisar) y Bajos (informativos).
- R12 (Vigencia de Documentos): Papeleta de votación vigente 1 año, certificado bancario 3 meses, planilla de servicios 3 meses (usa la fecha de carga del documento como referencia si no hay fecha de emisión).
- MSG-15 (Cadena de Endosos): Si el RUC del cliente no coincide con el último endosatario registrado en el historial de endosos de la nota, levanta riesgo CRÍTICO.
- Documentación obligatoria: CEDULA, KYC y NOTA deben estar presentes y activos.
- Estado del RUC: si estado_ruc no es "ACTIVO", levanta riesgo CRÍTICO.

FUERA DE TU ALCANCE: no evalúes ni menciones montos, saldos disponibles ni
viabilidad financiera de la negociación — eso lo evalúa exclusivamente el
Analista Financiero de Tesorería (otro agente). Si esos datos no vienen en
la entrada, es intencional: ignóralos por completo.

Debes devolver un objeto JSON con la siguiente estructura exacta, sin texto adicional, sin markdown:
{
    "riesgos": [
        {
            "nivel": "CRITICO" | "ALTO" | "MEDIO" | "BAJO",
            "descripcion": "Descripción detallada del riesgo en lenguaje natural",
            "regla_activadora": "ID_DE_LA_REGLA (ej: R12, MSG-15, R9)",
            "evidencia": "Justificación basada exactamente en los datos recibidos. No inventes datos."
        }
    ]
}

Si no detectas ningún riesgo, devuelve {"riesgos": []}."""


def _construir_mensaje_usuario(
    datos_cliente: dict[str, Any],
    datos_nota: dict[str, Any],
    documentos_presentes: list[dict[str, Any]],
) -> str:
    return f"""INFORMACIÓN DE ENTRADA:
- Datos del Cliente: {json.dumps(datos_cliente, default=str)}
- Datos de la Nota de Crédito: {json.dumps(datos_nota, default=str)}
- Documentos Cargados en el Expediente: {json.dumps(documentos_presentes, default=str)}"""


def _limpiar_json(texto: str) -> str:
    return re.sub(r"^```json\s*|^```\s*|\s*```$", "", texto.strip(), flags=re.MULTILINE).strip()


def _riesgo_fallback(motivo: str) -> list[dict[str, Any]]:
    # Fail-safe: si el agente de IA no responde, NO asumimos "sin riesgos"
    # (sería peligroso en un dominio de cumplimiento financiero). En vez de
    # eso, levantamos un riesgo ALTO pidiendo revisión manual.
    return [
        {
            "nivel": "ALTO",
            "descripcion": "No se pudo completar el análisis automático de riesgos "
            "(falló el Agente de Debida Diligencia). Se requiere revisión manual.",
            "regla_activadora": "SISTEMA",
            "evidencia": motivo,
        }
    ]


class ComplianceAgent:
    """Agente de Debida Diligencia y Cumplimiento (Gemini)"""

    async def analizar_riesgos(
        self,
        datos_cliente: dict[str, Any],
        datos_nota: dict[str, Any],
        documentos_presentes: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        mensaje = _construir_mensaje_usuario(datos_cliente, datos_nota, documentos_presentes)

        try:
            client = get_gemini_client()
            response = await client.aio.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=mensaje,
                config=types.GenerateContentConfig(
                    system_instruction=_SYSTEM_PROMPT,
                    temperature=0.0,
                    response_mime_type="application/json",
                ),
            )
            if not response.text:
                raise RuntimeError("Gemini devolvió una respuesta vacía")

            resultado = json.loads(_limpiar_json(response.text))
            return resultado.get("riesgos", [])
        except Exception as e:
            logger.exception("[COMPLIANCE-AGENT] Error al analizar riesgos con Gemini")
            return _riesgo_fallback(str(e))
