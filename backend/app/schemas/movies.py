from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WatchedMovieCreate(BaseModel):
    tmdb_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=300)
    poster_url: str | None = Field(default=None, max_length=500)
    release_year: int | None = Field(default=None, ge=1888, le=2100)
    genre_ids: list[int] = Field(default_factory=list)
    overview: str | None = Field(default=None, max_length=2000)
    initial_note: str | None = Field(default=None, max_length=500)


class WatchedMovieResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tmdb_id: int
    title: str
    poster_url: str | None
    release_year: int | None
    genre_ids: list[int]
    initial_note: str | None
    created_at: datetime
