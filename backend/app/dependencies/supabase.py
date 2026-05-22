"""Clientes Supabase del backend.

Dos modos de acceso:

* ``get_supabase_admin()`` — cliente **sync** con ``service_role_key``.
  Bypassea RLS. Usado por el router de Auth (GoTrue sync API) y health check.

* ``get_supabase_admin_data()`` — cliente **async** con ``service_role_key``.
  Bypassea RLS. Usado para operaciones PostgREST en background tasks.

* ``get_supabase_user(request)`` — **async generator** per-request con ``anon_key``
  + JWT del usuario propagado a PostgREST. Las políticas RLS evalúan
  ``auth.uid()`` contra el ``sub`` del JWT, garantizando aislamiento entre usuarios.
  El cliente se cierra en el bloque ``finally`` para liberar la sesión HTTP
  subyacente y evitar fugas de file descriptors bajo carga.
"""

from collections.abc import AsyncGenerator
from functools import lru_cache

from fastapi import HTTPException, Request, status
from supabase import AsyncClient, Client, create_client

from app.config import get_settings

# ── Sync admin client (GoTrue auth — métodos sync de supabase_auth) ──────────

@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Cliente sync con service_role_key. Solo para Auth Admin y health check."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


# ── Async admin client (PostgREST data — background tasks) ───────────────────

@lru_cache(maxsize=1)
def get_supabase_admin_data() -> AsyncClient:
    """Cliente async con service_role_key. Para operaciones PostgREST sin RLS.

    Singleton: NO se cierra entre requests porque es compartido por todos los
    background tasks. Su ciclo de vida es el del proceso.
    """
    settings = get_settings()
    return AsyncClient(settings.supabase_url, settings.supabase_service_role_key)


# ── Async user client (PostgREST data — endpoints protegidos por RLS) ─────────

def _extract_bearer_token(request: Request) -> str:
    auth_header: str | None = request.headers.get("authorization") or request.headers.get(
        "Authorization"
    )
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falta el header Authorization Bearer",
        )
    token: str = auth_header.split(" ", 1)[1].strip()
    if token == "":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token vacío",
        )
    return token


async def get_supabase_user(request: Request) -> AsyncGenerator[AsyncClient, None]:
    """Async generator per-request con anon_key + JWT del usuario.

    FastAPI inyecta el valor yielded (AsyncClient) en los endpoints.
    El bloque ``finally`` garantiza que la sesión HTTP subyacente se
    cierra al finalizar el request, evitando fugas de file descriptors.

    PostgREST recibirá el header ``Authorization`` con el token del
    usuario, por lo que las políticas RLS aplicarán automáticamente.
    """
    settings = get_settings()
    if settings.supabase_anon_key == "":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Backend mal configurado: SUPABASE_ANON_KEY ausente",
        )

    token: str = _extract_bearer_token(request)
    client: AsyncClient = AsyncClient(settings.supabase_url, settings.supabase_anon_key)
    client.postgrest.auth(token)
    try:
        yield client
    finally:
        await client.aclose()
