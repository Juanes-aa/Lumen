"""Proxy de TMDB.

El frontend NO debe llamar directamente a TMDB porque eso obligaría a
exponer la API key en el bundle público (cualquier visitante la
extraería con DevTools). Este router actúa como proxy autenticado: el
backend mantiene la key en `TMDB_API_KEY` y reenvía únicamente los dos
endpoints que la UI necesita.
"""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.config import get_settings
from app.dependencies.auth import get_current_user_id
from app.dependencies.rate_limit import limiter

logger: logging.Logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tmdb", tags=["tmdb"])

_TMDB_BASE_URL = "https://api.themoviedb.org/3"
_HTTP_TIMEOUT_SECONDS = 8.0


async def _tmdb_get(path: str, params: dict[str, str]) -> dict[str, object]:
    """Llama a TMDB y devuelve el JSON. La api_key se inyecta aquí; el
    caller nunca la ve. Cualquier fallo se loguea y se reemite como
    HTTPException sin filtrar detalles internos.
    """
    api_key: str = get_settings().tmdb_api_key
    if api_key == "":
        # Falla limpia si está mal configurado en lugar de exponer 500
        # genérico con stack trace.
        logger.error("tmdb_proxy_misconfigured: TMDB_API_KEY ausente")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio TMDB no disponible",
        )

    # Copia para no mutar dict del caller; api_key NUNCA viaja en
    # respuestas hacia el cliente, solo en la request saliente.
    outgoing: dict[str, str] = {**params, "api_key": api_key}

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT_SECONDS) as client:
            resp = await client.get(f"{_TMDB_BASE_URL}{path}", params=outgoing)
    except httpx.HTTPError as exc:
        logger.warning("tmdb_proxy_network_error path=%s err=%s", path, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="TMDB no respondió",
        ) from exc

    if resp.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurso no encontrado en TMDB",
        )
    if resp.status_code >= 400:
        logger.warning(
            "tmdb_proxy_upstream_error path=%s status=%s", path, resp.status_code
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="TMDB devolvió un error",
        )

    try:
        data: object = resp.json()
    except ValueError as exc:
        logger.warning("tmdb_proxy_invalid_json path=%s", path)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Respuesta TMDB inválida",
        ) from exc

    if not isinstance(data, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Respuesta TMDB inválida",
        )
    return data


@router.get("/search")
@limiter.limit("30/minute")
async def search_movies(
    request: Request,
    q: str = Query(..., min_length=2, max_length=100, description="Texto de búsqueda"),
    _user_id: str = Depends(get_current_user_id),
) -> dict[str, object]:
    """Búsqueda de películas. Proxy de `/3/search/movie`."""
    return await _tmdb_get(
        "/search/movie",
        {"query": q, "language": "es-ES"},
    )


@router.get("/movie/{tmdb_id}")
@limiter.limit("60/minute")
async def get_movie(
    request: Request,
    tmdb_id: int,
    _user_id: str = Depends(get_current_user_id),
) -> dict[str, object]:
    """Detalle de película + créditos. Proxy de `/3/movie/{id}`."""
    if tmdb_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="tmdb_id debe ser un entero positivo",
        )
    return await _tmdb_get(
        f"/movie/{tmdb_id}",
        {"language": "es-ES", "append_to_response": "credits"},
    )
