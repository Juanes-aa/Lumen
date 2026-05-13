import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from supabase import Client

from app.dependencies.auth import get_current_user_id
from app.dependencies.supabase import get_supabase_user
from app.utils.async_supabase import run_sync

router = APIRouter(prefix="/export", tags=["export"])


def _format_iso(value: object) -> str:
    if value is None:
        return ""
    return str(value)


def _short_date(value: object) -> str:
    raw: str = _format_iso(value)
    return raw[:10] if raw else ""


async def _collect_user_data(user_id: str, supabase: Client) -> dict[str, object]:
    sessions_result = await run_sync(
        lambda: supabase.table("analysis_sessions")
        .select("*, movies_watched(title, tmdb_id, poster_url, release_year)")
        .eq("user_id", user_id)
        .order("started_at", desc=True)
        .execute()
    )
    sessions_rows: list[dict[str, object]] = sessions_result.data

    session_ids: list[str] = [str(row["id"]) for row in sessions_rows]

    messages_by_session: dict[str, list[dict[str, object]]] = {sid: [] for sid in session_ids}
    tags_by_session: dict[str, list[dict[str, object]]] = {sid: [] for sid in session_ids}

    if session_ids:
        messages_result = await run_sync(
            lambda: supabase.table("analysis_messages")
            .select("session_id, role, content, created_at")
            .in_("session_id", session_ids)
            .order("created_at", desc=False)
            .execute()
        )
        for row in messages_result.data:
            sid: str = str(row["session_id"])
            messages_by_session.setdefault(sid, []).append(row)

        tags_result = await run_sync(
            lambda: supabase.table("semantic_tags")
            .select("session_id, tag_type, tag_value")
            .in_("session_id", session_ids)
            .execute()
        )
        for row in tags_result.data:
            sid = str(row["session_id"])
            tags_by_session.setdefault(sid, []).append(row)

    sessions: list[dict[str, object]] = []
    for row in sessions_rows:
        sid = str(row["id"])
        movie: dict[str, object] = row.get("movies_watched") or {}
        sessions.append(
            {
                "id": sid,
                "movie_title": str(movie.get("title", "")),
                "tmdb_id": movie.get("tmdb_id"),
                "release_year": movie.get("release_year"),
                "poster_url": movie.get("poster_url"),
                "status": str(row["status"]),
                "started_at": _format_iso(row.get("started_at")),
                "closed_at": _format_iso(row.get("closed_at")),
                "messages": [
                    {
                        "role": str(m["role"]),
                        "content": str(m["content"]),
                        "created_at": _format_iso(m.get("created_at")),
                    }
                    for m in messages_by_session.get(sid, [])
                ],
                "semantic_tags": [
                    {"type": str(t["tag_type"]), "value": t["tag_value"]}
                    for t in tags_by_session.get(sid, [])
                ],
            }
        )

    return {"sessions": sessions}


async def _collect_full_user_data(user_id: str, supabase: Client) -> dict[str, object]:
    base: dict[str, object] = await _collect_user_data(user_id, supabase)

    profile_result = await run_sync(
        lambda: supabase.table("user_profile")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    profile_row: dict[str, object] | None = (
        profile_result.data[0] if profile_result.data else None
    )

    profile: dict[str, object] | None = None
    if profile_row is not None:
        # Todos los campos json/jsonb llegan ya parseados desde Supabase.
        profile = {
            "temas_frecuentes": profile_row.get("temas_frecuentes") or [],
            "directores_afines": profile_row.get("directores_afines") or [],
            "narrativa_predominante": profile_row.get("narrativa_predominante"),
            "nivel_filosofico_promedio": profile_row.get("nivel_filosofico_promedio"),
            "total_sesiones_analizadas": profile_row.get("total_sesiones_analizadas", 0),
            "favorite_genres": profile_row.get("favorite_genres") or [],
            "reference_directors": profile_row.get("reference_directors") or [],
            "instructions": profile_row.get("instructions") or "",
        }

    memory_result = await run_sync(
        lambda: supabase.table("user_memory")
        .select("content, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )
    memory: list[dict[str, str]] = [
        {"content": str(r["content"]), "created_at": _format_iso(r.get("created_at"))}
        for r in memory_result.data
    ]

    library_result = await run_sync(
        lambda: supabase.table("movies_watched")
        .select("tmdb_id, title, release_year, genre_ids, initial_note, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    library: list[dict[str, object]] = [
        {
            "tmdb_id": r.get("tmdb_id"),
            "title": r.get("title"),
            "release_year": r.get("release_year"),
            "genre_ids": r.get("genre_ids") or [],
            "initial_note": r.get("initial_note"),
            "created_at": _format_iso(r.get("created_at")),
        }
        for r in library_result.data
    ]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "profile": profile,
        "library": library,
        "memory": memory,
        "sessions": base["sessions"],
    }


def _render_markdown(user_id: str, data: dict[str, object]) -> str:
    lines: list[str] = []
    today: str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines.append("# Lumen — Historial de análisis")
    lines.append("")
    lines.append(f"_Generado el {today}_")
    lines.append("")

    sessions: list[dict[str, object]] = list(data.get("sessions") or [])

    if not sessions:
        lines.append("No hay sesiones de análisis.")
        return "\n".join(lines) + "\n"

    lines.append(f"**Total de sesiones:** {len(sessions)}")
    lines.append("")
    lines.append("---")
    lines.append("")

    for session in sessions:
        title: str = str(session.get("movie_title") or "Sin título")
        year: object = session.get("release_year")
        title_line: str = f"## {title}" + (f" ({year})" if year else "")
        lines.append(title_line)
        lines.append("")

        started: str = _short_date(session.get("started_at"))
        closed_raw: str = _format_iso(session.get("closed_at"))
        closed: str = _short_date(closed_raw) if closed_raw else "sesión activa"
        status_value: str = str(session.get("status") or "")
        lines.append(f"- **Iniciada:** {started}")
        lines.append(f"- **Cerrada:** {closed}")
        lines.append(f"- **Estado:** {status_value}")
        lines.append("")

        messages: list[dict[str, object]] = list(session.get("messages") or [])
        if messages:
            lines.append("### Conversación")
            lines.append("")
            for msg in messages:
                role: str = str(msg.get("role") or "")
                speaker: str = "Tú" if role == "user" else "Lumen"
                content: str = str(msg.get("content") or "").strip()
                lines.append(f"**{speaker}:**")
                lines.append("")
                lines.append(content)
                lines.append("")
        else:
            lines.append("_Sin mensajes._")
            lines.append("")

        tags: list[dict[str, object]] = list(session.get("semantic_tags") or [])
        if tags:
            lines.append("### Etiquetas extraídas")
            lines.append("")
            for tag in tags:
                tag_type: str = str(tag.get("type") or "")
                raw_value: object = tag.get("value")
                # tag_value es jsonb: lista o string. Formatear para Markdown legible.
                if isinstance(raw_value, list):
                    tag_value: str = ", ".join(str(v) for v in raw_value)
                elif raw_value is None:
                    tag_value = ""
                else:
                    tag_value = str(raw_value)
                lines.append(f"- **{tag_type}:** {tag_value}")
            lines.append("")

        lines.append("---")
        lines.append("")

    return "\n".join(lines) + "\n"


def _filename(extension: str) -> str:
    today: str = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"lumen-export-{today}.{extension}"


@router.get("/markdown")
async def export_markdown(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase_user),
) -> Response:
    data: dict[str, object] = await _collect_user_data(user_id, supabase)
    body: str = _render_markdown(user_id, data)
    filename: str = _filename("md")
    return Response(
        content=body,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/json")
async def export_json(
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase_user),
) -> Response:
    payload: dict[str, object] = await _collect_full_user_data(user_id, supabase)
    body: str = json.dumps(payload, ensure_ascii=False, indent=2)
    filename: str = _filename("json")
    return Response(
        content=body,
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
