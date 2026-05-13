"""Repositorio para la tabla `semantic_tags`."""
from supabase import Client

from app.utils.async_supabase import run_sync


async def list_main_themes_for_session(
    client: Client, session_id: str
) -> str | None:
    """Devuelve el primer tag_value de tipo 'temas_principales' para la sesión."""
    result = await run_sync(
        lambda: client.table("semantic_tags")
        .select("tag_value")
        .eq("session_id", session_id)
        .eq("tag_type", "temas_principales")
        .execute()
    )
    if not result.data:
        return None
    raw: object = result.data[0]["tag_value"]
    if isinstance(raw, list):
        return ", ".join(str(t) for t in raw)
    return str(raw)


async def get_themes_by_session_ids(
    client: Client, session_ids: list[str]
) -> dict[str, list[str]]:
    """Devuelve {session_id: [temas...]} para tag_type='temas_principales'.

    Una sola query bulk con .in_(...). Reemplaza el patrón N+1 de hacer
    una query por sesión. Si session_ids está vacío, no toca la DB.
    Como tag_value es jsonb tras la migración 007, ya viene como list[str].
    """
    if not session_ids:
        return {}
    result = await run_sync(
        lambda: client.table("semantic_tags")
        .select("session_id, tag_value")
        .in_("session_id", session_ids)
        .eq("tag_type", "temas_principales")
        .execute()
    )
    out: dict[str, list[str]] = {}
    for row in result.data:
        sid: str = str(row["session_id"])
        raw: object = row["tag_value"]
        themes: list[str]
        if isinstance(raw, list):
            themes = [str(t) for t in raw]
        else:
            themes = [str(raw)]
        out[sid] = themes
    return out


async def session_ids_with_tags(
    client: Client, session_ids: list[str]
) -> set[str]:
    """Subconjunto de session_ids que tienen al menos un tag asociado."""
    if not session_ids:
        return set()
    result = await run_sync(
        lambda: client.table("semantic_tags")
        .select("session_id")
        .in_("session_id", session_ids)
        .execute()
    )
    return {str(row["session_id"]) for row in result.data}
