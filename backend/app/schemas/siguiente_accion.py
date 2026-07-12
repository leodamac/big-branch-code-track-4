from sqlmodel import SQLModel


class AceptarAccionRequest(SQLModel):
    accion: str
    usuario: str
    comentarios: str | None = None
