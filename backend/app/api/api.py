from fastapi import APIRouter

from app.api.routes import documentos, expedientes, riesgos, sri_mock

api_router = APIRouter()

api_router.include_router(expedientes.router)
api_router.include_router(documentos.router)
api_router.include_router(riesgos.router)
api_router.include_router(sri_mock.router)
