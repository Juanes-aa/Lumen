"""Tests del proxy TMDB (Riesgo 3).

Verifican que:
* La api_key nunca aparece en la respuesta visible al cliente.
* Search y movie funcionan con auth y devuelven el body de TMDB.
* Errores de TMDB se traducen a 404/502 sin filtrar internos.
* Endpoints sin auth devuelven 401.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.dependencies.auth import get_current_user_id
from main import app


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer fake-token"}


def _override_auth(user_id: str = "user-1") -> None:
    app.dependency_overrides[get_current_user_id] = lambda: user_id


def _clear_overrides() -> None:
    app.dependency_overrides.pop(get_current_user_id, None)


def _mock_httpx_response(status_code: int, json_data: Any) -> MagicMock:
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.json = MagicMock(return_value=json_data)
    return resp


def _patch_async_get(resp: MagicMock) -> Any:
    """Devuelve un context manager que parchea httpx.AsyncClient.get."""
    return patch(
        "app.routers.tmdb.httpx.AsyncClient",
        return_value=MagicMock(
            __aenter__=AsyncMock(
                return_value=MagicMock(get=AsyncMock(return_value=resp))
            ),
            __aexit__=AsyncMock(return_value=None),
        ),
    )


@pytest.fixture(autouse=True)
def _ensure_tmdb_key_present() -> None:
    # Aseguramos que la rama de "key ausente" no se activa por casualidad
    # en máquinas donde el .env del dev no tiene TMDB_API_KEY.
    get_settings.cache_clear()  # type: ignore[attr-defined]
    import os

    os.environ.setdefault("TMDB_API_KEY", "test-key")
    get_settings.cache_clear()  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_search_requires_auth() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/tmdb/search?q=matrix")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_search_proxies_tmdb_response() -> None:
    _override_auth()
    body: dict[str, Any] = {
        "results": [
            {
                "id": 603,
                "title": "The Matrix",
                "poster_path": "/p.jpg",
                "release_date": "1999-03-30",
                "genre_ids": [],
                "overview": "",
            }
        ],
        "total_results": 1,
        "total_pages": 1,
    }
    resp = _mock_httpx_response(200, body)
    try:
        with _patch_async_get(resp):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/tmdb/search?q=matrix", headers=_auth_headers()
                )
    finally:
        _clear_overrides()

    assert response.status_code == 200
    data = response.json()
    assert data == body
    # La api_key nunca debe filtrarse en la respuesta.
    assert "api_key" not in response.text
    assert "test-key" not in response.text


@pytest.mark.asyncio
async def test_search_rejects_short_query() -> None:
    _override_auth()
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/tmdb/search?q=a", headers=_auth_headers())
    finally:
        _clear_overrides()
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_movie_proxies_detail() -> None:
    _override_auth()
    body: dict[str, Any] = {
        "id": 603,
        "title": "The Matrix",
        "overview": "...",
        "credits": {"cast": [], "crew": []},
    }
    resp = _mock_httpx_response(200, body)
    try:
        with _patch_async_get(resp):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/tmdb/movie/603", headers=_auth_headers()
                )
    finally:
        _clear_overrides()
    assert response.status_code == 200
    assert response.json() == body
    assert "test-key" not in response.text


@pytest.mark.asyncio
async def test_movie_404_from_tmdb_becomes_404() -> None:
    _override_auth()
    resp = _mock_httpx_response(404, {"status_message": "not found"})
    try:
        with _patch_async_get(resp):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/tmdb/movie/999999999", headers=_auth_headers()
                )
    finally:
        _clear_overrides()
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_movie_5xx_from_tmdb_becomes_502() -> None:
    _override_auth()
    resp = _mock_httpx_response(500, {"status_message": "tmdb broken"})
    try:
        with _patch_async_get(resp):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/tmdb/movie/603", headers=_auth_headers()
                )
    finally:
        _clear_overrides()
    assert response.status_code == 502
    # No filtramos el mensaje original de TMDB.
    assert "tmdb broken" not in response.text


@pytest.mark.asyncio
async def test_movie_network_error_becomes_502() -> None:
    _override_auth()
    fake_client = MagicMock(
        __aenter__=AsyncMock(
            return_value=MagicMock(
                get=AsyncMock(side_effect=httpx.ConnectError("boom"))
            )
        ),
        __aexit__=AsyncMock(return_value=None),
    )
    try:
        with patch("app.routers.tmdb.httpx.AsyncClient", return_value=fake_client):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/tmdb/movie/603", headers=_auth_headers()
                )
    finally:
        _clear_overrides()
    assert response.status_code == 502
    assert "boom" not in response.text
