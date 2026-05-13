from pydantic import BaseModel, Field, field_validator


class TopItem(BaseModel):
    value: str
    count: int


class SemanticProfileResponse(BaseModel):
    user_id: str
    temas_frecuentes: list[TopItem]
    directores_afines: list[TopItem]
    narrativa_predominante: str | None
    nivel_filosofico_promedio: str | None
    total_sesiones_analizadas: int
    has_profile: bool


class PreferencesRequest(BaseModel):
    favorite_genres: list[str]
    reference_directors: list[str]


class PreferencesResponse(BaseModel):
    user_id: str
    favorite_genres: list[str]
    reference_directors: list[str]


class InstructionsRequest(BaseModel):
    instructions: str = Field(max_length=1000)


class InstructionsResponse(BaseModel):
    user_id: str
    instructions: str


class MemoryNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=200)

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: str) -> str:
        stripped: str = v.strip()
        if stripped == "":
            raise ValueError("El contenido no puede estar vacío")
        return stripped


class MemoryNoteResponse(BaseModel):
    id: str
    user_id: str
    content: str
    created_at: str


class MemoryListResponse(BaseModel):
    notes: list[MemoryNoteResponse]
