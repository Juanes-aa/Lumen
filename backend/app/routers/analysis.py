import json
import logging
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from supabase import AsyncClient

from app.dependencies.auth import get_current_user_id
from app.dependencies.rate_limit import get_user_id_or_ip, limiter
from app.dependencies.supabase import get_supabase_admin_data, get_supabase_user
from app.providers import get_llm_provider
from app.providers.llm import LLMProvider
from app.repositories import jobs as jobs_repo
from app.repositories import messages as messages_repo
from app.repositories import movies as movies_repo
from app.repositories import sessions as sessions_repo
from app.repositories import tags as tags_repo
from app.repositories import usage as usage_repo
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
from app.services import tier_service

logger: logging.Logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.post("/sessions", response_model=SessionResponse, status_code=201)
async def create_session(
    data: CreateSessionRequest,
    user_id: str = Depends(get_current_user_id),
    client: AsyncClient = Depends(get_supabase_user),
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
    client: AsyncClient = Depends(get_supabase_user),
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
    client: AsyncClient = Depends(get_supabase_user),
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
    supabase: AsyncClient = Depends(get_supabase_user),
    provider: LLMProvider = Depends(get_llm_provider),
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

    # Admin async client para background task (bypassea RLS, no necesita JWT del usuario).
    admin_client = get_supabase_admin_data()
    job_id: str | None = None
    try:
        job_id = await jobs_repo.create_job(
            admin_client,
            "extract_semantic_tags",
            {"session_id": session_id},
        )
    except Exception:
        logger.warning("close_session_job_create_failed session_id=%s", session_id)

    background_tasks.add_task(
        extract_semantic_tags, session_id, admin_client, provider, job_id
    )

    return CloseSessionResponse(id=session_id, status="closed", closed_at=closed_at)


@router.post("/sessions/{session_id}/messages", response_model=MessageResponse, status_code=201)
@limiter.limit("30/minute", key_func=get_user_id_or_ip)
async def send_message(
    request: Request,
    session_id: str,
    data: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
    client: AsyncClient = Depends(get_supabase_user),
    provider: LLMProvider = Depends(get_llm_provider),
) -> MessageResponse:
    daily_limit = await tier_service.get_user_daily_limit(client, user_id)
    if daily_limit > 0:
        daily_count = await usage_repo.get_daily_count(client, user_id)
        if daily_count >= daily_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Has alcanzado el límite diario de mensajes de tu plan",
            )

    messages = await chat_service.build_chat_payload(
        client, session_id, user_id, data.content
    )

    assistant_content: str = await provider.complete(messages)
    if assistant_content == "":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Respuesta vacía del modelo",
        )

    assistant_row: AnalysisMessageRow = await chat_service.persist_assistant_message(
        client, session_id, assistant_content
    )
    await usage_repo.increment_daily_count(client, user_id)

    return MessageResponse(
        id=assistant_row["id"],
        session_id=assistant_row["session_id"],
        role=assistant_row["role"],
        content=assistant_row["content"],
        created_at=assistant_row["created_at"],
    )


@router.post("/sessions/{session_id}/messages/stream")
@limiter.limit("30/minute", key_func=get_user_id_or_ip)
async def send_message_stream(
    request: Request,
    session_id: str,
    data: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
    client: AsyncClient = Depends(get_supabase_user),
    provider: LLMProvider = Depends(get_llm_provider),
) -> StreamingResponse:
    daily_limit = await tier_service.get_user_daily_limit(client, user_id)
    if daily_limit > 0:
        daily_count = await usage_repo.get_daily_count(client, user_id)
        if daily_count >= daily_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Has alcanzado el límite diario de mensajes de tu plan",
            )

    messages = await chat_service.build_chat_payload(
        client, session_id, user_id, data.content
    )

    # Registra reconexiones SSE (Last-Event-ID presente = cliente reconectando).
    last_event_id = request.headers.get("Last-Event-ID")
    if last_event_id:
        logger.info("sse_reconnect session_id=%s last_event_id=%s", session_id, last_event_id)

    async def event_stream() -> AsyncGenerator[str, None]:
        full_response: str = ""
        event_id: int = 0
        # retry hint: 3s entre reconexiones
        yield "retry: 3000\n\n"
        try:
            async for token in provider.stream(messages):
                full_response += token
                yield f"id: {event_id}\ndata: {json.dumps({'token': token})}\n\n"
                event_id += 1

            if full_response:
                row: AnalysisMessageRow = await chat_service.persist_assistant_message(
                    client, session_id, full_response
                )
                await usage_repo.increment_daily_count(client, user_id)
                yield (
                    f"id: {event_id}\ndata: "
                    + json.dumps({"done": True, "message_id": str(row["id"])})
                    + "\n\n"
                )
            else:
                yield f"id: {event_id}\ndata: " + json.dumps({"error": "Respuesta vacía del modelo"}) + "\n\n"
        except Exception:
            logger.exception("send_message_stream_error session_id=%s", session_id)
            yield f"id: {event_id}\ndata: " + json.dumps({"error": "Error generando respuesta"}) + "\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/sessions/{session_id}/suggestions", response_model=SuggestionsResponse)
async def get_session_suggestions(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    client: AsyncClient = Depends(get_supabase_user),
    provider: LLMProvider = Depends(get_llm_provider),
) -> SuggestionsResponse:
    row = await sessions_repo.get_session_by_id(client, session_id, user_id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesión no encontrada",
        )

    title: str = str(row["movies_watched"]["title"])
    overview: str = row["movies_watched"].get("overview") or ""

    suggestions: list[str] = await generate_session_suggestions(title, overview, provider)
    return SuggestionsResponse(suggestions=suggestions)


@router.get("/sessions/{session_id}/messages", response_model=ConversationResponse)
async def get_messages(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
    client: AsyncClient = Depends(get_supabase_user),
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
    supabase: AsyncClient = Depends(get_supabase_user),
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
