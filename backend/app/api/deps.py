from typing import AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Database
from app.core.sri_database import SriDatabase
from app.repositories.cliente_repository import ClienteRepository
from app.repositories.contribuyente_sri_repository import ContribuyenteSriRepository
from app.repositories.documento_repository import DocumentoRepository
from app.repositories.expediente_repository import ExpedienteRepository
from app.repositories.historial_estado_repository import HistorialEstadoRepository
from app.repositories.nota_credito_repository import NotaCreditoRepository
from app.repositories.nota_sri_repository import NotaSriRepository
from app.repositories.riesgo_repository import RiesgoRepository
from app.services.application_service import ApplicationService
from app.services.document_service import DocumentService
from app.services.sri_service import SriService
from app.services.state_service import StateService
from app.services.validation_service import ValidationService


# ==================== SESSION ====================

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Obtiene una sesión de la base de negocio (retotaws.db)"""
    async with Database.SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except:
            await session.rollback()
            raise

async def get_sri_session() -> AsyncGenerator[AsyncSession, None]:
    """Obtiene una sesión de la base propia del SRI (sri_mock.db)"""
    async with SriDatabase.SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except:
            await session.rollback()
            raise


# ==================== REPOSITORIES ====================

def get_cliente_repository(
    session: AsyncSession = Depends(get_session)
) -> ClienteRepository:
    return ClienteRepository(session)

def get_nota_credito_repository(
    session: AsyncSession = Depends(get_session)
) -> NotaCreditoRepository:
    return NotaCreditoRepository(session)

def get_expediente_repository(
    session: AsyncSession = Depends(get_session)
) -> ExpedienteRepository:
    return ExpedienteRepository(session)

def get_documento_repository(
    session: AsyncSession = Depends(get_session)
) -> DocumentoRepository:
    return DocumentoRepository(session)

def get_riesgo_repository(
    session: AsyncSession = Depends(get_session)
) -> RiesgoRepository:
    return RiesgoRepository(session)

def get_historial_estado_repository(
    session: AsyncSession = Depends(get_session)
) -> HistorialEstadoRepository:
    return HistorialEstadoRepository(session)

def get_nota_sri_repository(
    session: AsyncSession = Depends(get_sri_session)
) -> NotaSriRepository:
    return NotaSriRepository(session)

def get_contribuyente_sri_repository(
    session: AsyncSession = Depends(get_sri_session)
) -> ContribuyenteSriRepository:
    return ContribuyenteSriRepository(session)


# ==================== SERVICES ====================

def get_application_service(
    cliente_repo: ClienteRepository = Depends(get_cliente_repository),
    nota_repo: NotaCreditoRepository = Depends(get_nota_credito_repository),
    expediente_repo: ExpedienteRepository = Depends(get_expediente_repository),
    historial_repo: HistorialEstadoRepository = Depends(get_historial_estado_repository),
) -> ApplicationService:
    return ApplicationService(cliente_repo, nota_repo, expediente_repo, historial_repo)

def get_document_service(
    documento_repo: DocumentoRepository = Depends(get_documento_repository),
    expediente_repo: ExpedienteRepository = Depends(get_expediente_repository),
) -> DocumentService:
    return DocumentService(documento_repo, expediente_repo)

def get_state_service(
    expediente_repo: ExpedienteRepository = Depends(get_expediente_repository),
    historial_repo: HistorialEstadoRepository = Depends(get_historial_estado_repository),
) -> StateService:
    return StateService(expediente_repo, historial_repo)

def get_validation_service(
    expediente_repo: ExpedienteRepository = Depends(get_expediente_repository),
    riesgo_repo: RiesgoRepository = Depends(get_riesgo_repository),
    state_service: StateService = Depends(get_state_service),
) -> ValidationService:
    return ValidationService(expediente_repo, riesgo_repo, state_service)

def get_sri_service(
    nota_repo: NotaSriRepository = Depends(get_nota_sri_repository),
    contribuyente_repo: ContribuyenteSriRepository = Depends(get_contribuyente_sri_repository),
) -> SriService:
    return SriService(nota_repo, contribuyente_repo)
