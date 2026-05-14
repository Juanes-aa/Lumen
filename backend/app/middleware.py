"""Middleware HTTP propio."""

from __future__ import annotations

import logging
import time
import uuid

from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Receive, Scope, Send

logger: logging.Logger = logging.getLogger("app.request")


class RequestIdMiddleware:
    """Asigna un `request_id` (uuid4) a `scope['state']` y loguea
    método, path, status y duración al final de cada request.

    Si la request entrante trae header `X-Request-ID`, se reusa; si no, se
    genera uno nuevo. El id se devuelve en la respuesta como `X-Request-ID`.

    Implementado como middleware ASGI puro (sin BaseHTTPMiddleware) para no
    bloquear ni bufferizar respuestas streaming (SSE).
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        raw_headers: dict[bytes, bytes] = dict(scope.get("headers", []))
        incoming: str | None = raw_headers.get(b"x-request-id", b"").decode() or None
        request_id: str = incoming or uuid.uuid4().hex

        # scope["state"] es un dict plano inicializado por ServerErrorMiddleware;
        # request.state.request_id lo lee vía State(scope["state"]).
        if "state" not in scope:
            scope["state"] = {}
        scope["state"]["request_id"] = request_id

        start: float = time.perf_counter()
        status_code: int = 500

        async def send_with_id(message: dict) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                if "headers" not in message:
                    message["headers"] = []
                MutableHeaders(headers=message["headers"])["X-Request-ID"] = request_id
            elif message["type"] == "http.response.body" and not message.get("more_body", False):
                duration_ms: float = (time.perf_counter() - start) * 1000.0
                logger.info(
                    "request_done request_id=%s method=%s path=%s status=%d duration_ms=%.2f",
                    request_id,
                    scope.get("method", "?"),
                    scope.get("path", "?"),
                    status_code,
                    duration_ms,
                )
            await send(message)

        try:
            await self.app(scope, receive, send_with_id)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000.0
            logger.exception(
                "request_failed request_id=%s method=%s path=%s duration_ms=%.2f",
                request_id,
                scope.get("method", "?"),
                scope.get("path", "?"),
                duration_ms,
            )
            raise
