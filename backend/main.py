from dotenv import load_dotenv
load_dotenv()  # PRIMERO, antes de cualquier import propio

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
from app.config import get_settings, validate_critical_settings
from app.dependencies.rate_limit import limiter
from app.dependencies.supabase import get_supabase_admin
from app.exceptions import register_exception_handlers
from app.middleware import RequestIdMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(title="Lumen API")


@app.on_event("startup")
def _validate_config_on_startup() -> None:
    # Falla rápido al arrancar el servidor si falta una variable crítica.
    # Se ejecuta cuando uvicorn dispara el lifespan; los tests con
    # ASGITransport no levantan lifespan por defecto, así que no se ven
    # afectados (validación cubierta por tests unitarios directos).
    validate_critical_settings(get_settings())

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

# Orden de middlewares: el último añadido es el más externo. Queremos que
# RequestIdMiddleware envuelva todo (asigna request_id antes de cualquier
# otro middleware/handler), por lo tanto se añade al final.
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIdMiddleware)

app.include_router(auth_router)
app.include_router(movies_router)
app.include_router(analysis_router)
app.include_router(profile_router)
app.include_router(recommendations_router)
app.include_router(export_router)
app.include_router(tmdb_router)

@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
async def health_db_check() -> dict[str, str]:
    from app.utils.async_supabase import run_sync
    client: Client = get_supabase_admin()
    await run_sync(lambda: client.table("profiles").select("id").limit(1).execute())
    return {"status": "ok", "db": "connected"}