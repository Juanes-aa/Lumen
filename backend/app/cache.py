"""Caché en memoria para respuestas LLM frecuentes.

Usa TTLCache de cachetools (ya en requirements.txt) para reducir llamadas
a Groq en operaciones deterministas por entrada (como sugerencias por película).

El caché es process-local. Con múltiples workers cada proceso tiene su propia
instancia — los ahorros son proporcionales al tráfico por worker.
"""
from __future__ import annotations

import hashlib

from cachetools import TTLCache

# Caché de sugerencias: (hash del título + sinopsis) → list[str]
# TTL 24h — las sugerencias de una misma película son estables.
# maxsize 500 → ~500 películas distintas en memoria (negligible).
_suggestion_cache: TTLCache[str, list[str]] = TTLCache(maxsize=500, ttl=86_400)


def _suggestion_key(movie_title: str, movie_overview: str) -> str:
    content = f"{movie_title}|{movie_overview[:500]}"
    return hashlib.sha256(content.encode()).hexdigest()


def get_cached_suggestions(movie_title: str, movie_overview: str) -> list[str] | None:
    """Devuelve sugerencias cacheadas o None si no hay entrada válida."""
    return _suggestion_cache.get(_suggestion_key(movie_title, movie_overview))


def cache_suggestions(movie_title: str, movie_overview: str, suggestions: list[str]) -> None:
    """Almacena sugerencias en caché. Solo llamar con listas no vacías."""
    _suggestion_cache[_suggestion_key(movie_title, movie_overview)] = suggestions


def suggestion_cache_info() -> dict[str, int]:
    """Métricas del caché para health checks o logging."""
    return {
        "size": len(_suggestion_cache),
        "maxsize": _suggestion_cache.maxsize,
        "ttl": int(_suggestion_cache.ttl),
    }
