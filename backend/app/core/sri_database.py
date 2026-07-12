from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import select

from app.core.config import settings
from app.models.sri_models import ContribuyenteSri, NotaSri

_CLAVE_ACCESO = "1107202601179123456700123456789012345678901234567"
_RUC_EMISOR = "1790012345001"
_RAZON_SOCIAL_EMISOR = "SERVICIO DE RENTAS INTERNAS"
_FECHA_EMISION = "2026-01-15"


class SriDatabase:
    engine = None
    SessionLocal = None

    @classmethod
    async def connect(cls):
        url = settings.SRI_DATABASE_URL.replace(
            "sqlite://",
            "sqlite+aiosqlite://",
            1
        )

        cls.engine = create_async_engine(
            url,
            echo=False,
            future=True,
            pool_size=5,
            max_overflow=10
        )

        cls.SessionLocal = async_sessionmaker(
            bind=cls.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

        # El esquema (tablas notas_sri / contribuyentes_sri) ya NO se crea
        # aquí con create_all(): lo maneja Alembic (rama "sri", ver
        # alembic/env.py). Antes de levantar el servidor hay que correr:
        #   alembic -x db=sri upgrade sri@head
        await cls._seed_inicial()

    @classmethod
    async def _seed_inicial(cls) -> None:
        async with cls.SessionLocal() as session:
            ya_sembrado = (await session.execute(select(ContribuyenteSri))).first()
            if ya_sembrado is not None:
                return

            contribuyentes = [
                ContribuyenteSri(ruc="1790012345001", razon_social="EMPRESA DE PRUEBA S.A.", estado="ACTIVO"),
                ContribuyenteSri(ruc="1790056789001", razon_social="EMPRESA COMPRADORA C.A.", estado="ACTIVO"),
                ContribuyenteSri(ruc="1712345678001", razon_social="JUAN PEREZ GOMEZ", estado="ACTIVO"),
                ContribuyenteSri(ruc="1790098765001", razon_social="EMPRESA EN LIQUIDACION S.A.", estado="SUSPENDIDO"),
            ]

            notas = [
                NotaSri(
                    numero_autorizacion="1234567890123456789012345678901234567",
                    clave_acceso=_CLAVE_ACCESO,
                    ruc_emisor=_RUC_EMISOR,
                    razon_social_emisor=_RAZON_SOCIAL_EMISOR,
                    ruc_beneficiario="1790012345001",
                    razon_social_beneficiario="EMPRESA DE PRUEBA S.A.",
                    tipo="NCD",
                    valor_nominal="15000.00",
                    saldo_disponible="12000.00",
                    fecha_emision=_FECHA_EMISION,
                    estado_sri="EMITIDA",
                    historial_endosos=[
                        {
                            "endosante": "1790012345001",
                            "razonSocialEndosante": "EMPRESA DE PRUEBA S.A.",
                            "endosatario": "1790056789001",
                            "razonSocialEndosatario": "EMPRESA COMPRADORA C.A.",
                            "fecha": "2026-03-10",
                        }
                    ],
                ),
                NotaSri(
                    numero_autorizacion="9876543210987654321098765432109876543",
                    clave_acceso=_CLAVE_ACCESO,
                    ruc_emisor=_RUC_EMISOR,
                    razon_social_emisor=_RAZON_SOCIAL_EMISOR,
                    ruc_beneficiario="1790012345001",
                    razon_social_beneficiario="EMPRESA DE PRUEBA S.A.",
                    tipo="NCD",
                    valor_nominal="8000.00",
                    saldo_disponible="0.00",
                    fecha_emision=_FECHA_EMISION,
                    estado_sri="UTILIZADA",
                    historial_endosos=[],
                ),
                NotaSri(
                    numero_autorizacion="1111111111111111111111111111111111111",
                    clave_acceso=_CLAVE_ACCESO,
                    ruc_emisor=_RUC_EMISOR,
                    razon_social_emisor=_RAZON_SOCIAL_EMISOR,
                    ruc_beneficiario="1790056789001",
                    razon_social_beneficiario="EMPRESA COMPRADORA C.A.",
                    tipo="NCD",
                    valor_nominal="25000.00",
                    saldo_disponible="25000.00",
                    fecha_emision=_FECHA_EMISION,
                    estado_sri="EMITIDA",
                    historial_endosos=[],
                ),
                NotaSri(
                    numero_autorizacion="2222222222222222222222222222222222222",
                    clave_acceso=_CLAVE_ACCESO,
                    ruc_emisor=_RUC_EMISOR,
                    razon_social_emisor=_RAZON_SOCIAL_EMISOR,
                    ruc_beneficiario="1712345678001",
                    razon_social_beneficiario="JUAN PEREZ GOMEZ",
                    tipo="NCD",
                    valor_nominal="5000.00",
                    saldo_disponible="5000.00",
                    fecha_emision=_FECHA_EMISION,
                    estado_sri="BLOQUEADA",
                    historial_endosos=[],
                ),
                NotaSri(
                    numero_autorizacion="3333333333333333333333333333333333333",
                    clave_acceso=_CLAVE_ACCESO,
                    ruc_emisor=_RUC_EMISOR,
                    razon_social_emisor=_RAZON_SOCIAL_EMISOR,
                    ruc_beneficiario="1790012345001",
                    razon_social_beneficiario="EMPRESA DE PRUEBA S.A.",
                    tipo="NCD",
                    valor_nominal="10000.00",
                    saldo_disponible="10000.00",
                    fecha_emision=_FECHA_EMISION,
                    estado_sri="ANULADA",
                    historial_endosos=[
                        {
                            "endosante": "1790012345001",
                            "razonSocialEndosante": "EMPRESA DE PRUEBA S.A.",
                            "endosatario": "1790056789001",
                            "razonSocialEndosatario": "EMPRESA COMPRADORA C.A.",
                            "fecha": "2026-02-15",
                        },
                        {
                            "endosante": "1790056789001",
                            "razonSocialEndosante": "EMPRESA COMPRADORA C.A.",
                            "endosatario": "1790098765001",
                            "razonSocialEndosatario": "EMPRESA EN LIQUIDACION S.A.",
                            "fecha": "2026-03-20",
                        },
                    ],
                ),
            ]

            session.add_all(contribuyentes)
            session.add_all(notas)
            await session.commit()

    @classmethod
    async def disconnect(cls):
        if cls.engine:
            await cls.engine.dispose()
