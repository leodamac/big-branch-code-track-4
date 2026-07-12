from uuid import UUID

from sqlmodel import SQLModel

from app.models.enums import TipoDocumento


class DocumentoRead(SQLModel):
    id: UUID
    expediente_id: UUID
    tipo: TipoDocumento
    version: int
    storage_path: str
    hash_sha256: str
    es_activo: bool


class DocumentoList(SQLModel):
    items: list[DocumentoRead]
