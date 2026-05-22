from functools import lru_cache

import httpx
from groq import AsyncGroq

from app.config import get_settings


@lru_cache(maxsize=1)
def get_groq_client() -> AsyncGroq:
    """Cliente Groq async con timeouts explícitos.

    read=60s cubre respuestas largas en streaming SSE.
    connect=5s falla rápido si Groq no responde en el handshake.
    """
    return AsyncGroq(
        api_key=get_settings().groq_api_key,
        timeout=httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0),
    )
