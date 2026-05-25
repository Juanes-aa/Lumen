from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies.auth import get_current_user_id
from app.dependencies.supabase import get_supabase_user
from main import app

FAKE_USER_ID = "aaaaaaaa-0000-0000-0000-000000000001"
FAKE_NOTE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc"


def _ae(data: list | None = None) -> AsyncMock:
    r: MagicMock = MagicMock()
    r.data = data if data is not None else []
    return AsyncMock(return_value=r)


def _override_auth() -> str:
    return FAKE_USER_ID


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer fake-valid-token"}


@pytest.fixture(autouse=True)
def _overrides() -> Generator[None, None, None]:
    app.dependency_overrides[get_current_user_id] = _override_auth
    yield
    app.dependency_overrides.pop(get_current_user_id, None)
    app.dependency_overrides.pop(get_supabase_user, None)


# ── TEST 1 — GET /profile/semantic sin perfil existente ──────────────


@pytest.mark.asyncio
async def test_get_semantic_profile_no_profile() -> None:
    mock: MagicMock = MagicMock()
    # get_profile: .select("*").eq("user_id").execute()
    mock.table.return_value.select.return_value.eq.return_value.execute = _ae([])

    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/profile/semantic", headers=_auth_headers())

    assert response.status_code == 200
    data = response.json()
    assert data["has_profile"] is False
    assert data["temas_frecuentes"] == []
    assert data["directores_afines"] == []
    assert data["narrativa_predominante"] is None
    assert data["nivel_filosofico_promedio"] is None
    assert data["total_sesiones_analizadas"] == 0


# ── TEST 2 — GET /profile/semantic con perfil existente ──────────────


@pytest.mark.asyncio
async def test_get_semantic_profile_with_profile() -> None:
    profile_row: dict[str, object] = {
        "user_id": FAKE_USER_ID,
        "temas_frecuentes": [["identidad", 3], ["memoria", 2]],
        "directores_afines": [["Tarkovsky", 2]],
        "narrativa_predominante": "no lineal",
        "nivel_filosofico_promedio": "alto",
        "total_sesiones_analizadas": 3,
    }

    mock: MagicMock = MagicMock()
    # get_profile: .select("*").eq("user_id").execute()
    mock.table.return_value.select.return_value.eq.return_value.execute = _ae([profile_row])

    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/profile/semantic", headers=_auth_headers())

    assert response.status_code == 200
    data = response.json()
    assert data["has_profile"] is True
    assert data["temas_frecuentes"][0]["value"] == "identidad"
    assert data["temas_frecuentes"][0]["count"] == 3
    assert data["temas_frecuentes"][1]["value"] == "memoria"
    assert data["directores_afines"][0]["value"] == "Tarkovsky"
    assert data["narrativa_predominante"] == "no lineal"
    assert data["nivel_filosofico_promedio"] == "alto"
    assert data["total_sesiones_analizadas"] == 3


# ── TEST 3 — build_user_profile con sesiones y tags reales ───────────


@pytest.mark.asyncio
async def test_build_user_profile_with_data() -> None:
    from app.services.ai_service import build_user_profile

    upsert_calls: list[dict[str, object]] = []

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "analysis_sessions":
            # build_user_profile: .select("id").eq("user_id").eq("status","closed").is_("deleted_at","null").execute()
            table_mock.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae([
                {"id": "sess-0001"},
                {"id": "sess-0002"},
            ])
        elif table_name == "semantic_tags":
            # .select("tag_type, tag_value").in_("session_id", [...]).execute()
            table_mock.select.return_value.in_.return_value.execute = _ae([
                {"tag_type": "temas_principales", "tag_value": ["identidad", "tiempo"]},
                {"tag_type": "directores_estilo_similar", "tag_value": ["Tarkovsky"]},
                {"tag_type": "temas_principales", "tag_value": ["identidad"]},
            ])
        elif table_name == "user_profile":

            def track_upsert(*args: object, **kwargs: object) -> MagicMock:
                upsert_calls.append({"args": args, "kwargs": kwargs})
                result: MagicMock = MagicMock()
                result.execute = _ae([])
                return result

            table_mock.upsert.side_effect = track_upsert
        return table_mock

    mock_supabase: MagicMock = MagicMock()
    mock_supabase.table.side_effect = table_side_effect

    with patch("app.services.ai_service.asyncio.sleep", new_callable=AsyncMock):
        await build_user_profile(FAKE_USER_ID, mock_supabase)

    assert len(upsert_calls) == 1


# ── TEST 4 — build_user_profile sin sesiones cerradas no hace upsert ─


@pytest.mark.asyncio
async def test_build_user_profile_no_sessions() -> None:
    from app.services.ai_service import build_user_profile

    upsert_calls: list[dict[str, object]] = []

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "analysis_sessions":
            # No closed sessions → returns early
            table_mock.select.return_value.eq.return_value.eq.return_value.is_.return_value.execute = _ae([])
        elif table_name == "user_profile":

            def track_upsert(*args: object, **kwargs: object) -> MagicMock:
                upsert_calls.append({"args": args, "kwargs": kwargs})
                result: MagicMock = MagicMock()
                result.execute = _ae([])
                return result

            table_mock.upsert.side_effect = track_upsert
        return table_mock

    mock_supabase: MagicMock = MagicMock()
    mock_supabase.table.side_effect = table_side_effect

    await build_user_profile(FAKE_USER_ID, mock_supabase)

    assert len(upsert_calls) == 0


# ── TEST 5 — PUT /profile/preferences exitoso ────────────────────────


@pytest.mark.asyncio
async def test_update_preferences_success() -> None:
    mock: MagicMock = MagicMock()
    # upsert_preferences: .upsert({...}).execute()
    mock.table.return_value.upsert.return_value.execute = _ae([])

    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.put(
            "/profile/preferences",
            json={"favorite_genres": ["Drama", "Ciencia ficción"], "reference_directors": ["Tarkovsky"]},
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["favorite_genres"] == ["Drama", "Ciencia ficción"]


# ── TEST 6 — PUT /profile/instructions exitoso ───────────────────────


@pytest.mark.asyncio
async def test_update_instructions_success() -> None:
    mock: MagicMock = MagicMock()
    # upsert_instructions: .upsert({...}).execute()
    mock.table.return_value.upsert.return_value.execute = _ae([])

    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.put(
            "/profile/instructions",
            json={"instructions": "Actúa como crítico exigente."},
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    data = response.json()
    assert data["instructions"] == "Actúa como crítico exigente."


# ── TEST 7 — PUT /profile/instructions supera 1000 caracteres ────────


@pytest.mark.asyncio
async def test_update_instructions_too_long() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.put(
            "/profile/instructions",
            json={"instructions": "x" * 1001},
            headers=_auth_headers(),
        )

    assert response.status_code == 422


# ── TEST 8 — POST /profile/memory exitoso ────────────────────────────


@pytest.mark.asyncio
async def test_add_memory_note_success() -> None:
    inserted_row: dict[str, object] = {
        "id": FAKE_NOTE_ID,
        "user_id": FAKE_USER_ID,
        "content": "Soy estudiante de filosofía",
        "created_at": "2025-01-01T00:00:00+00:00",
    }

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "user_memory":
            # count_user_memory: .select("id").eq("user_id").execute()
            table_mock.select.return_value.eq.return_value.execute = _ae([])
            # insert_memory_note: .insert({...}).execute()
            table_mock.insert.return_value.execute = _ae([inserted_row])
        return table_mock

    mock: MagicMock = MagicMock()
    mock.table.side_effect = table_side_effect

    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/profile/memory",
            json={"content": "Soy estudiante de filosofía"},
            headers=_auth_headers(),
        )

    assert response.status_code == 201
    data = response.json()
    assert data["content"] == "Soy estudiante de filosofía"


# ── TEST 9 — POST /profile/memory límite de 10 notas ─────────────────


@pytest.mark.asyncio
async def test_add_memory_note_limit_reached() -> None:
    existing_notes: list[dict[str, object]] = [{"id": f"note-{i}"} for i in range(10)]

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "user_memory":
            # count_user_memory: .select("id").eq("user_id").execute()
            table_mock.select.return_value.eq.return_value.execute = _ae(existing_notes)
        return table_mock

    mock: MagicMock = MagicMock()
    mock.table.side_effect = table_side_effect

    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/profile/memory",
            json={"content": "nota nueva"},
            headers=_auth_headers(),
        )

    assert response.status_code == 422


# ── TEST 10 — DELETE /profile/memory/:id exitoso ─────────────────────


@pytest.mark.asyncio
async def test_delete_memory_note_success() -> None:
    note_row: dict[str, object] = {
        "id": FAKE_NOTE_ID,
        "user_id": FAKE_USER_ID,
    }

    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "user_memory":
            # delete_memory_note: .delete().eq("id").eq("user_id").execute()
            table_mock.delete.return_value.eq.return_value.eq.return_value.execute = _ae([note_row])
        return table_mock

    mock: MagicMock = MagicMock()
    mock.table.side_effect = table_side_effect

    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.delete(
            f"/profile/memory/{FAKE_NOTE_ID}",
            headers=_auth_headers(),
        )

    assert response.status_code == 200
    assert response.json() == {"message": "Note deleted successfully"}


# ── TEST 11 — DELETE /profile/memory/:id de otro usuario ─────────────


@pytest.mark.asyncio
async def test_delete_memory_note_other_user_returns_404() -> None:
    def table_side_effect(table_name: str) -> MagicMock:
        table_mock: MagicMock = MagicMock()
        if table_name == "user_memory":
            # delete_memory_note: .delete().eq("id").eq("user_id").execute()
            table_mock.delete.return_value.eq.return_value.eq.return_value.execute = _ae([])
        return table_mock

    mock: MagicMock = MagicMock()
    mock.table.side_effect = table_side_effect

    app.dependency_overrides[get_supabase_user] = lambda: mock

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.delete(
            f"/profile/memory/{FAKE_NOTE_ID}",
            headers=_auth_headers(),
        )

    assert response.status_code == 404


# ── TEST 12 — build_analysis_prompt con instrucciones ────────────────


def test_build_analysis_prompt_with_instructions() -> None:
    from app.services.ai_service import build_analysis_prompt

    result: str = build_analysis_prompt(
        movie_title="Test",
        movie_overview="Overview",
        prior_sessions=[],
        user_instructions="Actúa como crítico",
    )

    assert "INSTRUCCIONES DEL USUARIO" in result
    assert "Actúa como crítico" in result


# ── TEST 13 — build_analysis_prompt con preferencias ─────────────────


def test_build_analysis_prompt_with_preferences() -> None:
    from app.services.ai_service import build_analysis_prompt

    result: str = build_analysis_prompt(
        movie_title="Test",
        movie_overview="Overview",
        prior_sessions=[],
        favorite_genres=["Drama"],
        reference_directors=["Tarkovsky"],
    )

    assert "PREFERENCIAS DEL USUARIO" in result
    assert "Drama" in result
    assert "Tarkovsky" in result


# ── TEST 14 — build_analysis_prompt con memory_notes ─────────────────


def test_build_analysis_prompt_with_memory_notes() -> None:
    from app.services.ai_service import build_analysis_prompt

    result: str = build_analysis_prompt(
        movie_title="Test",
        movie_overview="Overview",
        prior_sessions=[],
        memory_notes=["Soy estudiante de filosofía"],
    )

    assert "NOTAS DE MEMORIA" in result
    assert "Soy estudiante de filosofía" in result


# ── TEST 15 — build_analysis_prompt sin contexto adicional ───────────


def test_build_analysis_prompt_no_extra_context() -> None:
    from app.services.ai_service import build_analysis_prompt

    result: str = build_analysis_prompt(
        movie_title="Test",
        movie_overview="Overview",
        prior_sessions=[],
    )

    assert "INSTRUCCIONES" not in result
    assert "PREFERENCIAS" not in result
    assert "NOTAS DE MEMORIA" not in result
