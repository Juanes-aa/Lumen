from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import get_current_user_id
from app.dependencies.supabase import get_supabase_user
from app.providers import get_llm_provider
from main import app

FAKE_USER_ID = "aaaaaaaa-0000-0000-0000-000000000001"
FAKE_SESSION_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

SESSION_ACTIVE: dict[str, object] = {
    "id": FAKE_SESSION_ID,
    "user_id": FAKE_USER_ID,
    "status": "active",
    "movie_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "movies_watched": {
        "title": "Fight Club",
        "overview": "An insomniac office worker...",
    },
}

SESSION_CLOSED: dict[str, object] = {
    "id": FAKE_SESSION_ID,
    "user_id": FAKE_USER_ID,
    "status": "closed",
    "movie_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "movies_watched": {
        "title": "Fight Club",
        "overview": "An insomniac office worker...",
    },
}

INSERTED_USER_MSG: dict[str, object] = {
    "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "session_id": FAKE_SESSION_ID,
    "role": "user",
    "content": "¿Qué simboliza el jabón en Fight Club?",
    "created_at": "2025-01-01T00:00:00+00:00",
}

INSERTED_ASSISTANT_MSG: dict[str, object] = {
    "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
    "session_id": FAKE_SESSION_ID,
    "role": "assistant",
    "content": "El jabón en Fight Club simboliza...",
    "created_at": "2025-01-01T00:00:01+00:00",
}


def _ae(data: list | None = None) -> AsyncMock:
    r: MagicMock = MagicMock()
    r.data = data if data is not None else []
    return AsyncMock(return_value=r)


def _override_auth() -> str:
    return FAKE_USER_ID


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer fake-valid-token"}


def _mock_provider(content: str) -> MagicMock:
    """Mock LLMProvider (complete) que devuelve content."""
    mock: MagicMock = MagicMock()
    mock.complete = AsyncMock(return_value=content)
    return mock


def _mock_supabase_send_success() -> MagicMock:
    mock: MagicMock = MagicMock()

    insert_call_count: list[int] = [0]

    def table_side_effect(name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if name == "analysis_sessions":
            # get_session_by_id: .select(...).eq("id").eq("user_id").is_("deleted_at","null").execute()
            table_mock.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae([
                SESSION_ACTIVE
            ])
            # list_recent_closed_sessions_with_movie: .select(...).eq(...).eq(...).is_(...).neq(...).order(...).limit(...).execute()
            table_mock.select.return_value.eq.return_value.eq.return_value.is_.return_value.neq.return_value.order.return_value.limit.return_value.execute = _ae([])
        elif name == "analysis_messages":
            # list_session_history: .select("role, content").eq("session_id").order(...).execute()
            table_mock.select.return_value.eq.return_value.order.return_value.execute = _ae([])

            def insert_side_effect(payload: dict[str, object]) -> MagicMock:
                insert_call_count[0] += 1
                result: MagicMock = MagicMock()
                if insert_call_count[0] == 1:
                    # First insert: user message (from build_chat_payload persist_user_message=True)
                    result.execute = _ae([INSERTED_USER_MSG])
                else:
                    # Second insert: assistant message (from persist_assistant_message)
                    result.execute = _ae([INSERTED_ASSISTANT_MSG])
                return result

            table_mock.insert.side_effect = insert_side_effect
        elif name == "user_profile":
            # tier_service.get_user_daily_limit AND profile_repo.get_prompt_context:
            # both use .select(...).eq("user_id").execute()
            table_mock.select.return_value.eq.return_value.execute = _ae([])
        elif name == "user_message_usage":
            # usage_repo.get_daily_count: .select("messages_sent").eq("user_id").eq("usage_date").execute()
            table_mock.select.return_value.eq.return_value.eq.return_value.execute = _ae([{"messages_sent": 0}])
        elif name == "user_memory":
            # memory_repo.list_user_memory_contents: .select("content").eq("user_id").order(...).execute()
            table_mock.select.return_value.eq.return_value.order.return_value.execute = _ae([])
        elif name == "semantic_tags":
            # tags_repo.get_themes_by_session_ids (called only if prior_ids non-empty → skip)
            table_mock.select.return_value.in_.return_value.eq.return_value.execute = _ae([])
        return table_mock

    mock.table.side_effect = table_side_effect
    # usage_repo.increment_daily_count uses RPC, not table
    mock.rpc.return_value.execute = _ae([])
    return mock


def _mock_supabase_session_not_found() -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if name == "analysis_sessions":
            # get_session_by_id returns [] → 404 before any further queries
            table_mock.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae([])
        elif name == "user_profile":
            # tier_service.get_user_daily_limit (called before build_chat_payload)
            table_mock.select.return_value.eq.return_value.execute = _ae([])
        elif name == "user_message_usage":
            # usage_repo.get_daily_count (called when daily_limit > 0)
            table_mock.select.return_value.eq.return_value.eq.return_value.execute = _ae([{"messages_sent": 0}])
        return table_mock

    mock.table.side_effect = table_side_effect
    return mock


def _mock_supabase_session_closed() -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if name == "analysis_sessions":
            # get_session_by_id returns SESSION_CLOSED → 409 because status=="closed"
            table_mock.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae([
                SESSION_CLOSED
            ])
            # list_recent_closed_sessions_with_movie (not reached because 409 is raised first)
            table_mock.select.return_value.eq.return_value.eq.return_value.is_.return_value.neq.return_value.order.return_value.limit.return_value.execute = _ae([])
        elif name == "user_profile":
            table_mock.select.return_value.eq.return_value.execute = _ae([])
        elif name == "user_message_usage":
            table_mock.select.return_value.eq.return_value.eq.return_value.execute = _ae([{"messages_sent": 0}])
        return table_mock

    mock.table.side_effect = table_side_effect
    return mock


def _mock_supabase_get_messages(
    session_rows: list[dict[str, object]],
    message_rows: list[dict[str, object]],
) -> MagicMock:
    mock: MagicMock = MagicMock()

    def table_side_effect(name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if name == "analysis_sessions":
            # get_session_with_status: .select("id, status").eq("id").eq("user_id").is_("deleted_at","null").execute()
            table_mock.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae(
                session_rows
            )
        elif name == "analysis_messages":
            # list_session_messages: .select("*").eq("session_id").order(...).execute()
            table_mock.select.return_value.eq.return_value.order.return_value.execute = _ae(
                message_rows
            )
        return table_mock

    mock.table.side_effect = table_side_effect
    return mock


@pytest.fixture(autouse=True)
def _overrides() -> Generator[None, None, None]:
    app.dependency_overrides[get_current_user_id] = _override_auth
    yield
    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(get_supabase_user, None)
    app.dependency_overrides.pop(get_llm_provider, None)


# ── POST /analysis/sessions/{session_id}/messages ───────────────────


@pytest.mark.asyncio
async def test_send_message_success() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_send_success()
    app.dependency_overrides[get_llm_provider] = lambda: _mock_provider(
        "El jabón en Fight Club simboliza..."
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/analysis/sessions/{FAKE_SESSION_ID}/messages",
            json={"content": "¿Qué simboliza el jabón en Fight Club?"},
            headers=_auth_headers(),
        )

    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "assistant"
    assert data["content"]


@pytest.mark.asyncio
async def test_send_message_session_not_found() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_session_not_found()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/analysis/sessions/{FAKE_SESSION_ID}/messages",
            json={"content": "¿Qué simboliza el jabón en Fight Club?"},
            headers=_auth_headers(),
        )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_send_message_session_closed() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_session_closed()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/analysis/sessions/{FAKE_SESSION_ID}/messages",
            json={"content": "¿Qué simboliza el jabón en Fight Club?"},
            headers=_auth_headers(),
        )

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_send_message_empty_content() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            f"/analysis/sessions/{FAKE_SESSION_ID}/messages",
            json={"content": ""},
            headers=_auth_headers(),
        )

    assert response.status_code == 422


# ── GET /analysis/sessions/{session_id}/messages ────────────────────


@pytest.mark.asyncio
async def test_get_messages_success() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_get_messages(
        [SESSION_ACTIVE], [INSERTED_USER_MSG, INSERTED_ASSISTANT_MSG]
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/analysis/sessions/{FAKE_SESSION_ID}/messages",
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "user"


@pytest.mark.asyncio
async def test_get_messages_session_not_found() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_get_messages([], [])

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/analysis/sessions/{FAKE_SESSION_ID}/messages",
            headers=_auth_headers(),
        )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_messages_empty_conversation() -> None:
    app.dependency_overrides[get_supabase_user] = lambda: _mock_supabase_get_messages(
        [SESSION_ACTIVE], []
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            f"/analysis/sessions/{FAKE_SESSION_ID}/messages",
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["messages"] == []
