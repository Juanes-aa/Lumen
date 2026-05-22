from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from supabase import AsyncClient

from app.dependencies.auth import get_current_user_id
from app.dependencies.rate_limit import get_user_id_or_ip, limiter
from app.dependencies.supabase import get_supabase_user
from app.providers import get_llm_provider
from app.providers.llm import LLMProvider
from app.repositories import recommendations as recs_repo
from app.repositories import sessions as sessions_repo
from app.repositories.types import RecommendationRow
from app.schemas.recommendations import (
    GenerateRecommendationsResponse,
    RecommendationOut,
    RecommendationsListResponse,
)
from app.services.recommendation_service import generate_recommendations

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _row_to_out(row: RecommendationRow) -> RecommendationOut:
    # themes es jsonb (lista). Mantenemos tolerancia a string por si
    # algún row antiguo del backup pre-007 se reinyectara accidentalmente.
    raw_themes = row.get("themes", [])
    themes: list[str]
    if isinstance(raw_themes, list):
        themes = [str(t) for t in raw_themes]
    else:
        themes = []

    return RecommendationOut(
        id=str(row["id"]),
        title=str(row["title"]),
        tmdb_id=int(str(row["tmdb_id"])),
        poster_url=str(row["poster_url"]) if row.get("poster_url") else None,
        reason=str(row["reason"]),
        themes=themes,
        status=str(row["status"]),
        created_at=str(row["created_at"]),
    )


@router.get("/", response_model=RecommendationsListResponse)
async def get_recommendations(
    user_id: str = Depends(get_current_user_id),
    supabase: AsyncClient = Depends(get_supabase_user),
) -> RecommendationsListResponse:
    rows = await recs_repo.list_active(supabase, user_id)
    return RecommendationsListResponse(
        recommendations=[_row_to_out(row) for row in rows]
    )


@router.post(
    "/generate",
    response_model=GenerateRecommendationsResponse,
    status_code=201,
)
@limiter.limit("5/hour", key_func=get_user_id_or_ip)
async def generate_new_recommendations(
    request: Request,
    user_id: str = Depends(get_current_user_id),
    supabase: AsyncClient = Depends(get_supabase_user),
    provider: LLMProvider = Depends(get_llm_provider),
) -> GenerateRecommendationsResponse:
    closed_ids = await sessions_repo.list_closed_session_ids(supabase, user_id)
    if len(closed_ids) < 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Se necesitan al menos 3 análisis para generar recomendaciones",
        )

    items = await generate_recommendations(
        user_id=user_id,
        n=5,
        supabase=supabase,
        provider=provider,
    )

    saved: list[RecommendationOut] = []
    now: str = datetime.now(timezone.utc).isoformat()

    for item in items:
        inserted = await recs_repo.insert_recommendation(
            supabase,
            user_id,
            {
                "tmdb_id": item["tmdb_id"],
                "title": item["title"],
                "poster_url": item.get("poster_url"),
                "reason": item["reason"],
                "themes": item["themes"],
                "status": "active",
                "created_at": now,
            },
        )
        if inserted is not None:
            saved.append(_row_to_out(inserted))

    return GenerateRecommendationsResponse(
        recommendations=saved,
        generated_count=len(saved),
    )


@router.patch("/{recommendation_id}/dismiss", response_model=RecommendationOut)
async def dismiss_recommendation(
    recommendation_id: str,
    user_id: str = Depends(get_current_user_id),
    supabase: AsyncClient = Depends(get_supabase_user),
) -> RecommendationOut:
    if await recs_repo.get_by_id(supabase, user_id, recommendation_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recomendación no encontrada",
        )

    updated = await recs_repo.update_status(supabase, user_id, recommendation_id, "dismissed")
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recomendación no encontrada",
        )
    return _row_to_out(updated)
