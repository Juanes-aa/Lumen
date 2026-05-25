from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import get_current_user_id
from app.dependencies.supabase import get_supabase_user
from app.providers import get_llm_provider
from app.services.recommendation_service import build_recommendation_prompt
from main import app

FAKE_USER_ID = "aaaaaaaa-0000-0000-0000-000000000001"
FAKE_REC_ID = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"

FAKE_REC_ACTIVE: dict[str, object] = {
    "id": FAKE_REC_ID,
    "user_id": FAKE_USER_ID,
    "tmdb_id": 12345,
    "title": "Stalker",
    "poster_url": "https://image.tmdb.org/t/p/w500/poster.jpg",
    "reason": "Basado en tu interés por temas existenciales y Tarkovsky.",
    "themes": ["existencialismo", "tiempo"],
    "status": "active",
    "created_at": "2025-01-01T00:00:00+00:00",
}

FAKE_REC_DISMISSED: dict[str, object] = {
    **FAKE_REC_ACTIVE,
    "id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "status": "dismissed",
}


def _override_auth() -> str:
    return FAKE_USER_ID


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer fake-valid-token"}


def _ae(data: list | None = None) -> AsyncMock:
    r: MagicMock = MagicMock()
    r.data = data if data is not None else []
    return AsyncMock(return_value=r)


@pytest.fixture(autouse=True)
def _overrides() -> Generator[None, None, None]:
    app.dependency_overrides[get_current_user_id] = _override_auth
    yield
    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(get_supabase_user, None)
    app.dependency_overrides.pop(get_llm_provider, None)


# ── TEST 1 — GET /recommendations/ sin recomendaciones ───────────────


@pytest.mark.asyncio
async def test_get_recommendations_empty() -> None:
    mock: MagicMock = MagicMock()
    # list_active: .select("*").eq("user_id").eq("status", "active").order(...).execute()
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute = _ae([])
    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/recommendations/", headers=_auth_headers())

    assert response.status_code == 200
    data = response.json()
    assert data["recommendations"] == []


# ── TEST 2 — GET /recommendations/ solo devuelve 'active' ────────────


@pytest.mark.asyncio
async def test_get_recommendations_returns_active_only() -> None:
    mock: MagicMock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.execute = _ae([
        FAKE_REC_ACTIVE
    ])
    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/recommendations/", headers=_auth_headers())

    assert response.status_code == 200
    data = response.json()
    assert len(data["recommendations"]) == 1
    assert data["recommendations"][0]["status"] == "active"
    assert data["recommendations"][0]["title"] == "Stalker"
    assert data["recommendations"][0]["themes"] == ["existencialismo", "tiempo"]


# ── TEST 3 — POST /recommendations/generate con < 3 sesiones → 422 ──


@pytest.mark.asyncio
async def test_generate_requires_min_3_sessions() -> None:
    mock: MagicMock = MagicMock()

    def table_side_effect(name: str) -> MagicMock:
        t: MagicMock = MagicMock()
        if name == "analysis_sessions":
            # list_closed_session_ids: .select("id").eq("user_id").eq("status","closed").is_(...).execute()
            t.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae([
                {"id": "s1"},
                {"id": "s2"},
            ])
        return t

    mock.table.side_effect = table_side_effect
    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/recommendations/generate", headers=_auth_headers())

    assert response.status_code == 422
    assert "3 análisis" in response.json()["detail"]


# ── TEST 4 — PATCH /recommendations/{id}/dismiss → éxito ─────────────


@pytest.mark.asyncio
async def test_dismiss_recommendation_success() -> None:
    dismissed_row: dict[str, object] = {**FAKE_REC_ACTIVE, "status": "dismissed"}
    mock: MagicMock = MagicMock()

    def table_side_effect(name: str) -> MagicMock:
        t: MagicMock = MagicMock()
        if name == "recommendations":
            # get_by_id: .select("*").eq("id").eq("user_id").execute()
            t.select.return_value.eq.return_value.eq.return_value.execute = _ae([FAKE_REC_ACTIVE])
            # update_status: .update({...}).eq("id").eq("user_id").execute()
            t.update.return_value.eq.return_value.eq.return_value.execute = _ae([dismissed_row])
        return t

    mock.table.side_effect = table_side_effect
    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            f"/recommendations/{FAKE_REC_ID}/dismiss", headers=_auth_headers()
        )

    assert response.status_code == 200
    assert response.json()["status"] == "dismissed"


# ── TEST 5 — PATCH /recommendations/{id}/dismiss → 404 si no es del usuario ──


@pytest.mark.asyncio
async def test_dismiss_recommendation_not_found() -> None:
    mock: MagicMock = MagicMock()

    def table_side_effect(name: str) -> MagicMock:
        t: MagicMock = MagicMock()
        if name == "recommendations":
            t.select.return_value.eq.return_value.eq.return_value.execute = _ae([])
        return t

    mock.table.side_effect = table_side_effect
    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            "/recommendations/nonexistent-id/dismiss", headers=_auth_headers()
        )

    assert response.status_code == 404


# ── TEST 6 — build_recommendation_prompt contiene temas del perfil ────


def test_build_recommendation_prompt_contains_profile() -> None:
    profile: dict[str, object] = {
        "temas_frecuentes": [{"value": "existencialismo", "count": 5}],
        "directores_afines": [{"value": "Tarkovsky", "count": 3}],
        "narrativa_predominante": "filosófica",
        "nivel_filosofico_promedio": "alto",
        "favorite_genres": ["Drama", "Ciencia ficción"],
        "reference_directors": ["Kubrick"],
    }
    watched: list[str] = ["Fight Club", "2001: A Space Odyssey"]
    recommended: list[str] = ["Solaris"]

    prompt: str = build_recommendation_prompt(
        profile=profile,
        watched_titles=watched,
        already_recommended_titles=recommended,
        n=5,
    )

    assert "existencialismo" in prompt
    assert "Tarkovsky" in prompt
    assert "filosófica" in prompt
    assert "Drama" in prompt
    assert "Kubrick" in prompt
    assert "Fight Club" in prompt
    assert "Solaris" in prompt
    assert "5" in prompt
