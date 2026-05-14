"""Handlers globales de excepciones.

Política:
- HTTPException y RequestValidationError siguen el comportamiento por defecto
  de FastAPI (no los registramos aquí).
- Cualquier otra Exception no manejada se loguea con stacktrace y se devuelve
  un 500 genérico SIN exponer `str(exc)` al cliente.

NOTA CORS: app.add_exception_handler(Exception, ...) registra el handler en
ServerErrorMiddleware, que está fuera de CORSMiddleware en la cadena ASGI.
Su `send` bypassa send_with_cors, por lo que DEBEMOS añadir los headers CORS
aquí directamente para que el navegador pueda leer la respuesta de error.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config import get_settings

logger: logging.Logger = logging.getLogger("app.errors")


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    request_id: str = getattr(request.state, "request_id", "unknown")
    logger.exception(
        "unhandled_exception request_id=%s method=%s path=%s exc_type=%s",
        request_id,
        request.method,
        request.url.path,
        type(exc).__name__,
    )
    response = JSONResponse(
        status_code=500,
        content={"detail": "Error interno", "request_id": request_id},
    )
    # ServerErrorMiddleware's send bypasses CORSMiddleware.send_with_cors,
    # so CORS headers must be added here for the browser to read this response.
    origin: str = request.headers.get("origin", "")
    if origin and origin in get_settings().get_cors_origins():
        response.headers["access-control-allow-origin"] = origin
        response.headers["access-control-allow-credentials"] = "true"
        response.headers["vary"] = "Origin"
    return response


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(Exception, unhandled_exception_handler)
