"""
Analista Financiero IA para Tesorería Digital (sección 12.2 del README de
arquitectura). Evalúa viabilidad financiera del monto a negociar y sugiere
una próxima acción para el operador. Nunca calcula un precio final de venta
(R2) — solo sugiere rangos de descuento de referencia.
"""

import json
import logging
import re
from decimal import Decimal
from typing import Any

from google.genai import types

from app.agents.gemini_client import get_gemini_client
from app.core.config import settings

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """Eres el "Analista Financiero IA para Tesorería Digital" de una Casa de Valores en Ecuador.
Tu objetivo es evaluar la viabilidad financiera de una Nota de Crédito Tributaria.

REGLAS DE NEGOCIO A EVALUAR:
- R1 (Saldo y Venta Parcial): El monto a negociar debe ser mayor a cero y menor o igual al saldo disponible.
- R2 (Determinación de Precio): No puedes calcular ni proponer un precio final de venta. Debes sugerir
  referencias históricas de descuentos aplicables (ej: entre 5% y 8% para notas ordinarias; descuento
  mayor para NCD-ISD debido a menor liquidez).

Debes sugerir la "Próxima Acción" recomendada para el operador.

Debes devolver un objeto JSON con la siguiente estructura exacta, sin texto adicional, sin markdown:
{
    "viabilidad_financiera": {
        "aprobado": true | false,
        "motivo_rechazo": "Explicación si el monto a negociar excede el saldo disponible de la nota"
    },
    "sugerencia_tesoreria": {
        "rango_descuento_sugerido": "Descripción del rango de descuento de mercado aplicable",
        "monto_nominal_negociable": <número>,
        "observaciones_liquidez": "Análisis de liquidez basado en el tipo de nota (NCD o NCD-ISD)"
    },
    "proxima_accion": {
        "codigo_accion": "PREPARAR_ORDEN" | "SOLICITAR_CORRECCION_MONTO" | "ENVIAR_CUMPLIMIENTO",
        "descripcion_sugerida": "Descripción corta de la acción sugerida para mostrar en la interfaz"
    }
}"""


def _construir_mensaje_usuario(datos_nota: dict[str, Any], monto_a_negociar: Decimal) -> str:
    return f"""INFORMACIÓN DE ENTRADA:
- Datos de la Nota de Crédito: {json.dumps(datos_nota, default=str)}
- Monto que el Cliente desea Negociar: {monto_a_negociar}"""


def _limpiar_json(texto: str) -> str:
    return re.sub(r"^```json\s*|^```\s*|\s*```$", "", texto.strip(), flags=re.MULTILINE).strip()


def _sugerencia_fallback(monto_a_negociar: Decimal, motivo: str) -> dict[str, Any]:
    # Fail-safe: si el agente no responde, no aprobamos ni rechazamos nada
    # por él — enviamos el caso a revisión humana explícita.
    return {
        "viabilidad_financiera": {
            "aprobado": None,
            "motivo_rechazo": "No se pudo evaluar automáticamente (falló el Agente de Tesorería)",
        },
        "sugerencia_tesoreria": {
            "rango_descuento_sugerido": None,
            "monto_nominal_negociable": float(monto_a_negociar),
            "observaciones_liquidez": None,
        },
        "proxima_accion": {
            "codigo_accion": "ENVIAR_CUMPLIMIENTO",
            "descripcion_sugerida": "El analista de tesorería no pudo evaluar el caso "
            "automáticamente; revisar manualmente.",
        },
        "_error": motivo,
    }


class TreasuryAgent:
    """Analista Financiero IA para Tesorería Digital (Gemini)"""

    async def sugerir_negociacion(
        self, datos_nota: dict[str, Any], monto_a_negociar: Decimal
    ) -> dict[str, Any]:
        mensaje = _construir_mensaje_usuario(datos_nota, monto_a_negociar)

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

            return json.loads(_limpiar_json(response.text))
        except Exception as e:
            logger.exception("[TREASURY-AGENT] Error al evaluar negociación con Gemini")
            return _sugerencia_fallback(monto_a_negociar, str(e))
