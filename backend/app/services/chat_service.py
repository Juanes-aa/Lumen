"""Servicio de chat: centraliza la lógica compartida por send_message y
send_message_stream del router de análisis.

Valida ownership de la sesión, carga contexto (sesiones previas con sus temas
en una sola query bulk, perfil, memoria, historial), construye el system prompt
e inserta el mensaje del usuario. Devuelve la lista de mensajes lista para
pasar a Groq.
"""
from fastapi import HTTPException, status
from supabase import Client

from app.repositories import memory as memory_repo
from app.repositories import messages as messages_repo
from app.repositories import profile as profile_repo
from app.repositories import sessions as sessions_repo
from app.repositories import tags as tags_repo
from app.repositories.types import (
    AnalysisMessageHistoryRow,
    AnalysisMessageRow,
    MovieMiniWithTmdb,
    UserPromptContextRow,
)
from app.services.ai_service import build_analysis_prompt
from app.utils.rows import get_list_str


async def build_chat_payload(
    client: Client,
    session_id: str,
    user_id: str,
    user_content: str,
    *,
    persist_user_message: bool = True,
) -> list[dict[str, str]]:
    """Valida la sesión, carga el contexto, inserta el mensaje del usuario y
    devuelve la lista de mensajes lista para Groq.

    Si `persist_user_message=False`, NO inserta la fila user-message (caso del
    streaming: queremos persistirla solo tras el primer token del LLM para
    evitar mensajes huérfanos si Groq falla antes de empezar).

    Lanza HTTPException(404) si la sesión no existe o no pertenece al usuario.
    Lanza HTTPException(409) si la sesión está cerrada.
    """
    session = await sessions_repo.get_session_by_id(client, session_id, user_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada",
        )
    if session["status"] == "closed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sesión cerrada",
        )

    movie: MovieMiniWithTmdb | None = session.get("movies_watched")
    if movie is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Película asociada no encontrada",
        )
    movie_title: str = str(movie.get("title") or "")
    movie_overview: str = str(movie.get("overview") or "")

    # Sesiones previas + temas en bulk (1 query, antes era N+1).
    prior_rows = await sessions_repo.list_recent_closed_sessions_with_movie(
        client, user_id, exclude_id=session_id, limit=5
    )
    prior_ids: list[str] = [str(r["id"]) for r in prior_rows]
    themes_map: dict[str, list[str]] = await tags_repo.get_themes_by_session_ids(
        client, prior_ids
    )
    prior_sessions: list[dict[str, str]] = []
    for r in prior_rows:
        sid: str = str(r["id"])
        themes: list[str] = themes_map.get(sid, [])
        if not themes:
            continue
        prior_sessions.append(
            {
                "title": str(r["movies_watched"]["title"]),
                "main_themes": ", ".join(themes),
            }
        )

    profile_ctx: UserPromptContextRow = await profile_repo.get_prompt_context(
        client, user_id
    )
    instructions_val = profile_ctx.get("instructions")
    user_instructions: str | None = instructions_val if instructions_val else None
    favorite_genres: list[str] = get_list_str(profile_ctx, "favorite_genres")
    reference_directors: list[str] = get_list_str(profile_ctx, "reference_directors")

    memory_notes: list[str] = await memory_repo.list_user_memory_contents(client, user_id)

    system_prompt: str = build_analysis_prompt(
        movie_title=movie_title,
        movie_overview=movie_overview,
        prior_sessions=prior_sessions,
        user_instructions=user_instructions,
        favorite_genres=favorite_genres,
        reference_directors=reference_directors,
        memory_notes=memory_notes,
    )

    history: list[AnalysisMessageHistoryRow] = await messages_repo.list_session_history(
        client, session_id
    )

    if persist_user_message:
        await messages_repo.insert_message(client, session_id, "user", user_content)

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_prompt},
        *[
            {
                "role": row.get("role") or "",
                "content": row.get("content") or "",
            }
            for row in history
        ],
        {"role": "user", "content": user_content},
    ]
    return messages


async def persist_assistant_message(
    client: Client, session_id: str, content: str
) -> AnalysisMessageRow:
    """Inserta el mensaje del assistant y devuelve la fila creada."""
    return await messages_repo.insert_message(client, session_id, "assistant", content)
