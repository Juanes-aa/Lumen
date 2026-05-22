"""Repositorio para la tabla `analysis_sessions`.

Toda función que accede a datos de un usuario recibe `user_id` y aplica
`.eq("user_id", user_id)` dentro del repo. Filtrado en el router queda prohibido.
Las queries filtran por `deleted_at IS NULL` para excluir sesiones soft-deleted.
"""
from datetime import UTC, datetime

from supabase import AsyncClient

from app.repositories.types import (
    AnalysisSessionListItemRow,
    AnalysisSessionRecentRow,
    AnalysisSessionRow,
    AnalysisSessionWithMovieRow,
    SessionStatusRow,
)


async def get_session_by_id(
    client: AsyncClient, session_id: str, user_id: str
) -> AnalysisSessionWithMovieRow | None:
    """Devuelve la sesión si pertenece al usuario, sino None."""
    result = await (
        client.table("analysis_sessions")
        .select("*, movies_watched(title, tmdb_id, poster_url, overview)")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


async def get_session_with_status(
    client: AsyncClient, session_id: str, user_id: str
) -> SessionStatusRow | None:
    """Vista mínima de sesión (id, status) para validación de ownership."""
    result = await (
        client.table("analysis_sessions")
        .select("id, status")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


async def list_user_sessions(
    client: AsyncClient, user_id: str, *, limit: int = 100
) -> list[AnalysisSessionListItemRow]:
    """Lista sesiones del usuario con join a movies_watched, orden desc por started_at.

    El parámetro ``limit`` previene cargas sin límite a medida que el usuario
    acumula sesiones. Default 100 para no romper callers existentes.
    """
    result = await (
        client.table("analysis_sessions")
        .select("*, movies_watched(title, poster_url)")
        .eq("user_id", user_id)
        .is_("deleted_at", "null")
        .order("started_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


async def list_closed_session_ids(client: AsyncClient, user_id: str) -> list[str]:
    """IDs de sesiones cerradas del usuario (excluye soft-deleted)."""
    result = await (
        client.table("analysis_sessions")
        .select("id")
        .eq("user_id", user_id)
        .eq("status", "closed")
        .is_("deleted_at", "null")
        .execute()
    )
    return [str(row["id"]) for row in result.data]


async def list_recent_closed_sessions_with_movie(
    client: AsyncClient, user_id: str, exclude_id: str, limit: int
) -> list[AnalysisSessionRecentRow]:
    """Sesiones cerradas recientes (con título de la película), excluyendo la actual."""
    result = await (
        client.table("analysis_sessions")
        .select("id, movie_id, movies_watched(title)")
        .eq("user_id", user_id)
        .eq("status", "closed")
        .is_("deleted_at", "null")
        .neq("id", exclude_id)
        .order("closed_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


async def create_session(
    client: AsyncClient, user_id: str, movie_id: str
) -> AnalysisSessionRow:
    """Crea una sesión de análisis para el usuario."""
    result = await (
        client.table("analysis_sessions")
        .insert({"user_id": user_id, "movie_id": movie_id})
        .execute()
    )
    return result.data[0]


async def close_session(
    client: AsyncClient, session_id: str, user_id: str, closed_at: str
) -> None:
    """Marca una sesión como cerrada. Solo afecta si pertenece al usuario."""
    await (
        client.table("analysis_sessions")
        .update({"status": "closed", "closed_at": closed_at})
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )


async def delete_session_cascade(
    client: AsyncClient, session_id: str, user_id: str
) -> None:
    """Soft-delete: marca deleted_at = now(). Los datos se conservan en DB.

    Las queries filtran por `deleted_at IS NULL`, así que la sesión desaparece
    de todas las listas sin perder la integridad referencial de tags y mensajes.
    """
    deleted_at = datetime.now(UTC).isoformat()
    await (
        client.table("analysis_sessions")
        .update({"deleted_at": deleted_at})
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
