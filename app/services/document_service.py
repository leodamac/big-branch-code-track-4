import hashlib
from pathlib import Path
from typing import Optional
from uuid import UUID, uuid4

from fastapi import UploadFile

from app.models.enums import TipoDocumento
from app.models.models import Documento
from app.repositories.documento_repository import DocumentoRepository
from app.repositories.expediente_repository import ExpedienteRepository

UPLOAD_DIR = Path("uploads")


class DocumentService:
    """Servicio para subir y listar documentos de un expediente"""

    def __init__(
        self,
        documento_repo: DocumentoRepository,
        expediente_repo: ExpedienteRepository,
    ):
        self.documento_repo = documento_repo
        self.expediente_repo = expediente_repo

    async def subir_documento(
        self, expediente_id: UUID, tipo: TipoDocumento, file: UploadFile
    ) -> Optional[Documento]:
        expediente = await self.expediente_repo.get(expediente_id)
        if expediente is None:
            return None

        contenido = await file.read()
        hash_sha256 = hashlib.sha256(contenido).hexdigest()

        version_actual = await self.documento_repo.get_max_version(expediente_id, tipo)
        nueva_version = version_actual + 1

        await self.documento_repo.desactivar_activos(expediente_id, tipo)

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        nombre_archivo = (
            f"{expediente_id}_{tipo.value}_{nueva_version}_{uuid4().hex}_{file.filename}"
        )
        ruta = UPLOAD_DIR / nombre_archivo
        ruta.write_bytes(contenido)

        documento = Documento(
            expediente_id=expediente_id,
            tipo=tipo,
            version=nueva_version,
            storage_path=str(ruta),
            hash_sha256=hash_sha256,
            es_activo=True,
        )
        return await self.documento_repo.create(documento)

    async def listar_documentos(
        self, expediente_id: UUID, solo_activos: bool = False
    ) -> list[Documento]:
        return await self.documento_repo.list_by_expediente(expediente_id, solo_activos)
