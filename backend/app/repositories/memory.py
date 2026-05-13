"""Repositorio para la tabla `user_memory`."""
from supabase import Client

from app.repositories.types import UserMemoryRow
from app.utils.async_supabase import run_sync


async def list_user_memory(client: Client, user_id: str) -> list[UserMemoryRow]:
    result = await run_sync(
        lambda: client.table("user_memory")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data


async def list_user_memory_contents(client: Client, user_id: str) -> list[str]:
    """Solo contents (para alimentar al system prompt)."""
    result = await run_sync(
        lambda: client.table("user_memory")
        .select("content")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )
    return [str(row["content"]) for row in result.data]


async def count_user_memory(client: Client, user_id: str) -> int:
    result = await run_sync(
        lambda: client.table("user_memory")
        .select("id")
        .eq("user_id", user_id)
        .execute()
    )
    return len(result.data)


async def insert_memory_note(
    client: Client, user_id: str, content: str
) -> UserMemoryRow:
    result = await run_sync(
        lambda: client.table("user_memory")
        .insert({"user_id": user_id, "content": content})
        .execute()
    )
    return result.data[0]


async def delete_memory_note(client: Client, user_id: str, note_id: str) -> bool:
    """True si se borró, False si no existía o era de otro usuario."""
    result = await run_sync(
        lambda: client.table("user_memory")
        .delete()
        .eq("id", note_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(result.data)
