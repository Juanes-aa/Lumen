"""Repositorio para la tabla `analysis_sessions`.

Toda función que accede a datos de un usuario recibe `user_id` y aplica
`.eq("user_id", user_id)` dentro del repo. Filtrado en el router queda prohibido.
"""
from supabase import Client

from app.repositories.types import (
    AnalysisSessionListItemRow,
    AnalysisSessionRecentRow,
    AnalysisSessionRow,
    AnalysisSessionWithMovieRow,
    SessionStatusRow,
)
from app.utils.async_supabase import run_sync


async def get_session_by_id(
    client: Client, session_id: str, user_id: str
) -> AnalysisSessionWithMovieRow | None:
    """Devuelve la sesión si pertenece al usuario, sino None."""
    result = await run_sync(
        lambda: client.table("analysis_sessions")
        .select("*, movies_watched(title, tmdb_id, poster_url, overview)")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


async def get_session_with_status(
    client: Client, session_id: str, user_id: str
) -> SessionStatusRow | None:
    """Vista mínima de sesión (id, status) para validación de ownership."""
    result = await run_sync(
        lambda: client.table("analysis_sessions")
        .select("id, status")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


async def list_user_sessions(
    client: Client, user_id: str
) -> list[AnalysisSessionListItemRow]:
    """Lista sesiones del usuario con join a movies_watched, orden desc por started_at."""
    result = await run_sync(
        lambda: client.table("analysis_sessions")
        .select("*, movies_watched(title, poster_url)")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .execute()
    )
    return result.data


async def list_closed_session_ids(client: Client, user_id: str) -> list[str]:
    """IDs de sesiones cerradas del usuario."""
    result = await run_sync(
        lambda: client.table("analysis_sessions")
        .select("id")
        .eq("user_id", user_id)
        .eq("status", "closed")
        .execute()
    )
    return [str(row["id"]) for row in result.data]


async def list_recent_closed_sessions_with_movie(
    client: Client, user_id: str, exclude_id: str, limit: int
) -> list[AnalysisSessionRecentRow]:
    """Sesiones cerradas recientes (con título de la película), excluyendo la actual."""
    result = await run_sync(
        lambda: client.table("analysis_sessions")
        .select("id, movie_id, movies_watched(title)")
        .eq("user_id", user_id)
        .eq("status", "closed")
        .neq("id", exclude_id)
        .order("closed_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data


async def create_session(
    client: Client, user_id: str, movie_id: str
) -> AnalysisSessionRow:
    """Crea una sesión de análisis para el usuario."""
    result = await run_sync(
        lambda: client.table("analysis_sessions")
        .insert({"user_id": user_id, "movie_id": movie_id})
        .execute()
    )
    return result.data[0]


async def close_session(
    client: Client, session_id: str, user_id: str, closed_at: str
) -> None:
    """Marca una sesión como cerrada. Solo afecta si pertenece al usuario."""
    await run_sync(
        lambda: client.table("analysis_sessions")
        .update({"status": "closed", "closed_at": closed_at})
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )


async def delete_session_cascade(client: Client, session_id: str, user_id: str) -> None:
    """Borra una sesión del usuario; tags y mensajes caen por ON DELETE CASCADE.

    Las FKs `semantic_tags.session_id -> analysis_sessions(id) ON DELETE CASCADE`
    y `analysis_messages.session_id -> analysis_sessions(id) ON DELETE CASCADE`
    ya existen en el schema (verificado en migrations/000_current_schema_snapshot.sql).
    Por eso este DELETE basta: la propia base de datos elimina los hijos.

    Asume ownership ya validado por el caller (típicamente vía get_session_by_id).
    """
    await run_sync(
        lambda: client.table("analysis_sessions")
        .delete()
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
