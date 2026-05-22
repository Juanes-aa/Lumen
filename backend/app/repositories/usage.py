"""Repositorio para la tabla `user_message_usage`.

Lleva el contador diario de mensajes LLM por usuario para aplicar el límite
configurado según el tier del usuario.
"""
from datetime import date

from supabase import AsyncClient


async def get_daily_count(client: AsyncClient, user_id: str) -> int:
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


async def increment_daily_count(client: AsyncClient, user_id: str) -> None:
    # SELECT + insert/update pattern. La race condition es aceptable para
    # un límite suave de uso (el coste de un mensaje extra es mínimo).
    today = date.today().isoformat()
    result = await (
        client.table("user_message_usage")
        .select("messages_sent")
        .eq("user_id", user_id)
        .eq("usage_date", today)
        .execute()
    )
    if result.data:
        new_count = int(result.data[0]["messages_sent"]) + 1
        await (
            client.table("user_message_usage")
            .update({"messages_sent": new_count})
            .eq("user_id", user_id)
            .eq("usage_date", today)
            .execute()
        )
    else:
        await (
            client.table("user_message_usage")
            .insert({"user_id": user_id, "usage_date": today, "messages_sent": 1})
            .execute()
        )
