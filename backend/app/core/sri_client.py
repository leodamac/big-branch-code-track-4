from typing import Any, Optional

import httpx

from app.core.config import settings


class SriApiClient:
    """Cliente HTTP hacia la API del SRI (llamada real, no acceso directo
    a sus datos)."""

    def __init__(self, base_url: str | None = None, timeout: float = 5.0):
        self.base_url = base_url or settings.SRI_API_BASE_URL
        self.timeout = timeout

    async def obtener_nota_pendiente(self) -> Optional[dict[str, Any]]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.get("/notas/pendiente")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()["data"]

    async def consultar_contribuyente(self, ruc: str) -> Optional[dict[str, Any]]:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=self.timeout) as client:
            response = await client.get(f"/ruc/{ruc}")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()["data"]
