from collections.abc import Generator
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import get_current_user_id
from app.dependencies.groq_client import get_groq_client
from app.dependencies.supabase import get_supabase_user
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


def _override_auth() -> str:
    return FAKE_USER_ID


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer fake-valid-token"}


def _mock_create_session_success() -> MagicMock:
    mock: MagicMock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        MOVIE_ROW
    ]
    mock.table.return_value.insert.return_value.execute.return_value.data = [
        SESSION_INSERT_ROW
    ]
    return mock


def _mock_movie_not_found() -> MagicMock:
    mock: MagicMock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    return mock


def _mock_list_sessions(rows: list[dict[str, object]]) -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "analysis_sessions":
            table_mock.select.return_value.eq.return_value.order.return_value.execute.return_value.data = rows
        elif table_name == "semantic_tags":
            session_ids = [str(r["id"]) for r in rows]
            table_mock.select.return_value.in_.return_value.execute.return_value.data = (
                [{"session_id": sid} for sid in session_ids] if rows else []
            )
        return table_mock

    mock.table.side_effect = table_side_effect
    return mock


def _mock_get_session(rows: list[dict[str, object]]) -> MagicMock:
    mock: MagicMock = MagicMock()
    # Repo aplica .eq("id").eq("user_id"), por eso 2 .eq.
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = rows
    return mock


@pytest.fixture(autouse=True)
def _overrides() -> Generator[None, None, None]:
    app.dependency_overrides[get_current_user_id] = _override_auth
    yield
    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(get_supabase_user, None)
    app.dependency_overrides.pop(get_groq_client, None)


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
    # Tras el fix de ownership, el repo filtra por user_id en la query;
    # una sesión ajena no aparece en los resultados → 404 (no 403).
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
            # Repo get_session_with_status: .select("id, status").eq("id").eq("user_id")
            table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {"id": FAKE_SESSION_ID, "status": "active"}
            ]
        return table_mock

    mock.table.side_effect = table_side_effect
    return mock


def _mock_delete_session_other_user() -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "analysis_sessions":
            # Sesión ajena: tras el fix la query con .eq("user_id") devuelve [].
            table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        return table_mock

    mock.table.side_effect = table_side_effect
    return mock


def _mock_delete_session_not_found() -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "analysis_sessions":
            table_mock.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
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
    # Tras el fix, una sesión ajena se trata como inexistente (no info leak).
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


def _mock_groq_returning(content: str) -> MagicMock:
    groq_mock: MagicMock = MagicMock()
    completion: MagicMock = MagicMock()
    completion.choices = [MagicMock()]
    completion.choices[0].message.content = content
    # AsyncGroq: chat.completions.create debe ser awaitable.
    groq_mock.chat.completions.create = AsyncMock(return_value=completion)
    return groq_mock


@pytest.mark.asyncio
async def test_generate_session_suggestions_parses_json() -> None:
    payload: str = (
        '{"suggestions": ["¿Qué representa la zona en Stalker?",'
        ' "¿Cómo opera la fe en el film?",'
        ' "¿Qué dilemas plantea el deseo?",'
        ' "¿Cómo estructura Tarkovsky el tiempo?",'
        ' "¿Qué contexto soviético resuena?"]}'
    )
    groq_mock = _mock_groq_returning(payload)
    result = await generate_session_suggestions("Stalker", "Tres hombres entran a la zona…", groq_mock)
    assert len(result) == 5
    assert result[0].startswith("¿Qué representa")


@pytest.mark.asyncio
async def test_generate_session_suggestions_returns_empty_on_invalid_json() -> None:
    groq_mock = _mock_groq_returning("no soy json")
    result = await generate_session_suggestions("X", "Y", groq_mock)
    assert result == []


# ── GET /analysis/sessions/{id}/suggestions ─────────────────────────


def _mock_session_for_suggestions(user_id: str = FAKE_USER_ID) -> MagicMock:
    mock: MagicMock = MagicMock()
    # Repo get_session_by_id: .select(...).eq("id").eq("user_id")
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
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = rows
    return mock


@pytest.mark.asyncio
async def test_get_suggestions_success() -> None:
    payload: str = (
        '{"suggestions": ["q1", "q2", "q3", "q4", "q5"]}'
    )
    app.dependency_overrides[get_supabase_user] = lambda: _mock_session_for_suggestions()
    app.dependency_overrides[get_groq_client] = lambda: _mock_groq_returning(payload)

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
    mock.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    app.dependency_overrides[get_supabase_user] = lambda: mock
    app.dependency_overrides[get_groq_client] = lambda: MagicMock()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/analysis/sessions/{FAKE_SESSION_ID}/suggestions",
            headers=_auth_headers(),
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_suggestions_other_user_returns_404() -> None:
    # Tras el fix, sesión ajena → 404 (el helper devuelve [] para user_id ajeno).
    app.dependency_overrides[get_supabase_user] = lambda: _mock_session_for_suggestions(
        user_id=OTHER_USER_ID
    )
    app.dependency_overrides[get_groq_client] = lambda: MagicMock()

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
            t.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                {
                    "id": FAKE_SESSION_ID,
                    "status": "active",
                    "movie_id": FAKE_MOVIE_ID,
                    "movies_watched": {"title": "Stalker", "overview": "synopsis"},
                }
            ]
            t.select.return_value.eq.return_value.eq.return_value.neq.return_value.order.return_value.limit.return_value.execute.return_value.data = []
        elif name == "analysis_messages":
            t.select.return_value.eq.return_value.order.return_value.execute.return_value.data = []
            t.insert.return_value.execute.return_value.data = [
                {"id": "00000000-0000-0000-0000-000000000099"}
            ]
        elif name == "user_profile":
            t.select.return_value.eq.return_value.execute.return_value.data = []
        elif name == "user_memory":
            t.select.return_value.eq.return_value.order.return_value.execute.return_value.data = []
        return t

    mock.table.side_effect = table_side_effect
    return mock


def _mock_groq_streaming(tokens: list[str]) -> MagicMock:
    groq_mock: MagicMock = MagicMock()

    def make_chunk(text: str) -> MagicMock:
        chunk: MagicMock = MagicMock()
        chunk.choices = [MagicMock()]
        chunk.choices[0].delta.content = text
        return chunk

    async def _async_iter():
        for tok in tokens:
            yield make_chunk(tok)

    # AsyncGroq stream: `await create(stream=True)` devuelve un objeto
    # `async for`-able. Aquí retornamos directamente el async generator.
    groq_mock.chat.completions.create = AsyncMock(return_value=_async_iter())
    return groq_mock


@pytest.mark.asyncio
async def test_stream_message_emits_tokens_and_done() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_for_streaming()
    app.dependency_overrides[get_groq_client] = lambda: _mock_groq_streaming(["Hola", " mundo"])

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
