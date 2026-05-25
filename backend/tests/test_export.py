import json
from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import get_current_user_id
from app.dependencies.supabase import get_supabase_user
from main import app

FAKE_USER_ID = "aaaaaaaa-0000-0000-0000-000000000001"
FAKE_SESSION_ID = "11111111-1111-1111-1111-111111111111"


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


def _mock_supabase_with_one_session() -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(name: str) -> MagicMock:
        t: MagicMock = MagicMock()
        if name == "analysis_sessions":
            # _collect_user_data: .select(...).eq("user_id").order(...).execute()
            t.select.return_value.eq.return_value.order.return_value.execute = _ae([
                {
                    "id": FAKE_SESSION_ID,
                    "status": "closed",
                    "started_at": "2026-04-01T10:00:00+00:00",
                    "closed_at": "2026-04-01T11:00:00+00:00",
                    "movies_watched": {
                        "title": "Stalker",
                        "tmdb_id": 1398,
                        "poster_url": "/p.jpg",
                        "release_year": 1979,
                    },
                }
            ])
        elif name == "analysis_messages":
            # _collect_user_data: .select(...).in_(...).order(...).limit(...).execute()
            t.select.return_value.in_.return_value.order.return_value.limit.return_value.execute = _ae([
                {
                    "session_id": FAKE_SESSION_ID,
                    "role": "user",
                    "content": "¿Qué representa la zona?",
                    "created_at": "2026-04-01T10:01:00+00:00",
                },
                {
                    "session_id": FAKE_SESSION_ID,
                    "role": "assistant",
                    "content": "La zona opera como…",
                    "created_at": "2026-04-01T10:02:00+00:00",
                },
            ])
        elif name == "semantic_tags":
            # _collect_user_data: .select(...).in_(...).execute()
            t.select.return_value.in_.return_value.execute = _ae([
                {
                    "session_id": FAKE_SESSION_ID,
                    "tag_type": "temas_principales",
                    "tag_value": ["fe", "deseo"],
                }
            ])
        elif name == "user_profile":
            # _collect_full_user_data: .select("*").eq("user_id").execute()
            t.select.return_value.eq.return_value.execute = _ae([
                {
                    "user_id": FAKE_USER_ID,
                    "temas_frecuentes": [["fe", 2]],
                    "directores_afines": [["Tarkovsky", 1]],
                    "narrativa_predominante": "no lineal",
                    "nivel_filosofico_promedio": "alto",
                    "total_sesiones_analizadas": 1,
                    "favorite_genres": ["Drama"],
                    "reference_directors": ["Tarkovsky"],
                    "instructions": "Sé crítico.",
                }
            ])
        elif name == "user_memory":
            # _collect_full_user_data: .select(...).eq("user_id").order(...).execute()
            t.select.return_value.eq.return_value.order.return_value.execute = _ae([
                {"content": "Estudio cine ruso", "created_at": "2026-03-15T09:00:00+00:00"}
            ])
        elif name == "movies_watched":
            # _collect_full_user_data: .select(...).eq("user_id").order(...).execute()
            t.select.return_value.eq.return_value.order.return_value.execute = _ae([
                {
                    "tmdb_id": 1398,
                    "title": "Stalker",
                    "release_year": 1979,
                    "genre_ids": [18, 878],
                    "initial_note": None,
                    "created_at": "2026-04-01T09:00:00+00:00",
                }
            ])
        return t

    mock.table.side_effect = table_side_effect
    return mock


def _mock_supabase_empty() -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(name: str) -> MagicMock:
        t: MagicMock = MagicMock()
        if name == "analysis_sessions":
            t.select.return_value.eq.return_value.order.return_value.execute = _ae([])
        elif name == "user_profile":
            t.select.return_value.eq.return_value.execute = _ae([])
        elif name == "user_memory":
            t.select.return_value.eq.return_value.order.return_value.execute = _ae([])
        elif name == "movies_watched":
            t.select.return_value.eq.return_value.order.return_value.execute = _ae([])
        return t

    mock.table.side_effect = table_side_effect
    return mock


@pytest.mark.asyncio
async def test_export_markdown_with_data() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_with_one_session()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/export/markdown", headers=_auth_headers())

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    disposition: str = response.headers["content-disposition"]
    assert disposition.startswith("attachment")
    assert ".md" in disposition

    body: str = response.text
    assert "# Lumen — Historial de análisis" in body
    assert "Stalker" in body
    assert "1979" in body
    assert "¿Qué representa la zona?" in body
    assert "La zona opera como" in body
    assert "temas_principales" in body


@pytest.mark.asyncio
async def test_export_markdown_empty() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_empty()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/export/markdown", headers=_auth_headers())

    assert response.status_code == 200
    assert "No hay sesiones de análisis." in response.text


@pytest.mark.asyncio
async def test_export_json_with_data() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_with_one_session()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/export/json", headers=_auth_headers())

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    disposition: str = response.headers["content-disposition"]
    assert disposition.startswith("attachment")
    assert ".json" in disposition

    payload: dict[str, object] = json.loads(response.text)
    assert payload["user_id"] == FAKE_USER_ID
    sessions: list[dict[str, object]] = list(payload["sessions"])  # type: ignore[arg-type]
    assert len(sessions) == 1
    assert sessions[0]["movie_title"] == "Stalker"
    assert len(sessions[0]["messages"]) == 2  # type: ignore[arg-type]
    assert payload["profile"] is not None
    assert payload["library"][0]["title"] == "Stalker"  # type: ignore[index]
    assert payload["memory"][0]["content"] == "Estudio cine ruso"  # type: ignore[index]


@pytest.mark.asyncio
async def test_export_json_empty() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_empty()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/export/json", headers=_auth_headers())

    assert response.status_code == 200
    payload: dict[str, object] = json.loads(response.text)
    assert payload["sessions"] == []
    assert payload["profile"] is None
    assert payload["library"] == []
    assert payload["memory"] == []
