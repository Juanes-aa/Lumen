"""Clientes Supabase del backend.

Dos modos de uso:

* ``get_supabase_admin()`` — cliente singleton creado con
  ``service_role_key``. Bypassea RLS. **Solo** para operaciones de
  Auth Admin (register) y mantenimiento; nunca para queries de datos
  de usuario en endpoints protegidos.

* ``get_supabase_user(request)`` — dependency de FastAPI que crea un
  cliente per-request con ``anon_key`` y propaga el JWT del usuario
  (header ``Authorization: Bearer ...``) a PostgREST. Las políticas
  RLS evalúan ``auth.uid()`` contra el ``sub`` del JWT, garantizando
  aislamiento entre usuarios.
"""

from functools import lru_cache

from fastapi import HTTPException, Request, status
from supabase import Client, create_client

from app.config import get_settings


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Cliente con service_role_key. Bypassea RLS. Uso restringido."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


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


def get_supabase_user(request: Request) -> Client:
    """Cliente per-request con anon_key + JWT del usuario.

    PostgREST recibirá el header ``Authorization`` con el token del
    usuario, por lo que las políticas RLS aplicarán automáticamente.
    """
    settings = get_settings()
    if settings.supabase_anon_key == "":
        # Fallo de configuración: sin anon key no podemos respetar RLS.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Backend mal configurado: SUPABASE_ANON_KEY ausente",
        )

    token: str = _extract_bearer_token(request)
    client: Client = create_client(settings.supabase_url, settings.supabase_anon_key)
    # Propaga el JWT a todas las requests de PostgREST → activa RLS.
    client.postgrest.auth(token)
    return client
