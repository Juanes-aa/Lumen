import logging

from fastapi import APIRouter, Depends, HTTPException, status
from postgrest.exceptions import APIError as PostgrestAPIError
from supabase import Client

from app.dependencies.auth import get_current_user_id
from app.dependencies.supabase import get_supabase_user
from app.repositories import movies as movies_repo
from app.schemas.movies import WatchedMovieCreate, WatchedMovieResponse

logger: logging.Logger = logging.getLogger(__name__)

# Postgres unique_violation
_PG_UNIQUE_VIOLATION: str = "23505"

router = APIRouter(prefix="/movies", tags=["movies"])


def _is_unique_violation(exc: BaseException) -> bool:
    if isinstance(exc, PostgrestAPIError):
        return getattr(exc, "code", None) == _PG_UNIQUE_VIOLATION
    # TODO: eliminar fallback cuando estemos seguros de que postgrest
    # siempre lanza APIError con `.code`. Loguear cuando se active para
    # poder auditarlo.
    msg: str = str(exc).lower()
    fallback_match: bool = (
        _PG_UNIQUE_VIOLATION in msg or "duplicate" in msg or "unique" in msg
    )
    if fallback_match:
        logger.warning(
            "movies_unique_violation_fallback exc_type=%s message=%r",
            type(exc).__name__,
            str(exc),
        )
    return fallback_match


@router.post("/watched", response_model=WatchedMovieResponse, status_code=201)
async def add_watched_movie(
    data: WatchedMovieCreate,
    user_id: str = Depends(get_current_user_id),
    client: Client = Depends(get_supabase_user),
) -> WatchedMovieResponse:
    payload: dict[str, object] = {
        "tmdb_id": data.tmdb_id,
        "title": data.title,
        "poster_url": data.poster_url,
        "release_year": data.release_year,
        "genre_ids": data.genre_ids,
        "overview": data.overview,
        "initial_note": data.initial_note,
    }
    try:
        inserted = await movies_repo.add_watched(client, user_id, payload)
    except Exception as exc:
        if _is_unique_violation(exc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Movie already in watched list",
            ) from exc
        logger.exception(
            "movies_insert_failed user_id=%s tmdb_id=%s", user_id, data.tmdb_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al insertar película",
        ) from exc
    return WatchedMovieResponse.model_validate(inserted)


@router.get("/watched", response_model=list[WatchedMovieResponse])
async def get_watched_movies(
    user_id: str = Depends(get_current_user_id),
    client: Client = Depends(get_supabase_user),
) -> list[WatchedMovieResponse]:
    rows = await movies_repo.list_watched(client, user_id)
    return [WatchedMovieResponse.model_validate(row) for row in rows]


@router.delete("/watched/{movie_id}", status_code=204)
async def delete_watched_movie(
    movie_id: str,
    user_id: str = Depends(get_current_user_id),
    client: Client = Depends(get_supabase_user),
) -> None:
    deleted: bool = await movies_repo.delete_watched(client, user_id, movie_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Película no encontrada",
        )
