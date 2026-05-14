"""Middleware HTTP propio."""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger: logging.Logger = logging.getLogger("app.request")


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Asigna un `request_id` (uuid4) a `request.state` y loguea
    método, path, status y duración al final de cada request.

    Si la request entrante trae header `X-Request-ID`, se reusa; si no, se
    genera uno nuevo. El id se devuelve en la respuesta como `X-Request-ID`.
    """

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        incoming: str | None = request.headers.get("X-Request-ID")
        request_id: str = incoming or uuid.uuid4().hex
        request.state.request_id = request_id

        start: float = time.perf_counter()
        response: Response
        try:
            response = await call_next(request)
        except Exception:
            duration_ms: float = (time.perf_counter() - start) * 1000.0
            logger.exception(
                "request_failed request_id=%s method=%s path=%s duration_ms=%.2f",
                request_id,
                request.method,
                request.url.path,
                duration_ms,
            )
            raise

        duration_ms = (time.perf_counter() - start) * 1000.0
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request_done request_id=%s method=%s path=%s status=%d duration_ms=%.2f",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
        return response
