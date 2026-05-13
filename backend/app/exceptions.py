"""Handlers globales de excepciones.

Política:
- HTTPException y RequestValidationError siguen el comportamiento por defecto
  de FastAPI (no los registramos aquí).
- Cualquier otra Exception no manejada se loguea con stacktrace y se devuelve
  un 500 genérico SIN exponer `str(exc)` al cliente.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

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
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno", "request_id": request_id},
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(Exception, unhandled_exception_handler)
