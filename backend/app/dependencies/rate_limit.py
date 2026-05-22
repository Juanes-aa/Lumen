"""Rate limiter compartido (slowapi).

Habilitado por defecto. Desactivar con RATE_LIMIT_ENABLED=false (tests).

Storage:
  - Si REDIS_URL está configurado, usa Redis. Obligatorio para despliegues
    con >1 worker (de lo contrario cada proceso tiene su propio bucket y el
    límite efectivo es N_workers × límite_configurado).
  - Sin REDIS_URL, usa memoria del proceso (válido para 1 worker en Render).

Key functions:
  - get_remote_address  — por IP, para endpoints públicos (auth).
  - get_user_id_or_ip   — por user_id JWT para endpoints autenticados;
                          si el token no se puede decodificar, cae a IP.
                          La validación real de firma sigue en get_current_user_id;
                          aquí solo se decodifica sin verificar para obtener sub.
"""

from __future__ import annotations

import jwt as pyjwt
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings


def get_user_id_or_ip(request: Request) -> str:
    """Key func para endpoints autenticados.

    Decodifica el JWT sin verificar firma para extraer `sub` (user_id).
    Si falla (token ausente, malformado, etc.) cae a IP como fallback.
    """
    auth: str = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        token: str = auth[7:]
        try:
            payload: dict = pyjwt.decode(
                token,
                options={"verify_signature": False},
                algorithms=["ES256", "HS256"],
            )
            sub: str | None = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
    return get_remote_address(request)


def _make_limiter() -> Limiter:
    settings = get_settings()
    kwargs: dict = {
        "key_func": get_remote_address,
        "enabled": settings.rate_limit_enabled,
        "default_limits": [],
    }
    if settings.redis_url:
        kwargs["storage_uri"] = settings.redis_url
    return Limiter(**kwargs)


limiter: Limiter = _make_limiter()
