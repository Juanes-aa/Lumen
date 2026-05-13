"""Repositorio para la tabla `analysis_messages`."""
from supabase import Client

from app.repositories.types import AnalysisMessageHistoryRow, AnalysisMessageRow
from app.utils.async_supabase import run_sync


async def list_session_messages(
    client: Client, session_id: str
) -> list[AnalysisMessageRow]:
    """Lista todos los mensajes de una sesión, orden ascendente por created_at.

    No filtra por user_id porque la ownership de la sesión debe validarse antes
    en el router (vía sessions.get_session_by_id).
    """
    result = await run_sync(
        lambda: client.table("analysis_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data


async def list_session_history(
    client: Client, session_id: str
) -> list[AnalysisMessageHistoryRow]:
    """Devuelve solo (role, content) ordenados — pensado para alimentar al LLM."""
    result = await run_sync(
        lambda: client.table("analysis_messages")
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data


async def has_user_messages(client: Client, session_id: str) -> bool:
    """True si la sesión tiene al menos un mensaje del usuario."""
    result = await run_sync(
        lambda: client.table("analysis_messages")
        .select("id")
        .eq("session_id", session_id)
        .eq("role", "user")
        .execute()
    )
    return bool(result.data)


async def insert_message(
    client: Client, session_id: str, role: str, content: str
) -> AnalysisMessageRow:
    """Inserta un mensaje en la sesión y devuelve la fila creada."""
    result = await run_sync(
        lambda: client.table("analysis_messages")
        .insert({"session_id": session_id, "role": role, "content": content})
        .execute()
    )
    return result.data[0]
