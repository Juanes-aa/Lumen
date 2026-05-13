"""Tests para rate limiting con slowapi.

Estos tests habilitan explícitamente el limiter (deshabilitado por
defecto en conftest.py) y resetean el storage interno antes de cada
test para aislamiento.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from supabase_auth.errors import AuthApiError

from app.dependencies.rate_limit import limiter
from main import app


def _make_login_failure_mock() -> MagicMock:
    mock_client: MagicMock = MagicMock()
    mock_client.auth.sign_in_with_password.side_effect = AuthApiError(
        message="Invalid login credentials", status=400, code=None
    )
    return mock_client


@pytest.fixture
def enabled_limiter() -> None:
    limiter.enabled = True
    limiter.reset()
    yield
    limiter.enabled = False
    limiter.reset()


@pytest.mark.asyncio
@patch("app.routers.auth.get_supabase_admin")
async def test_login_returns_429_after_threshold(
    mock_get_client: MagicMock, enabled_limiter: None
) -> None:
    """Tras 10 POST /auth/login en menos de un minuto, el 11º debe ser 429."""
    mock_get_client.return_value = _make_login_failure_mock()

    transport = ASGITransport(app=app)
    payload: dict[str, str] = {
        "email": "ratelimit@example.com",
        "password": "doesnotmatter1",
    }

    last_status: int = 0
    last_response = None
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for i in range(11):
            response = await client.post("/auth/login", json=payload)
            last_status = response.status_code
            last_response = response
            if i < 10:
                assert response.status_code != 429, (
                    f"Request {i + 1} no debería estar limitada todavía"
                )

    assert last_status == 429
    assert last_response is not None
    body = last_response.json()
    assert body.get("error") == "rate_limit_exceeded"
    assert "detail" in body


@pytest.mark.asyncio
@patch("app.routers.auth.get_supabase_admin")
async def test_login_allowed_when_limiter_disabled(
    mock_get_client: MagicMock,
) -> None:
    """Sin la fixture `enabled_limiter`, el limiter está deshabilitado y
    se pueden hacer muchas requests sin recibir 429."""
    mock_get_client.return_value = _make_login_failure_mock()

    transport = ASGITransport(app=app)
    payload: dict[str, str] = {
        "email": "nolimit@example.com",
        "password": "doesnotmatter1",
    }

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for _ in range(15):
            response = await client.post("/auth/login", json=payload)
            assert response.status_code != 429
