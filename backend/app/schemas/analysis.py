from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CreateSessionRequest(BaseModel):
    watched_movie_id: UUID


class SessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    watched_movie_id: UUID
    movie_title: str
    tmdb_id: int
    poster_url: str | None
    status: str
    started_at: datetime
    closed_at: datetime | None

    model_config = ConfigDict(populate_by_name=True)


class SessionSummary(BaseModel):
    id: str
    movie_id: str
    movie_title: str
    movie_poster_url: str | None
    status: str
    started_at: datetime
    closed_at: datetime | None
    has_tags: bool


class SessionSummaryListResponse(BaseModel):
    sessions: list[SessionSummary]
    total: int


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v: str) -> str:
        stripped: str = v.strip()
        if stripped == "":
            raise ValueError("El mensaje no puede estar vacío")
        return stripped


class MessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    created_at: datetime


class ConversationResponse(BaseModel):
    session_id: UUID
    messages: list[MessageResponse]


class CloseSessionResponse(BaseModel):
    id: str
    status: str
    closed_at: str


class SuggestionsResponse(BaseModel):
    suggestions: list[str]
