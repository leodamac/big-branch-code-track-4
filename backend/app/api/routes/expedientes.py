from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_application_service, get_state_service, get_validation_service
from app.schemas.antecedentes import AntecedentesResponse
from app.schemas.estado import CambiarEstadoRequest, CambiarEstadoResponse
from app.schemas.expediente import (
    ExpedienteCreate,
    ExpedienteDetail,
    ExpedienteList,
    ExpedienteRead,
)
from app.schemas.historial_estado import HistorialEstadoList
from app.schemas.siguiente_accion import AceptarAccionRequest
from app.schemas.validacion import ValidacionResponse, ValidarRequest
from app.services.application_service import ApplicationService, SaldoInsuficienteError
from app.services.state_service import StateService, TransicionInvalidaError
from app.services.validation_service import ValidationService

router = APIRouter(prefix="/expedientes", tags=["expedientes"])


@router.post("", response_model=ExpedienteRead, status_code=status.HTTP_201_CREATED)
async def crear_expediente(
    data: ExpedienteCreate,
    service: ApplicationService = Depends(get_application_service),
) -> ExpedienteRead:
    try:
        expediente = await service.crear_expediente(data)
    except SaldoInsuficienteError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    return ExpedienteRead.model_validate(expediente, from_attributes=True)


@router.get("", response_model=ExpedienteList)
async def listar_expedientes(
    service: ApplicationService = Depends(get_application_service),
    limit: int = Query(default=50, le=200, gt=0),
    offset: int = Query(default=0, ge=0),
) -> ExpedienteList:
    items = await service.listar_expedientes(limit, offset)
    return ExpedienteList(items=items)


@router.get("/antecedentes", response_model=AntecedentesResponse)
async def buscar_antecedentes(
    ruc: str = Query(...),
    service: ApplicationService = Depends(get_application_service),
) -> AntecedentesResponse:
    resultado = await service.buscar_antecedentes(ruc)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return resultado


@router.get("/{expediente_id}", response_model=ExpedienteDetail)
async def obtener_expediente(
    expediente_id: UUID,
    service: ApplicationService = Depends(get_application_service),
) -> ExpedienteDetail:
    expediente = await service.obtener_expediente_completo(expediente_id)
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    return expediente


@router.post("/{expediente_id}/validar", response_model=ValidacionResponse)
async def validar_expediente(
    expediente_id: UUID,
    body: ValidarRequest,
    validation_service: ValidationService = Depends(get_validation_service),
    application_service: ApplicationService = Depends(get_application_service),
) -> ValidacionResponse:
    resultado = await validation_service.validar_expediente(expediente_id, body.usuario)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    await application_service.invalidar_cache_expediente(expediente_id)
    return resultado


@router.post("/{expediente_id}/estado", response_model=CambiarEstadoResponse)
async def cambiar_estado(
    expediente_id: UUID,
    body: CambiarEstadoRequest,
    state_service: StateService = Depends(get_state_service),
    application_service: ApplicationService = Depends(get_application_service),
) -> CambiarEstadoResponse:
    try:
        resultado = await state_service.procesar_evento(
            expediente_id, body.evento, body.usuario, body.comentarios
        )
    except TransicionInvalidaError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    if resultado is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    await application_service.invalidar_cache_expediente(expediente_id)
    return resultado


@router.get("/{expediente_id}/historial", response_model=HistorialEstadoList)
async def obtener_historial(
    expediente_id: UUID,
    service: StateService = Depends(get_state_service),
) -> HistorialEstadoList:
    items = await service.obtener_historial(expediente_id)
    return HistorialEstadoList(items=items)


@router.get("/{expediente_id}/siguiente-accion")
async def obtener_siguiente_accion(
    expediente_id: UUID,
    service: ApplicationService = Depends(get_application_service),
) -> dict:
    resultado = await service.obtener_siguiente_accion(expediente_id)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    return resultado


@router.post("/{expediente_id}/siguiente-accion/aceptar")
async def aceptar_siguiente_accion(
    expediente_id: UUID,
    body: AceptarAccionRequest,
    service: ApplicationService = Depends(get_application_service),
) -> dict:
    resultado = await service.aceptar_siguiente_accion(
        expediente_id, body.accion, body.usuario, body.comentarios
    )
    if resultado is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    await service.invalidar_cache_expediente(expediente_id)
    return resultado
