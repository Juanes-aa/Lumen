import asyncio
import json
import logging
from typing import Any

import httpx
from supabase import AsyncClient

from app.config import get_settings
from app.providers.llm import LLMProvider
from app.utils.rows import get_list_str

logger: logging.Logger = logging.getLogger(__name__)

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"


def _extract_names(items: object) -> list[str]:
    """Extrae los 'nombres' de una lista de pares jsonb.

    Acepta [item, count] (formato de Counter.most_common) y
    {"value": ..., "count": ...} por compatibilidad histórica.
    """
    if not isinstance(items, list):
        return []
    out: list[str] = []
    for item in items:
        if isinstance(item, dict) and "value" in item:
            out.append(str(item["value"]))
        elif isinstance(item, (list, tuple)) and len(item) >= 1:
            out.append(str(item[0]))
    return out


def build_recommendation_prompt(
    profile: dict[str, Any],
    watched_titles: list[str],
    already_recommended_titles: list[str],
    n: int,
) -> str:
    lines: list[str] = [
        "Eres un experto en cine con conocimiento enciclopédico.",
        "Tu tarea es recomendar películas altamente personalizadas basándote en el perfil del usuario.",
        "",
        "--- PERFIL SEMÁNTICO DEL USUARIO ---",
    ]

    # Tras la migración a jsonb, los campos vienen ya como listas Python.
    # `temas_frecuentes` y `directores_afines` pueden tener forma
    # [[item, count], ...] (formato actual de Counter.most_common)
    # o [{"value": ..., "count": ...}, ...] (formato alternativo). Ambos
    # se aceptan; cualquier otra cosa se ignora.
    temas: list[str] = _extract_names(profile.get("temas_frecuentes"))
    directores_afines: list[str] = _extract_names(profile.get("directores_afines"))

    if temas:
        lines.append(f"Temas frecuentes: {', '.join(temas)}")
    if directores_afines:
        lines.append(f"Directores afines: {', '.join(directores_afines)}")
    if profile.get("narrativa_predominante"):
        lines.append(f"Narrativa predominante: {profile['narrativa_predominante']}")
    if profile.get("nivel_filosofico_promedio"):
        lines.append(f"Nivel filosófico promedio: {profile['nivel_filosofico_promedio']}")

    fav_genres: list[str] = get_list_str(profile, "favorite_genres")
    ref_directors: list[str] = get_list_str(profile, "reference_directors")

    lines.append("")
    lines.append("--- PREFERENCIAS DECLARADAS ---")
    if fav_genres:
        lines.append(f"Géneros favoritos: {', '.join(fav_genres)}")
    if ref_directors:
        lines.append(f"Directores de referencia: {', '.join(ref_directors)}")

    if watched_titles:
        lines.append("")
        lines.append("--- PELÍCULAS YA VISTAS (NO repetir) ---")
        for t in watched_titles:
            lines.append(f"- {t}")

    if already_recommended_titles:
        lines.append("")
        lines.append("--- PELÍCULAS YA RECOMENDADAS (NO repetir) ---")
        for t in already_recommended_titles:
            lines.append(f"- {t}")

    lines += [
        "",
        "--- INSTRUCCIONES ---",
        f"Recomienda exactamente {n} películas que el usuario NO haya visto y NO hayan sido recomendadas antes.",
        "Los razonamientos deben ser específicos al perfil del usuario, no genéricos.",
        "Menciona concretamente qué elemento del perfil justifica cada recomendación.",
        "Devuelve SOLO JSON válido con este esquema exacto, sin texto previo ni posterior, sin markdown:",
        '{"recommendations": [{"title": "...", "year": "...", "reason": "...", "themes": ["...", "..."]}]}',
    ]

    return "\n".join(lines)


async def _search_tmdb(title: str, year: str) -> dict[str, Any] | None:
    api_key: str = get_settings().tmdb_api_key
    params: dict[str, str] = {"query": title, "api_key": api_key}
    if year and year.isdigit():
        params["year"] = year
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                f"{TMDB_BASE_URL}/search/movie",
                params=params,
            )
        resp.raise_for_status()
        results: list[dict[str, Any]] = resp.json().get("results", [])
        if not results:
            return None
        hit: dict[str, Any] = results[0]
        poster_path: str | None = hit.get("poster_path")
        return {
            "tmdb_id": int(hit["id"]),
            "title": str(hit.get("title", title)),
            "poster_url": f"{TMDB_IMAGE_BASE}{poster_path}" if poster_path else None,
        }
    except Exception as exc:
        logger.warning("TMDB search failed for '%s': %s", title, exc)
        return None


async def generate_recommendations(
    user_id: str,
    n: int,
    supabase: AsyncClient,
    provider: LLMProvider,
) -> list[dict[str, Any]]:
    profile_result = await (
        supabase.table("user_profile").select("*").eq("user_id", user_id).execute()
    )
    profile: dict[str, Any] = profile_result.data[0] if profile_result.data else {}

    watched_result = await (
        supabase.table("movies_watched").select("title").eq("user_id", user_id).execute()
    )
    watched_titles: list[str] = [
        str(row["title"]) for row in watched_result.data if row.get("title")
    ]

    prev_rec_result = await (
        supabase.table("recommendations")
        .select("title")
        .eq("user_id", user_id)
        .execute()
    )
    already_recommended_titles: list[str] = [
        str(row["title"]) for row in prev_rec_result.data if row.get("title")
    ]

    prompt: str = build_recommendation_prompt(
        profile=profile,
        watched_titles=watched_titles,
        already_recommended_titles=already_recommended_titles,
        n=n,
    )

    async def _call_llm(p: str) -> list[dict[str, Any]]:
        raw: str = await provider.complete(
            [{"role": "user", "content": p}],
            max_tokens=1500,
        )
        parsed: dict[str, Any] = json.loads(raw)
        return list(parsed["recommendations"])

    llm_items: list[dict[str, Any]] = []
    try:
        llm_items = await _call_llm(prompt)
    except Exception:
        logger.warning("recommendation_json_retry user_id=%s", user_id)
        retry_prompt: str = (
            prompt + "\n\nIMPORTANT: respond with ONLY raw JSON, no text before or after."
        )
        try:
            llm_items = await _call_llm(retry_prompt)
        except Exception:
            logger.exception(
                "generate_recommendations_failed user_id=%s", user_id
            )
            return []

    parsed_items: list[tuple[str, str, str, list[str]]] = [
        (
            str(item.get("title", "")),
            str(item.get("year", "")),
            str(item.get("reason", "")),
            [str(t) for t in item.get("themes", [])],
        )
        for item in llm_items
    ]

    tmdb_results: list[dict[str, Any] | None] = await asyncio.gather(
        *[_search_tmdb(title, year) for title, year, _, _ in parsed_items]
    )

    results: list[dict[str, Any]] = []
    for (_title, _year, reason, themes), tmdb in zip(parsed_items, tmdb_results, strict=False):
        if tmdb is None:
            continue
        results.append(
            {
                "title": tmdb["title"],
                "tmdb_id": tmdb["tmdb_id"],
                "poster_url": tmdb["poster_url"],
                "reason": reason,
                "themes": themes,
            }
        )

    return results
