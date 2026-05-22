"""Repositorio para la tabla `movies_watched`."""
from supabase import AsyncClient

from app.repositories.types import MovieWatchedMini, MovieWatchedRow


async def add_watched(
    client: AsyncClient, user_id: str, payload: dict[str, object]
) -> MovieWatchedRow:
    """Inserta una película vista. Lanza la excepción de Supabase si hay duplicado."""
    row: dict[str, object] = {"user_id": user_id, **payload}
    response = await client.table("movies_watched").insert(row).execute()
    return response.data[0]


async def list_watched(client: AsyncClient, user_id: str) -> list[MovieWatchedRow]:
    """Lista las películas vistas del usuario, ordenadas desc por created_at."""
    response = await (
        client.table("movies_watched")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data


async def delete_watched(client: AsyncClient, user_id: str, movie_id: str) -> bool:
    """Borra una película del usuario. True si se borró, False si no existía o era ajena."""
    response = await (
        client.table("movies_watched")
        .delete()
        .eq("id", movie_id)
        .eq("user_id", user_id)
        .execute()
    )
    return bool(response.data)


async def get_watched_by_id(
    client: AsyncClient, user_id: str, movie_id: str
) -> MovieWatchedMini | None:
    """Obtiene una película del usuario por id, o None."""
    result = await (
        client.table("movies_watched")
        .select("id, title, tmdb_id, poster_url")
        .eq("id", movie_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


async def mark_has_analysis(client: AsyncClient, user_id: str, movie_id: str) -> None:
    """Marca una película como analizada. Solo afecta si pertenece al usuario."""
    await (
        client.table("movies_watched")
        .update({"has_analysis": True})
        .eq("id", movie_id)
        .eq("user_id", user_id)
        .execute()
    )
