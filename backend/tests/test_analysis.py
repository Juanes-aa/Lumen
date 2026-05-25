from collections.abc import AsyncGenerator, Generator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import get_current_user_id
from app.dependencies.supabase import get_supabase_user
from app.providers import get_llm_provider
from main import app

FAKE_USER_ID = "aaaaaaaa-0000-0000-0000-000000000001"
FAKE_SESSION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
FAKE_MOVIE_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
OTHER_USER_ID = "bbbbbbbb-0000-0000-0000-000000000002"

_STARTED_AT: str = datetime(2025, 1, 1, tzinfo=UTC).isoformat()

MOVIE_ROW: dict[str, object] = {
    "id": FAKE_MOVIE_ID,
    "title": "Fight Club",
    "tmdb_id": 550,
    "poster_url": "/poster.jpg",
}

SESSION_INSERT_ROW: dict[str, object] = {
    "id": FAKE_SESSION_ID,
    "user_id": FAKE_USER_ID,
    "movie_id": FAKE_MOVIE_ID,
    "status": "active",
    "started_at": _STARTED_AT,
    "closed_at": None,
}

SESSION_ROW_WITH_MOVIE: dict[str, object] = {
    "id": FAKE_SESSION_ID,
    "user_id": FAKE_USER_ID,
    "movie_id": FAKE_MOVIE_ID,
    "status": "active",
    "started_at": _STARTED_AT,
    "closed_at": None,
    "movies_watched": {
        "title": "Fight Club",
        "tmdb_id": 550,
        "poster_url": "/poster.jpg",
    },
}

SESSION_ROW_OTHER_USER: dict[str, object] = {
    **SESSION_ROW_WITH_MOVIE,
    "user_id": OTHER_USER_ID,
}


def _ae(data: list | None = None) -> AsyncMock:
    r: MagicMock = MagicMock()
    r.data = data if data is not None else []
    return AsyncMock(return_value=r)


def _override_auth() -> str:
    return FAKE_USER_ID


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer fake-valid-token"}


def _mock_create_session_success() -> MagicMock:
    mock: MagicMock = MagicMock()
    # get_watched_by_id: movies_watched.select.eq("id").eq("user_id").execute()
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.execute = _ae([MOVIE_ROW])
    # create_session: analysis_sessions.insert.execute()
    mock.table.return_value.insert.return_value.execute = _ae([SESSION_INSERT_ROW])
    # mark_has_analysis: movies_watched.update.eq("movie_id").eq("user_id").execute()
    mock.table.return_value.update.return_value.eq.return_value.eq.return_value.execute = _ae([])
    return mock


def _mock_movie_not_found() -> MagicMock:
    mock: MagicMock = MagicMock()
    # get_watched_by_id returns empty list → 404
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.execute = _ae([])
    return mock


def _mock_list_sessions(rows: list[dict[str, object]]) -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "analysis_sessions":
            # list_user_sessions: .select(...).eq("user_id").is_("deleted_at","null").order(...).limit(...).execute()
            table_mock.select.return_value.eq.return_value.is_.return_value.order.return_value.limit.return_value.execute = _ae(rows)
        elif table_name == "semantic_tags":
            # session_ids_with_tags: .select("session_id").in_("session_id", [...]).execute()
            session_ids = [str(r["id"]) for r in rows]
            table_mock.select.return_value.in_.return_value.execute = _ae(
                [{"session_id": sid} for sid in session_ids] if rows else []
            )
        return table_mock

    mock.table.side_effect = table_side_effect
    return mock


def _mock_get_session(rows: list[dict[str, object]]) -> MagicMock:
    mock: MagicMock = MagicMock()
    # get_session_by_id: .select(...).eq("id").eq("user_id").is_("deleted_at","null").execute()
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae(rows)
    return mock


@pytest.fixture(autouse=True)
def _overrides() -> Generator[None, None, None]:
    app.dependency_overrides[get_current_user_id] = _override_auth
    yield
    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(get_supabase_user, None)
    app.dependency_overrides.pop(get_llm_provider, None)


# ── POST /analysis/sessions ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_session_success() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_create_session_success()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/analysis/sessions",
            json={"watched_movie_id": FAKE_MOVIE_ID},
            headers=_auth_headers(),
        )

    assert response.status_code == 201
    data = response.json()
    assert data["id"] == FAKE_SESSION_ID
    assert data["watched_movie_id"] == FAKE_MOVIE_ID


@pytest.mark.asyncio
async def test_create_session_movie_not_found() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_movie_not_found()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/analysis/sessions",
            json={"watched_movie_id": FAKE_MOVIE_ID},
            headers=_auth_headers(),
        )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_session_movie_belongs_to_other_user() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_movie_not_found()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/analysis/sessions",
            json={"watched_movie_id": FAKE_MOVIE_ID},
            headers=_auth_headers(),
        )

    assert response.status_code == 404


# ── GET /analysis/sessions ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_sessions_empty() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_list_sessions([])

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/analysis/sessions", headers=_auth_headers())

    assert response.status_code == 200
    data = response.json()
    assert data["sessions"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_sessions_with_data() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_list_sessions(
        [SESSION_ROW_WITH_MOVIE]
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/analysis/sessions", headers=_auth_headers())

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["sessions"][0]["movie_title"] == "Fight Club"


# ── GET /analysis/sessions/{session_id} ─────────────────────────────


@pytest.mark.asyncio
async def test_get_session_success() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_get_session(
        [SESSION_ROW_WITH_MOVIE]
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/analysis/sessions/{FAKE_SESSION_ID}", headers=_auth_headers()
        )

    assert response.status_code == 200
    assert response.json()["id"] == FAKE_SESSION_ID


@pytest.mark.asyncio
async def test_get_session_not_found() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_get_session([])

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/analysis/sessions/{FAKE_SESSION_ID}", headers=_auth_headers()
        )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_session_wrong_user() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_get_session([])

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/analysis/sessions/{FAKE_SESSION_ID}", headers=_auth_headers()
        )

    assert response.status_code == 404


# ── DELETE /analysis/sessions/{session_id} ───────────────────────────


def _mock_delete_session_success() -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "analysis_sessions":
            # get_session_with_status: .select("id, status").eq("id").eq("user_id").is_(...).execute()
            table_mock.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae([
                {"id": FAKE_SESSION_ID, "status": "active"}
            ])
            # delete_session_cascade: .update({...}).eq("id").eq("user_id").execute()
            table_mock.update.return_value.eq.return_value.eq.return_value.execute = _ae([])
        return table_mock

    mock.table.side_effect = table_side_effect
    return mock


def _mock_delete_session_other_user() -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "analysis_sessions":
            # Sesión ajena: la query con .eq("user_id") devuelve []
            table_mock.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae([])
        return table_mock

    mock.table.side_effect = table_side_effect
    return mock


def _mock_delete_session_not_found() -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "analysis_sessions":
            table_mock.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae([])
        return table_mock

    mock.table.side_effect = table_side_effect
    return mock


@pytest.mark.asyncio
async def test_delete_session_success() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_delete_session_success()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.delete(
            f"/analysis/sessions/{FAKE_SESSION_ID}", headers=_auth_headers()
        )

    assert response.status_code == 200
    assert response.json() == {"message": "Session deleted successfully"}


@pytest.mark.asyncio
async def test_delete_session_other_user_returns_404() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_delete_session_other_user()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.delete(
            f"/analysis/sessions/{FAKE_SESSION_ID}", headers=_auth_headers()
        )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_session_not_found() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_delete_session_not_found()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.delete(
            f"/analysis/sessions/{FAKE_SESSION_ID}", headers=_auth_headers()
        )

    assert response.status_code == 404


# ── build_analysis_prompt tests ──────────────────────────────────────

from app.services.ai_service import build_analysis_prompt


def test_build_analysis_prompt_with_prior_sessions() -> None:
    prior_sessions: list[dict[str, str]] = [
        {"title": "Mulholland Drive", "main_themes": "identidad, sueño"},
        {"title": "Stalker", "main_themes": "fe, zona, deseo"},
    ]

    result: str = build_analysis_prompt(
        movie_title="Inception",
        movie_overview="A thief who steals corporate secrets...",
        prior_sessions=prior_sessions,
    )

    assert "Mulholland Drive" in result
    assert "Stalker" in result
    assert "PELÍCULAS ANALIZADAS ANTERIORMENTE" in result


# ── generate_session_suggestions (unit) ─────────────────────────────


from app.services.ai_service import generate_session_suggestions


def _mock_provider_returning(content: str) -> MagicMock:
    """Mock LLMProvider (complete)."""
    provider_mock: MagicMock = MagicMock()
    provider_mock.complete = AsyncMock(return_value=content)
    return provider_mock


@pytest.mark.asyncio
async def test_generate_session_suggestions_parses_json() -> None:
    payload: str = (
        '{"suggestions": ["¿Qué representa la zona en Stalker?",'
        ' "¿Cómo opera la fe en el film?",'
        ' "¿Qué dilemas plantea el deseo?",'
        ' "¿Cómo estructura Tarkovsky el tiempo?",'
        ' "¿Qué contexto soviético resuena?"]}'
    )
    result = await generate_session_suggestions("Stalker", "Tres hombres entran a la zona…", _mock_provider_returning(payload))
    assert len(result) == 5
    assert result[0].startswith("¿Qué representa")


@pytest.mark.asyncio
async def test_generate_session_suggestions_returns_empty_on_invalid_json() -> None:
    provider_mock: MagicMock = MagicMock()
    provider_mock.complete = AsyncMock(return_value="no soy json")
    result = await generate_session_suggestions("X", "Y", provider_mock)
    assert result == []


# ── GET /analysis/sessions/{id}/suggestions ─────────────────────────


def _mock_session_for_suggestions(user_id: str = FAKE_USER_ID) -> MagicMock:
    mock: MagicMock = MagicMock()
    # get_session_by_id: .select(...).eq("id").eq("user_id").is_("deleted_at","null").execute()
    rows: list[dict[str, object]] = (
        [
            {
                "id": FAKE_SESSION_ID,
                "user_id": user_id,
                "movies_watched": {"title": "Stalker", "overview": "synopsis"},
            }
        ]
        if user_id == FAKE_USER_ID
        else []
    )
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae(rows)
    return mock


def _mock_provider_for_suggestions(content: str) -> MagicMock:
    """Mock LLMProvider que devuelve content para generate_session_suggestions."""
    provider_mock: MagicMock = MagicMock()
    provider_mock.complete = AsyncMock(return_value=content)
    return provider_mock


@pytest.mark.asyncio
async def test_get_suggestions_success() -> None:
    payload: str = '{"suggestions": ["q1", "q2", "q3", "q4", "q5"]}'
    app.dependency_overrides[get_supabase_user] = lambda: _mock_session_for_suggestions()
    app.dependency_overrides[get_llm_provider] = lambda: _mock_provider_for_suggestions(payload)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/analysis/sessions/{FAKE_SESSION_ID}/suggestions",
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    assert response.json() == {"suggestions": ["q1", "q2", "q3", "q4", "q5"]}


@pytest.mark.asyncio
async def test_get_suggestions_session_not_found() -> None:
    mock: MagicMock = MagicMock()
    # get_session_by_id: .select(...).eq("id").eq("user_id").is_("deleted_at","null").execute()
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae([])
    app.dependency_overrides[get_supabase_user] = lambda: mock
    app.dependency_overrides[get_llm_provider] = lambda: MagicMock()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/analysis/sessions/{FAKE_SESSION_ID}/suggestions",
            headers=_auth_headers(),
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_suggestions_other_user_returns_404() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_session_for_suggestions(
        user_id=OTHER_USER_ID
    )
    app.dependency_overrides[get_llm_provider] = lambda: MagicMock()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/analysis/sessions/{FAKE_SESSION_ID}/suggestions",
            headers=_auth_headers(),
        )
    assert response.status_code == 404


# ── POST /analysis/sessions/{id}/messages/stream ────────────────────


def _mock_supabase_for_streaming() -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(name: str) -> MagicMock:
        t: MagicMock = MagicMock()
        if name == "analysis_sessions":
            # get_session_by_id: .select(...).eq("id").eq("user_id").is_(...).execute()
            t.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae([
                {
                    "id": FAKE_SESSION_ID,
                    "status": "active",
                    "movie_id": FAKE_MOVIE_ID,
                    "movies_watched": {"title": "Stalker", "overview": "synopsis"},
                }
            ])
            # list_recent_closed_sessions_with_movie: .select(...).eq(...).eq(...).is_(...).neq(...).order(...).limit(...).execute()
            t.select.return_value.eq.return_value.eq.return_value.is_.return_value.neq.return_value.order.return_value.limit.return_value.execute = _ae([])
        elif name == "analysis_messages":
            # list_session_history: .select("role, content").eq("session_id").order(...).execute()
            t.select.return_value.eq.return_value.order.return_value.execute = _ae([])
            # insert_message (user + assistant): .insert({...}).execute()
            t.insert.return_value.execute = _ae([
                {"id": "00000000-0000-0000-0000-000000000099"}
            ])
        elif name == "user_profile":
            # get_user_daily_limit (tier_service) AND get_prompt_context (profile_repo):
            # both use .select(...).eq("user_id").execute()
            t.select.return_value.eq.return_value.execute = _ae([])
        elif name == "user_memory":
            # list_user_memory_contents: .select("content").eq("user_id").order(...).execute()
            t.select.return_value.eq.return_value.order.return_value.execute = _ae([])
        elif name == "user_message_usage":
            # get_daily_count: .select("messages_sent").eq("user_id").eq("usage_date").execute()
            t.select.return_value.eq.return_value.eq.return_value.execute = _ae([{"messages_sent": 0}])
        return t

    mock.table.side_effect = table_side_effect
    # increment_daily_count uses RPC, not table
    mock.rpc.return_value.execute = _ae([])
    return mock


def _mock_provider_streaming(tokens: list[str]) -> MagicMock:
    """Mock LLMProvider con stream que emite tokens directamente."""
    provider_mock: MagicMock = MagicMock()

    async def _stream(
        messages: list[dict[str, str]], **kwargs: object
    ) -> AsyncGenerator[str, None]:
        for tok in tokens:
            yield tok

    provider_mock.stream = _stream
    return provider_mock


@pytest.mark.asyncio
async def test_stream_message_emits_tokens_and_done() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_for_streaming()
    app.dependency_overrides[get_llm_provider] = lambda: _mock_provider_streaming(["Hola", " mundo"])

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/analysis/sessions/{FAKE_SESSION_ID}/messages/stream",
            json={"content": "¿Qué opinas?"},
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    body: str = response.text
    assert '"token": "Hola"' in body
    assert '"token": " mundo"' in body
    assert '"done": true' in body


def test_build_analysis_prompt_without_prior_sessions() -> None:
    result_empty: str = build_analysis_prompt(
        movie_title="Inception",
        movie_overview="A thief who steals corporate secrets...",
        prior_sessions=[],
    )

    result_one: str = build_analysis_prompt(
        movie_title="Inception",
        movie_overview="A thief who steals corporate secrets...",
        prior_sessions=[{"title": "Mulholland Drive", "main_themes": "identidad, sueño"}],
    )

    assert "PELÍCULAS ANALIZADAS ANTERIORMENTE" not in result_empty
    assert "PELÍCULAS ANALIZADAS ANTERIORMENTE" not in result_one
