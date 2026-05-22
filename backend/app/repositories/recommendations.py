"""Repositorio para la tabla `recommendations`."""
from supabase import AsyncClient

from app.repositories.types import RecommendationRow


async def list_active(client: AsyncClient, user_id: str) -> list[RecommendationRow]:
    result = await (
        client.table("recommendations")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "active")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


async def insert_recommendation(
    client: AsyncClient, user_id: str, payload: dict[str, object]
) -> RecommendationRow | None:
    """Inserta una recomendación. Devuelve la fila creada o None si no devolvió data."""
    row: dict[str, object] = {"user_id": user_id, **payload}
    result = await client.table("recommendations").insert(row).execute()
    if not result.data:
        return None
    return result.data[0]


async def get_by_id(
    client: AsyncClient, user_id: str, recommendation_id: str
) -> RecommendationRow | None:
    result = await (
        client.table("recommendations")
        .select("*")
        .eq("id", recommendation_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]


async def update_status(
    client: AsyncClient,
    user_id: str,
    recommendation_id: str,
    status: str,
) -> RecommendationRow | None:
    result = await (
        client.table("recommendations")
        .update({"status": status})
        .eq("id", recommendation_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        return None
    return result.data[0]
