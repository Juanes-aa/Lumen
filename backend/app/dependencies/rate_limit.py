"""Rate limiter compartido (slowapi).

Por defecto está habilitado. Se puede desactivar con la env var
`RATE_LIMIT_ENABLED=false` (útil para tests). El key_func usa la IP remota;
si en el futuro queremos limitar por user_id autenticado, se puede sustituir
por una función que lea `request.state.user_id`.
"""

from __future__ import annotations

import os

from slowapi import Limiter
from slowapi.util import get_remote_address


def _is_enabled() -> bool:
    raw: str = os.getenv("RATE_LIMIT_ENABLED", "true").strip().lower()
    return raw not in ("0", "false", "no", "off")


limiter: Limiter = Limiter(
    key_func=get_remote_address,
    enabled=_is_enabled(),
    default_limits=[],
)
