"""Middleware HTTP propio."""

from __future__ import annotations

import logging
import re
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.datastructures import MutableHeaders
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger: logging.Logger = logging.getLogger("app.request")

_SECURITY_HEADERS: list[tuple[str, str]] = [
    ("X-Content-Type-Options", "nosniff"),
    ("X-Frame-Options", "DENY"),
    # X-XSS-Protection: 0 desactiva el filtro XSS de browsers legacy (IE/old Chrome).
    # Contraintuitivo, pero la recomendación OWASP actual es desactivarlo: ese auditor
    # puede ser explotado para introducir XSS en páginas que de otro modo serían seguras
    # (CVE-2009-4074, bypass en Chrome hasta 2019). Los browsers modernos lo ignoran.
    ("X-XSS-Protection", "0"),
    ("Referrer-Policy", "strict-origin-when-cross-origin"),
    ("Permissions-Policy", "camera=(), microphone=(), geolocation=()"),
]

# Patrón válido para X-Request-ID entrante: alfanumérico + guión/guión-bajo, ≤ 64 chars.
# Cualquier valor que no lo cumpla se descarta y se genera un UUID fresco.
# Previene log injection (newlines, secuencias ANSI) y header bloat (valores de cientos de KB).
_REQUEST_ID_PATTERN: re.Pattern[str] = re.compile(r"^[a-zA-Z0-9\-_]{1,64}$")


class SecurityHeadersMiddleware:
    """ASGI middleware que inyecta security headers en cada respuesta HTTP.

    Implementado como middleware ASGI puro (no BaseHTTPMiddleware) para no
    bloquear StreamingResponse — crítico para los endpoints SSE de chat.
    Intercepta el mensaje http.response.start y añade headers antes de que
    lleguen al cliente, sin tocar el body ni bufferear el stream.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def _send_with_security_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                for name, value in _SECURITY_HEADERS:
                    headers[name] = value
            await send(message)

        await self.app(scope, receive, _send_with_security_headers)


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
        # Reusar el ID del cliente solo si pasa la allowlist estricta.
        # Un valor fuera del patrón (newlines, ANSI, payloads largos) se descarta
        # silenciosamente y se genera un UUID fresco para evitar log injection.
        if incoming and _REQUEST_ID_PATTERN.match(incoming):
            request_id: str = incoming
        else:
            request_id = uuid.uuid4().hex
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
