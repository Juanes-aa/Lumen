from dotenv import load_dotenv
load_dotenv()  # PRIMERO, antes de cualquier import propio

import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.routers.auth import router as auth_router
from app.routers.movies import router as movies_router
from app.routers.analysis import router as analysis_router
from app.routers.profile import router as profile_router
from app.routers.recommendations import router as recommendations_router
from app.routers.export import router as export_router
from app.routers.tmdb import router as tmdb_router
from app.config import get_settings, validate_critical_settings
from app.dependencies.rate_limit import limiter
from app.dependencies.supabase import get_supabase_admin_data
from app.exceptions import register_exception_handlers
from app.middleware import RequestIdMiddleware, SecurityHeadersMiddleware

# ── Sentry (opcional: solo se activa si SENTRY_DSN está definido) ─────────────
_sentry_dsn: str = os.getenv("SENTRY_DSN", "")
if _sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(),
        ],
        traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
        send_default_pii=False,
        environment=os.getenv("ENVIRONMENT", "production"),
    )

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=600,
)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(RequestIdMiddleware)
# SecurityHeadersMiddleware debe ser el último add_middleware para quedar
# como middleware más externo y así cubrir TODAS las respuestas incluyendo
# las de CORS preflight y rate-limit exceeded.
app.add_middleware(SecurityHeadersMiddleware)


@app.on_event("startup")
async def _startup_log() -> None:
    settings = get_settings()
    validate_critical_settings(settings)
    origins = settings.get_cors_origins()
    logging.getLogger(__name__).info(
        "cors_allowed_origins count=%d values=%s", len(origins), origins
    )
    # Precalentamos el singleton async para que el primer request no pague el costo.
    get_supabase_admin_data()


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
