from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_application_service, get_validation_service
from app.schemas.riesgo import RiesgoList, RiesgoRead, RiesgoResolverRequest
from app.services.application_service import ApplicationService
from app.services.validation_service import ValidationService

router = APIRouter(prefix="/expedientes/{expediente_id}/riesgos", tags=["riesgos"])


@router.get("", response_model=RiesgoList)
async def listar_riesgos(
    expediente_id: UUID,
    service: ValidationService = Depends(get_validation_service),
) -> RiesgoList:
    items = await service.listar_riesgos(expediente_id)
    return RiesgoList(items=items)


@router.post("/{riesgo_id}/resolver", response_model=RiesgoRead)
async def resolver_riesgo(
    expediente_id: UUID,
    riesgo_id: UUID,
    body: RiesgoResolverRequest,
    validation_service: ValidationService = Depends(get_validation_service),
    application_service: ApplicationService = Depends(get_application_service),
) -> RiesgoRead:
    riesgo = await validation_service.resolver_riesgo(expediente_id, riesgo_id)
    if riesgo is None:
        raise HTTPException(status_code=404, detail="Riesgo no encontrado")
    await application_service.invalidar_cache_expediente(expediente_id)
    return RiesgoRead.model_validate(riesgo, from_attributes=True)
