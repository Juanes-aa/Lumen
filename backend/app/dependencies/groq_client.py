from functools import lru_cache

from groq import AsyncGroq

from app.config import get_settings


@lru_cache(maxsize=1)
def get_groq_client() -> AsyncGroq:
    """Cliente Groq async. AsyncGroq permite `await create(...)` y
    `async for chunk in stream` sin bloquear el event loop, lo que es
    crítico para el endpoint SSE de streaming.
    """
    return AsyncGroq(api_key=get_settings().groq_api_key)
