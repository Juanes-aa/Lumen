"""Pruebas para el endurecimiento de auth (Riesgo 2):

* `get_current_user_id` debe rechazar tokens que no sean ES256+kid.
* `validate_critical_settings` debe abortar si falta config crítica.
"""

from __future__ import annotations

import base64
import json

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import (
    ConfigurationError,
    Settings,
    validate_critical_settings,
)
from main import app


# ── JWT: rechazo de algoritmos no-ES256 ────────────────────────────────


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _fake_token(header: dict[str, object]) -> str:
    """Token con header arbitrario y firma basura.

    Nuestro backend debe rechazarlo en la fase de pre-chequeo de
    algoritmo, ANTES de intentar verificar la firma o contactar JWKS.
    """
    h: str = _b64url(json.dumps(header).encode())
    p: str = _b64url(
        json.dumps({"sub": "u-1", "exp": 9999999999, "aud": "authenticated"}).encode()
    )
    return f"{h}.{p}.invalidsignature"


@pytest.mark.asyncio
async def test_hs256_token_is_rejected() -> None:
    token: str = _fake_token({"alg": "HS256", "typ": "JWT"})
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/movies/watched",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401
    assert "algoritmo" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_es256_token_without_kid_is_rejected() -> None:
    token: str = _fake_token({"alg": "ES256", "typ": "JWT"})  # sin kid
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/movies/watched",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401


# ── validate_critical_settings ─────────────────────────────────────────


def _base_valid_settings(**overrides: object) -> Settings:
    base: dict[str, object] = {
        "supabase_url": "https://example.supabase.co",
        "supabase_anon_key": "anon-key",
        "supabase_service_role_key": "service-key",
        "groq_api_key": "groq-key",
        "cors_origins": ["http://localhost:5173"],
        "cookie_secure": False,
    }
    base.update(overrides)
    return Settings(**base)  # type: ignore[arg-type]


def test_validator_passes_with_full_config() -> None:
    validate_critical_settings(_base_valid_settings())


def test_validator_rejects_missing_anon_key() -> None:
    settings = _base_valid_settings(supabase_anon_key="")
    with pytest.raises(ConfigurationError) as exc:
        validate_critical_settings(settings)
    assert "SUPABASE_ANON_KEY" in str(exc.value)


def test_validator_rejects_http_url() -> None:
    settings = _base_valid_settings(supabase_url="http://example.supabase.co")
    with pytest.raises(ConfigurationError) as exc:
        validate_critical_settings(settings)
    assert "https://" in str(exc.value)


def test_validator_rejects_empty_cors() -> None:
    settings = _base_valid_settings(cors_origins=[])
    with pytest.raises(ConfigurationError) as exc:
        validate_critical_settings(settings)
    assert "CORS_ORIGINS" in str(exc.value)
