"""Repositorio para la tabla `user_profile`."""
from supabase import Client

from app.repositories.types import (
    UserInstructionsRow,
    UserPreferencesRow,
    UserProfileRow,
    UserPromptContextRow,
)
from app.utils.async_supabase import run_sync


async def get_profile(client: Client, user_id: str) -> UserProfileRow | None:
    """Perfil completo del usuario, o None si no existe."""
    result = await run_sync(
        lambda: client.table("user_profile")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


async def get_preferences_row(
    client: Client, user_id: str
) -> UserPreferencesRow | None:
    """Solo favorite_genres, reference_directors."""
    result = await run_sync(
        lambda: client.table("user_profile")
        .select("favorite_genres, reference_directors")
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


async def get_instructions_row(
    client: Client, user_id: str
) -> UserInstructionsRow | None:
    result = await run_sync(
        lambda: client.table("user_profile")
        .select("instructions")
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


async def get_prompt_context(
    client: Client, user_id: str
) -> UserPromptContextRow:
    """Devuelve instructions/favorite_genres/reference_directors para el system prompt.

    Si no hay perfil, devuelve {} (no es un error).
    """
    result = await run_sync(
        lambda: client.table("user_profile")
        .select("instructions, favorite_genres, reference_directors")
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else {}


async def upsert_preferences(
    client: Client,
    user_id: str,
    favorite_genres: list[str],
    reference_directors: list[str],
) -> None:
    """Upsert de preferencias. Ambos campos son jsonb (listas) en DB."""
    await run_sync(
        lambda: client.table("user_profile")
        .upsert(
            {
                "user_id": user_id,
                "favorite_genres": favorite_genres,
                "reference_directors": reference_directors,
            },
            on_conflict="user_id",
        )
        .execute()
    )


async def upsert_instructions(
    client: Client, user_id: str, instructions: str
) -> None:
    await run_sync(
        lambda: client.table("user_profile")
        .upsert(
            {"user_id": user_id, "instructions": instructions},
            on_conflict="user_id",
        )
        .execute()
    )
