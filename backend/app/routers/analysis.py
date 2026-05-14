import json
import logging
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from groq import AsyncGroq
from supabase import Client

from app.dependencies.auth import get_current_user_id
from app.dependencies.groq_client import get_groq_client
from app.dependencies.rate_limit import limiter
from app.dependencies.supabase import get_supabase_admin, get_supabase_user
from app.repositories import messages as messages_repo
from app.repositories import movies as movies_repo
from app.repositories import sessions as sessions_repo
from app.repositories import tags as tags_repo
from app.repositories.types import AnalysisMessageRow
from app.schemas.analysis import (
    CloseSessionResponse,
    ConversationResponse,
    CreateSessionRequest,
    MessageResponse,
    SendMessageRequest,
    SessionResponse,
    SessionSummary,
    SessionSummaryListResponse,
    SuggestionsResponse,
)
from app.services import chat_service
from app.services.ai_service import (
    extract_semantic_tags,
    generate_session_suggestions,
)

logger: logging.Logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/sessions", response_model=SessionResponse, status_code=201)
async def create_session(
    data: CreateSessionRequest,
    user_id: str = Depends(get_current_user_id),
    client: Client = Depends(get_supabase_user),
) -> SessionResponse:
    movie = await movies_repo.get_watched_by_id(client, user_id, str(data.watched_movie_id))
    if movie is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Película no encontrada en tu lista",
        )

    session = await sessions_repo.create_session(client, user_id, str(data.watched_movie_id))

    await movies_repo.mark_has_analysis(client, user_id, str(data.watched_movie_id))

    return SessionResponse(
        id=session["id"],
        user_id=session["user_id"],
        watched_movie_id=data.watched_movie_id,
        movie_title=str(movie["title"]),
        tmdb_id=int(str(movie["tmdb_id"])),
        poster_url=movie.get("poster_url") if movie.get("poster_url") is not None else None,
        status=str(session["status"]),
        started_at=session["started_at"],
        closed_at=session.get("closed_at"),
    )


@router.get("/sessions", response_model=SessionSummaryListResponse)
async def list_sessions(
    user_id: str = Depends(get_current_user_id),
    client: Client = Depends(get_supabase_user),
) -> SessionSummaryListResponse:
    rows = await sessions_repo.list_user_sessions(client, user_id)
    session_ids: list[str] = [str(row["id"]) for row in rows]
    sessions_with_tags: set[str] = await tags_repo.session_ids_with_tags(client, session_ids)

    sessions: list[SessionSummary] = [
        SessionSummary(
            id=str(row["id"]),
            movie_id=str(row["movie_id"]),
            movie_title=str(row["movies_watched"]["title"]),
            movie_poster_url=row["movies_watched"].get("poster_url"),
            status=str(row["status"]),
            started_at=row["started_at"],
            closed_at=row.get("closed_at"),
            has_tags=str(row["id"]) in sessions_with_tags,
        )
        for row in rows
    ]
    return SessionSummaryListResponse(sessions=sessions, total=len(sessions))


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    client: Client = Depends(get_supabase_user),
) -> SessionResponse:
    row = await sessions_repo.get_session_by_id(client, session_id, user_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada",
        )

    return SessionResponse(
        id=row["id"],
        user_id=row["user_id"],
        watched_movie_id=row["movie_id"],
        movie_title=str(row["movies_watched"]["title"]),
        tmdb_id=int(str(row["movies_watched"]["tmdb_id"])),
        poster_url=row["movies_watched"].get("poster_url"),
        status=str(row["status"]),
        started_at=row["started_at"],
        closed_at=row.get("closed_at"),
    )


@router.patch("/sessions/{session_id}/close", response_model=CloseSessionResponse)
async def close_session(
    session_id: str,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase_user),
    groq: AsyncGroq = Depends(get_groq_client),
) -> CloseSessionResponse:
    session = await sessions_repo.get_session_with_status(supabase, session_id, user_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada",
        )

    if session["status"] == "closed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sesión ya cerrada",
        )

    if not await messages_repo.has_user_messages(supabase, session_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sesión no tiene mensajes de usuario",
        )

    closed_at: str = datetime.now(timezone.utc).isoformat()
    await sessions_repo.close_session(supabase, session_id, user_id, closed_at)

    # La BackgroundTask corre tras devolver la respuesta; el JWT del
    # usuario podría expirar antes de que termine. Usamos el cliente
    # admin para esa tarea concreta (escribe en semantic_tags vinculados
    # a la sesión que ya validamos pertenece al usuario).
    background_tasks.add_task(
        extract_semantic_tags, session_id, get_supabase_admin(), groq
    )

    return CloseSessionResponse(id=session_id, status="closed", closed_at=closed_at)


@router.post("/sessions/{session_id}/messages", response_model=MessageResponse, status_code=201)
@limiter.limit("30/minute")
async def send_message(
    request: Request,
    session_id: str,
    data: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
    client: Client = Depends(get_supabase_user),
    groq: AsyncGroq = Depends(get_groq_client),
) -> MessageResponse:
    messages = await chat_service.build_chat_payload(
        client, session_id, user_id, data.content
    )

    response = await groq.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
    )
    assistant_content: str = response.choices[0].message.content or ""
    if assistant_content == "":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Respuesta vacía del modelo",
        )

    assistant_row: AnalysisMessageRow = await chat_service.persist_assistant_message(
        client, session_id, assistant_content
    )

    return MessageResponse(
        id=assistant_row["id"],
        session_id=assistant_row["session_id"],
        role=assistant_row["role"],
        content=assistant_row["content"],
        created_at=assistant_row["created_at"],
    )


@router.post("/sessions/{session_id}/messages/stream")
@limiter.limit("30/minute")
async def send_message_stream(
    request: Request,
    session_id: str,
    data: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
    client: Client = Depends(get_supabase_user),
    groq: AsyncGroq = Depends(get_groq_client),
) -> StreamingResponse:
    messages = await chat_service.build_chat_payload(
        client, session_id, user_id, data.content
    )

    async def event_stream() -> AsyncGenerator[str, None]:
        full_response: str = ""
        try:
            stream = await groq.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                max_tokens=1024,
                temperature=0.7,
                stream=True,
            )
            async for chunk in stream:
                token: str | None = chunk.choices[0].delta.content
                if token:
                    full_response += token
                    yield f"data: {json.dumps({'token': token})}\n\n"

            if full_response:
                row: AnalysisMessageRow = await chat_service.persist_assistant_message(
                    client, session_id, full_response
                )
                yield (
                    "data: "
                    + json.dumps({"done": True, "message_id": str(row["id"])})
                    + "\n\n"
                )
            else:
                yield "data: " + json.dumps({"error": "Respuesta vacía del modelo"}) + "\n\n"
        except Exception:
            logger.exception(
                "send_message_stream_groq_error session_id=%s", session_id
            )
            yield "data: " + json.dumps({"error": "Error generando respuesta"}) + "\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/sessions/{session_id}/suggestions", response_model=SuggestionsResponse)
async def get_session_suggestions(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    client: Client = Depends(get_supabase_user),
    groq: AsyncGroq = Depends(get_groq_client),
) -> SuggestionsResponse:
    row = await sessions_repo.get_session_by_id(client, session_id, user_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada",
        )

    title: str = str(row["movies_watched"]["title"])
    overview: str = str(row["movies_watched"].get("overview", ""))

    suggestions: list[str] = await generate_session_suggestions(title, overview, groq)
    return SuggestionsResponse(suggestions=suggestions)


@router.get("/sessions/{session_id}/messages", response_model=ConversationResponse)
async def get_messages(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    client: Client = Depends(get_supabase_user),
) -> ConversationResponse:
    if await sessions_repo.get_session_with_status(client, session_id, user_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada",
        )

    rows: list[AnalysisMessageRow] = await messages_repo.list_session_messages(client, session_id)

    return ConversationResponse(
        session_id=session_id,
        messages=[
            MessageResponse(
                id=row["id"],
                session_id=row["session_id"],
                role=row["role"],
                content=row["content"],
                created_at=row["created_at"],
            )
            for row in rows
        ],
    )


@router.delete("/sessions/{session_id}", status_code=200)
async def delete_analysis_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: Client = Depends(get_supabase_user),
) -> dict[str, str]:
    if await sessions_repo.get_session_with_status(supabase, session_id, user_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada",
        )

    try:
        await sessions_repo.delete_session_cascade(supabase, session_id, user_id)
    except Exception:
        logger.exception(
            "delete_session_cascade_failed session_id=%s user_id=%s",
            session_id,
            user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar la sesión",
        )

    return {"message": "Session deleted successfully"}
