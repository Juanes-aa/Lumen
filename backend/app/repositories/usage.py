"""Repositorio para la tabla `user_message_usage`.

Lleva el contador diario de mensajes LLM por usuario para aplicar el límite
configurado según el tier del usuario.
"""
from supabase import AsyncClient


async def get_daily_count(client: AsyncClient, user_id: str) -> int:
    """Devuelve el número de mensajes enviados hoy por el usuario."""
    from datetime import date

    today = date.today().isoformat()
    result = await (
        client.table("user_message_usage")
        .select("messages_sent")
        .eq("user_id", user_id)
        .eq("usage_date", today)
        .execute()
    )
    if not result.data:
        return 0
    return int(result.data[0]["messages_sent"])


async def increment_daily_count(
    client: AsyncClient,
    user_id: str,
    limit: int = 0,
) -> None:
    """Incrementa atómicamente el contador diario del usuario via RPC.

    La función PostgreSQL `increment_message_usage` hace un INSERT … ON CONFLICT DO UPDATE
    en una sola operación, eliminando la race condition del patrón SELECT+UPDATE previo.

    Args:
        client: Cliente Supabase autenticado como el usuario.
        user_id: UUID del usuario.
        limit: Límite diario del plan del usuario (0 = ilimitado). Se pasa a la
               función PostgreSQL para que pueda lanzar una excepción si el
               contador ya lo alcanza, añadiendo una segunda línea de defensa
               a nivel de base de datos.
    """
    await client.rpc(
        "increment_message_usage",
        {"p_user_id": user_id, "p_limit": limit},
    ).execute()
