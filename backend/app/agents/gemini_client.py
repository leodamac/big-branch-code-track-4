from google import genai

from app.core.config import settings


def get_gemini_client() -> genai.Client:
    if not settings.GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY no está configurada. Agrégala a tu .env para usar los agentes de IA."
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY, http_options={"timeout": 60000})
