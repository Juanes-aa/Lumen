"""Tipos estructurales (TypedDict) de las filas devueltas por Supabase.

Estos tipos reflejan el schema de la DB tras la migración 007
(jsonb en user_profile.*, recommendations.themes, semantic_tags.tag_value).

Convención:
    * Todos los campos se declaran con `NotRequired` porque los repos usan
      selects parciales (`.select("id, status")`, joins acotados, etc.) y el
      dict devuelto por Supabase sólo contiene las columnas pedidas.
    * Las columnas UUID y timestamptz se tipan como `str` (la SDK de Supabase
      no las deserializa a tipos nativos).
    * Las columnas jsonb se tipan como la forma concreta que el backend
      escribe/lee (list[str] para listas de tags, list[Any]|str|dict para
      `semantic_tags.tag_value` que es polimórfico).
    * Los joins FK-simples (`analysis_sessions.movie_id -> movies_watched`)
      vienen como dict embebido (no lista) o None si no hay fila relacionada.

Estos TypedDict no validan en runtime. Se usan sólo para anotar firmas de
repos y dar al IDE/type-checker una guía sobre qué campos están disponibles.
"""
from __future__ import annotations

from typing import Any, NotRequired, TypedDict

# ---------------------------------------------------------------------------
# Joins embebidos (movies_watched dentro de analysis_sessions)
# ---------------------------------------------------------------------------


class MovieTitleOnly(TypedDict, total=False):
    """Proyección `movies_watched(title)`."""

    title: NotRequired[str]


class MoviePosterMini(TypedDict, total=False):
    """Proyección `movies_watched(title, poster_url)`."""

    title: NotRequired[str]
    poster_url: NotRequired[str | None]


class MovieMiniWithTmdb(TypedDict, total=False):
    """Proyección `movies_watched(title, tmdb_id, poster_url, overview)`."""

    title: NotRequired[str]
    tmdb_id: NotRequired[int]
    poster_url: NotRequired[str | None]
    overview: NotRequired[str | None]


# ---------------------------------------------------------------------------
# movies_watched
# ---------------------------------------------------------------------------


class MovieWatchedRow(TypedDict, total=False):
    """Fila de `movies_watched`. Todas las columnas reales del schema."""

    id: NotRequired[str]
    user_id: NotRequired[str]
    tmdb_id: NotRequired[int]
    title: NotRequired[str]
    poster_url: NotRequired[str | None]
    watched_at: NotRequired[str]
    initial_note: NotRequired[str | None]
    genre_ids: NotRequired[list[int]]
    created_at: NotRequired[str]
    release_year: NotRequired[int | None]
    has_analysis: NotRequired[bool]


class MovieWatchedMini(TypedDict, total=False):
    """Proyección `id, title, tmdb_id, poster_url` usada por get_watched_by_id."""

    id: NotRequired[str]
    title: NotRequired[str]
    tmdb_id: NotRequired[int]
    poster_url: NotRequired[str | None]


# ---------------------------------------------------------------------------
# analysis_sessions
# ---------------------------------------------------------------------------


class AnalysisSessionRow(TypedDict, total=False):
    """Fila base de `analysis_sessions`."""

    id: NotRequired[str]
    user_id: NotRequired[str]
    movie_id: NotRequired[str]
    status: NotRequired[str]
    started_at: NotRequired[str]
    closed_at: NotRequired[str | None]


class AnalysisSessionWithMovieRow(AnalysisSessionRow, total=False):
    """Sesión completa + join `movies_watched(title, tmdb_id, poster_url, overview)`."""

    movies_watched: NotRequired[MovieMiniWithTmdb | None]


class AnalysisSessionListItemRow(AnalysisSessionRow, total=False):
    """Sesión + join `movies_watched(title, poster_url)` (listado de historial)."""

    movies_watched: NotRequired[MoviePosterMini | None]


class AnalysisSessionRecentRow(TypedDict, total=False):
    """Proyección `id, movie_id, movies_watched(title)` para sesiones recientes."""

    id: NotRequired[str]
    movie_id: NotRequired[str]
    movies_watched: NotRequired[MovieTitleOnly | None]


class SessionStatusRow(TypedDict, total=False):
    """Proyección `id, status`."""

    id: NotRequired[str]
    status: NotRequired[str]


# ---------------------------------------------------------------------------
# analysis_messages
# ---------------------------------------------------------------------------


class AnalysisMessageRow(TypedDict, total=False):
    """Fila de `analysis_messages`."""

    id: NotRequired[str]
    session_id: NotRequired[str]
    role: NotRequired[str]  # 'user' | 'assistant'
    content: NotRequired[str]
    created_at: NotRequired[str]


class AnalysisMessageHistoryRow(TypedDict, total=False):
    """Proyección `role, content` para alimentar al LLM."""

    role: NotRequired[str]
    content: NotRequired[str]


# ---------------------------------------------------------------------------
# semantic_tags
# ---------------------------------------------------------------------------

# tag_value es jsonb polimórfico: lista para 'temas_principales', string en
# otros tag_types, y potencialmente dict en extensiones futuras.
TagValue = list[Any] | dict[str, Any] | str


class SemanticTagRow(TypedDict, total=False):
    """Fila de `semantic_tags`."""

    id: NotRequired[str]
    session_id: NotRequired[str]
    tag_type: NotRequired[str]
    tag_value: NotRequired[TagValue]
    confidence: NotRequired[float]


# ---------------------------------------------------------------------------
# user_profile (post-007: profile_data dropped; listas en jsonb)
# ---------------------------------------------------------------------------


class UserProfileRow(TypedDict, total=False):
    """Fila de `user_profile` tras la migración 007."""

    id: NotRequired[str]
    user_id: NotRequired[str]
    updated_at: NotRequired[str]
    temas_frecuentes: NotRequired[list[str]]
    directores_afines: NotRequired[list[str]]
    favorite_genres: NotRequired[list[str]]
    reference_directors: NotRequired[list[str]]
    narrativa_predominante: NotRequired[str | None]
    nivel_filosofico_promedio: NotRequired[str | None]
    total_sesiones_analizadas: NotRequired[int]
    instructions: NotRequired[str | None]


class UserPreferencesRow(TypedDict, total=False):
    """Proyección `favorite_genres, reference_directors`."""

    favorite_genres: NotRequired[list[str]]
    reference_directors: NotRequired[list[str]]


class UserInstructionsRow(TypedDict, total=False):
    """Proyección `instructions`."""

    instructions: NotRequired[str | None]


class UserPromptContextRow(TypedDict, total=False):
    """Proyección `instructions, favorite_genres, reference_directors`."""

    instructions: NotRequired[str | None]
    favorite_genres: NotRequired[list[str]]
    reference_directors: NotRequired[list[str]]


# ---------------------------------------------------------------------------
# user_memory
# ---------------------------------------------------------------------------


class UserMemoryRow(TypedDict, total=False):
    """Fila de `user_memory`."""

    id: NotRequired[str]
    user_id: NotRequired[str]
    content: NotRequired[str]
    created_at: NotRequired[str]


# ---------------------------------------------------------------------------
# recommendations (post-007: themes jsonb; sin common_themes)
# ---------------------------------------------------------------------------


class RecommendationRow(TypedDict, total=False):
    """Fila de `recommendations` tras la migración 007."""

    id: NotRequired[str]
    user_id: NotRequired[str]
    tmdb_id: NotRequired[int]
    reason: NotRequired[str]
    themes: NotRequired[list[str]]
    seen: NotRequired[bool]
    status: NotRequired[str]  # 'active' | 'dismissed'
    created_at: NotRequired[str]
    title: NotRequired[str | None]
    poster_url: NotRequired[str | None]
