from uuid import UUID

from sqlmodel import SQLModel

from app.models.enums import EstadoExpediente


class ValidarRequest(SQLModel):
    usuario: str


class ResumenRiesgos(SQLModel):
    criticos: int
    altos: int
    medios: int
    bajos: int


class ValidacionResponse(SQLModel):
    expediente_id: UUID
    resultado: str
    estado: EstadoExpediente
    resumen_riesgos: ResumenRiesgos
    puede_avanzar: bool
