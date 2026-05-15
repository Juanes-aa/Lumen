from dotenv import load_dotenv
load_dotenv()  # PRIMERO, antes de cualquier import propio

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Receive, Scope, Send
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from supabase import Client

from app.routers.auth import router as auth_router
from app.routers.movies import router as movies_router
from app.routers.analysis import router as analysis_router
from app.routers.profile import router as profile_router
from app.routers.recommendations import router as recommendations_router
from app.routers.export import router as export_router
from app.routers.tmdb import router as tmdb_router
from app.config import get_settings
from app.dependencies.rate_limit import limiter
from app.dependencies.supabase import get_supabase_admin
from app.exceptions import register_exception_handlers
from app.middleware import RequestIdMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(title="Lumen API")

app.state.limiter = limiter


def _rate_limit_exceeded_handler(request: Request, exc: Exception) -> JSONResponse:
    detail: str = "Demasiadas solicitudes. Intenta de nuevo más tarde."
    if isinstance(exc, RateLimitExceeded):
        detail = f"Límite de solicitudes excedido: {exc.detail}"
    request_id: str = getattr(request.state, "request_id", "unknown")
    response = JSONResponse(
        status_code=429,
        content={
            "detail": detail,
            "error": "rate_limit_exceeded",
            "request_id": request_id,
        },
    )
    response.headers["X-Request-ID"] = request_id
    return response


app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
register_exception_handlers(app)

class CORSMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope["headers"])
        origin: str = headers.get(b"origin", b"").decode()
        allowed: list[str] = get_settings().get_cors_origins()
        is_allowed: bool = origin in allowed

        if scope["method"] == "OPTIONS" and is_allowed:
            request_headers: str = headers.get(
                b"access-control-request-headers", b"authorization, content-type"
            ).decode()
            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": [
                    (b"access-control-allow-origin", origin.encode()),
                    (b"access-control-allow-credentials", b"true"),
                    (b"access-control-allow-methods", b"GET, POST, PUT, PATCH, DELETE, OPTIONS"),
                    (b"access-control-allow-headers", request_headers.encode()),
                    (b"access-control-max-age", b"600"),
                    (b"content-length", b"0"),
                ],
            })
            await send({"type": "http.response.body", "body": b""})
            return

        if not is_allowed:
            await self.app(scope, receive, send)
            return

        async def send_with_cors(message: dict) -> None:
            if message["type"] == "http.response.start":
                mutable = MutableHeaders(scope=message)
                mutable["access-control-allow-origin"] = origin
                mutable["access-control-allow-credentials"] = "true"
                mutable["vary"] = "Origin"
            await send(message)

        await self.app(scope, receive, send_with_cors)


app.add_middleware(CORSMiddleware)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(RequestIdMiddleware)

@app.on_event("startup")
async def _startup_log() -> None:
    origins = get_settings().get_cors_origins()
    logging.getLogger(__name__).info(
        "cors_allowed_origins count=%d values=%s", len(origins), origins
    )


app.include_router(auth_router)
app.include_router(movies_router)
app.include_router(analysis_router)
app.include_router(profile_router)
app.include_router(recommendations_router)
app.include_router(export_router)
app.include_router(tmdb_router)

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def health_db_check() -> dict[str, str]:
    client: Client = get_supabase_admin()
    client.table("profiles").select("id").limit(1).execute()
    return {"status": "ok", "db": "connected"}