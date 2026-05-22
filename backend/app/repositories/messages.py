"""Repositorio para la tabla `analysis_messages`."""
from supabase import AsyncClient

from app.repositories.types import AnalysisMessageHistoryRow, AnalysisMessageRow


async def list_session_messages(
    client: AsyncClient, session_id: str
) -> list[AnalysisMessageRow]:
    """Lista todos los mensajes de una sesión, orden ascendente por created_at."""
    result = await (
        client.table("analysis_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data


async def list_session_history(
    client: AsyncClient, session_id: str
) -> list[AnalysisMessageHistoryRow]:
    """Devuelve solo (role, content) ordenados — para alimentar al LLM."""
    result = await (
        client.table("analysis_messages")
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data


async def has_user_messages(client: AsyncClient, session_id: str) -> bool:
    """True si la sesión tiene al menos un mensaje del usuario."""
    result = await (
        client.table("analysis_messages")
        .select("id")
        .eq("session_id", session_id)
        .eq("role", "user")
        .execute()
    )
    return bool(result.data)


async def insert_message(
    client: AsyncClient, session_id: str, role: str, content: str
) -> AnalysisMessageRow:
    """Inserta un mensaje en la sesión y devuelve la fila creada."""
    result = await (
        client.table("analysis_messages")
        .insert({"session_id": session_id, "role": role, "content": content})
        .execute()
    )
    return result.data[0]
