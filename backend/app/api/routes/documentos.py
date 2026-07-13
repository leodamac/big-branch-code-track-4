from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status, BackgroundTasks

from app.api.deps import get_application_service, get_document_service
from app.models.enums import TipoDocumento
from app.schemas.documento import DocumentoList, DocumentoRead
from app.services.application_service import ApplicationService
from app.services.document_service import DocumentService

router = APIRouter(prefix="/expedientes/{expediente_id}/documentos", tags=["documentos"])


@router.post("", response_model=DocumentoRead, status_code=status.HTTP_201_CREATED)
async def subir_documento(
    expediente_id: UUID,
    background_tasks: BackgroundTasks,
    document_service: DocumentService = Depends(get_document_service),
    application_service: ApplicationService = Depends(get_application_service),
    tipo: TipoDocumento = Form(...),
    file: UploadFile = File(...),
) -> DocumentoRead:
    documento = await document_service.subir_documento(expediente_id, tipo, file)
    if documento is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
        
    # Si es nota, lanza la extracción en segundo plano
    if tipo == TipoDocumento.NOTA:
        background_tasks.add_task(
            document_service.extraer_y_actualizar_nota,
            expediente_id,
            documento.storage_path,
            str(documento.id)
        )
    else:
        # Para otros documentos, marcar listos de inmediato
        from app.services.document_service import EXTRACTION_STATUS
        EXTRACTION_STATUS[str(documento.id)] = {"status": "READY", "progress": 100}
        
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


@router.get("/{doc_id}/estado")
async def consultar_estado_extraccion(
    expediente_id: UUID,
    doc_id: str,
):
    from app.services.document_service import EXTRACTION_STATUS
    uuid_str = doc_id
    if doc_id.startswith("doc-"):
        parts = doc_id.split("-")
        tipo_str = parts[-1]
        from app.core.database import Database
        async with Database.SessionLocal() as session:
            from app.repositories.documento_repository import DocumentoRepository
            doc_repo = DocumentoRepository(session)
            from app.models.enums import TipoDocumento
            try:
                tipo_enum = TipoDocumento(tipo_str)
                docs = await doc_repo.list_by_expediente(expediente_id, solo_activos=True)
                target = next((d for d in docs if d.tipo == tipo_enum), None)
                if target:
                    uuid_str = str(target.id)
            except Exception:
                pass

    status_data = EXTRACTION_STATUS.get(uuid_str)
    if status_data:
        return {
            "status": status_data["status"],
            "progress": status_data["progress"]
        }
        
    return {
        "status": "READY",
        "progress": 100
    }
