from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from app.api.deps import get_application_service, get_document_service
from app.models.enums import TipoDocumento
from app.schemas.documento import DocumentoList, DocumentoRead
from app.services.application_service import ApplicationService
from app.services.document_service import DocumentService

router = APIRouter(prefix="/expedientes/{expediente_id}/documentos", tags=["documentos"])


@router.post("", response_model=DocumentoRead, status_code=status.HTTP_201_CREATED)
async def subir_documento(
    expediente_id: UUID,
    document_service: DocumentService = Depends(get_document_service),
    application_service: ApplicationService = Depends(get_application_service),
    tipo: TipoDocumento = Form(...),
    file: UploadFile = File(...),
) -> DocumentoRead:
    documento = await document_service.subir_documento(expediente_id, tipo, file)
    if documento is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    await application_service.invalidar_cache_expediente(expediente_id)
    return DocumentoRead.model_validate(documento, from_attributes=True)


@router.get("", response_model=DocumentoList)
async def listar_documentos(
    expediente_id: UUID,
    service: DocumentService = Depends(get_document_service),
    solo_activos: bool = Query(default=False),
) -> DocumentoList:
    items = await service.listar_documentos(expediente_id, solo_activos)
    return DocumentoList(items=items)
