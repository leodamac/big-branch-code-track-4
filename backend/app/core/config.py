from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    DATABASE_URL: str

    # Host y puerto separados para poder configurarlos/desplegarlos de forma
    # independiente aunque compongan la conexión a un mismo servicio (Redis).
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    @computed_field
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    # Base de datos propia del SRI (mock), separada de la base de negocio.
    SRI_DATABASE_URL: str = "sqlite:///./sri_mock.db"

    # URL con la que nuestra propia API llama a la API del SRI vía HTTP
    # (loopback: mismo proceso, mismo puerto, rutas /api/sri/...).
    SRI_API_BASE_URL: str = "http://127.0.0.1:8000/api/sri"

    # Generador de notas nuevas DENTRO del dominio del SRI (simula que
    # siguen llegando notas de otros contribuyentes, fuera de nuestro
    # control).
    SRI_GENERADOR_ACTIVO: bool = True
    SRI_GENERADOR_INTERVALO_SEGUNDOS: int = 15

    # Worker en nuestra API que llama al SriApiClient periódicamente y crea
    # expedientes a partir de las notas pendientes que encuentra.
    EXTRACCION_SRI_ACTIVA: bool = True
    EXTRACCION_SRI_INTERVALO_SEGUNDOS: int = 10

    # Agentes de IA (app/agents/): Debida Diligencia y Tesorería, ambos
    # implementados como llamadas estructuradas a Gemini.
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-flash-latest"

    # Orígenes permitidos para CORS (el frontend Vite corre en otro puerto).
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    @computed_field
    @property
    def CORS_ORIGINS_LIST(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
