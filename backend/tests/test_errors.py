"""Tests para handler global de excepciones, request_id middleware y
detección estructurada de errores duplicados."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from postgrest.exceptions import APIError as PostgrestAPIError
from supabase_auth.errors import AuthApiError

from app.dependencies.supabase import get_supabase_admin, get_supabase_user
from main import app


# ── Request ID middleware ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_health_response_includes_request_id_header() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert "x-request-id" in {k.lower() for k in response.headers.keys()}
    assert len(response.headers["x-request-id"]) > 0


@pytest.mark.asyncio
async def test_incoming_request_id_header_is_propagated() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/health", headers={"X-Request-ID": "test-correlation-123"}
        )
    assert response.status_code == 200
    assert response.headers["x-request-id"] == "test-correlation-123"


# ── Handler global para Exception no manejada ─────────────────────────


@pytest.mark.asyncio
async def test_unhandled_exception_returns_generic_500() -> None:
    """Cuando un endpoint lanza una Exception arbitraria, el cliente debe
    recibir un 500 genérico, NUNCA `str(exc)`."""
    secret_message: str = "TOP_SECRET_INTERNAL_ERROR_DETAILS"

    @app.get("/_test_boom")
    def _boom() -> dict[str, str]:
        raise RuntimeError(secret_message)

    # raise_app_exceptions=False: dejamos que la pila de middlewares/handlers
    # convierta la Exception en respuesta HTTP en lugar de propagarla al test.
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/_test_boom")
    finally:
        # Limpieza: quitar la ruta de test del router para no contaminar.
        app.router.routes = [
            r for r in app.router.routes if getattr(r, "path", None) != "/_test_boom"
        ]

    assert response.status_code == 500
    body = response.json()
    assert body["detail"] == "Error interno"
    assert "request_id" in body
    assert secret_message not in response.text


# ── Detección estructurada de duplicado en /auth/register ─────────────


def _make_duplicate_mock_with_code() -> MagicMock:
    mock_client: MagicMock = MagicMock()
    mock_client.auth.admin.create_user.side_effect = AuthApiError(
        message="some opaque message",
        status=422,
        code="email_exists",
    )
    return mock_client


@pytest.mark.asyncio
@patch("app.routers.auth.get_supabase_admin")
async def test_register_duplicate_detected_by_structured_code(
    mock_get_client: MagicMock,
) -> None:
    mock_get_client.return_value = _make_duplicate_mock_with_code()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload: dict[str, str] = {
            "email": "dup@example.com",
            "username": "user1",
            "password": "securepass123",
        }
        response = await client.post("/auth/register", json=payload)

    assert response.status_code == 400
    detail: str = response.json()["detail"].lower()
    assert "email" in detail


# ── Detección de unique_violation en /movies/watched vía postgrest ────


def _mock_insert_postgrest_unique_violation() -> MagicMock:
    mock: MagicMock = MagicMock()
    mock.table.return_value.insert.return_value.execute.side_effect = (
        PostgrestAPIError(
            {
                "code": "23505",
                "message": "duplicate key value violates unique constraint",
                "details": None,
                "hint": None,
            }
        )
    )
    return mock


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-token"}


VALID_PAYLOAD: dict[str, object] = {
    "tmdb_id": 12345,
    "title": "Test Movie",
    "poster_url": None,
    "release_year": 2020,
    "genre_ids": [],
    "initial_note": None,
}


@pytest.mark.asyncio
async def test_movies_duplicate_detected_via_postgrest_code() -> None:
    from app.dependencies.auth import get_current_user_id

    app.dependency_overrides[get_current_user_id] = lambda: "user-1"
    app.dependency_overrides[get_supabase_user] = (
        lambda: _mock_insert_postgrest_unique_violation()
    )

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/movies/watched", json=VALID_PAYLOAD, headers=_auth_headers()
            )
    finally:
        app.dependency_overrides.pop(get_supabase_user, None)
        app.dependency_overrides.pop(get_current_user_id, None)

    assert response.status_code == 409
    assert "already" in response.json()["detail"].lower()
