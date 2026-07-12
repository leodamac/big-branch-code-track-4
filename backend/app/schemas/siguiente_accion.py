from sqlmodel import Field, SQLModel


class AceptarAccionRequest(SQLModel):
    accion: str = Field(min_length=1, max_length=50)
    usuario: str = Field(min_length=1, max_length=255)
    comentarios: str | None = Field(default=None, max_length=2000)
