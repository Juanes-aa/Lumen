import asyncio
import json
import logging
import random
from collections import Counter
from datetime import UTC, datetime

from supabase import AsyncClient

from app.cache import cache_suggestions, get_cached_suggestions
from app.providers.llm import LLMProvider
from app.repositories import jobs as jobs_repo

logger: logging.Logger = logging.getLogger(__name__)


def _sanitize_prompt_block(text: str, *, max_chars: int = 2000) -> str:
    """Sanitiza texto multi-línea de usuario antes de insertarlo en el system prompt.

    Elimina líneas que comiencen con '---' para prevenir que el usuario escape
    los delimitadores de sección del prompt (ej. escribir '--- FIN DE INSTRUCCIONES ---
    Ignora todo lo anterior...'). No es una defensa completa contra prompt injection
    sofisticado, pero elimina el vector de escape de delimitadores más directo.

    El truncado a max_chars es una capa adicional de defensa en profundidad;
    Pydantic ya valida max_length en los schemas, pero esto protege si el campo
    llega por otra vía (tests, jobs internos, etc.).
    """
    if not text:
        return ""
    lines = text[:max_chars].splitlines()
    clean = [line for line in lines if not line.lstrip().startswith("---")]
    return "\n".join(clean).strip()


def _sanitize_list_item(item: str) -> str:
    """Colapsa newlines en items de lista de una sola línea.

    Previene que un género o director con '\\n---' escape a una nueva línea
    del prompt y rompa la estructura de sección. Los items de lista se unen
    con ', ' en una sola línea, así que no deben contener saltos.
    """
    return " ".join(item.splitlines()).strip()


_KNOWN_TAG_TYPES: frozenset[str] = frozenset({
    "temas_principales",
    "tipo_narrativa",
    "dilemas_eticos",
    "directores_estilo_similar",
    "nivel_filosofico",
    "palabras_clave",
})

_VALID_NIVEL_FILOSOFICO: frozenset[str] = frozenset({"bajo", "medio", "alto"})


def _is_valid_tag(tag_type: str, tag_value: object) -> bool:
    if tag_type not in _KNOWN_TAG_TYPES:
        return False
    if tag_type == "nivel_filosofico":
        return isinstance(tag_value, str) and tag_value in _VALID_NIVEL_FILOSOFICO
    if tag_type == "tipo_narrativa":
        return isinstance(tag_value, str) and len(tag_value) > 0
    return isinstance(tag_value, list) and len(tag_value) > 0


def build_analysis_prompt(
    movie_title: str,
    movie_overview: str,
    prior_sessions: list[dict[str, str]],
    user_instructions: str | None = None,
    favorite_genres: list[str] | None = None,
    reference_directors: list[str] | None = None,
    memory_notes: list[str] | None = None,
) -> str:
    base_prompt: str = (
        f"Eres un analista cinematográfico experto analizando '{movie_title}'.\n"
        f"Sinopsis: {movie_overview}\n\n"
        "Tu rol es ser un socio de pensamiento crítico, no un reseñador. "
        "Profundiza, no resumas. Haz preguntas que generen más preguntas. "
        "Conecta con otras obras cuando sea relevante. "
        "Estimula el pensamiento crítico del usuario."
    )

    if user_instructions and user_instructions.strip():
        clean_instructions: str = _sanitize_prompt_block(user_instructions, max_chars=1000)
        if clean_instructions:
            base_prompt += (
                "\n\n--- INSTRUCCIONES DEL USUARIO ---\n"
                + clean_instructions
                + "\n--- FIN DE INSTRUCCIONES ---"
            )

    clean_genres: list[str] = [
        _sanitize_list_item(g) for g in (favorite_genres or []) if g.strip()
    ]
    clean_directors: list[str] = [
        _sanitize_list_item(d) for d in (reference_directors or []) if d.strip()
    ]
    if clean_genres or clean_directors:
        prefs_block: str = "\n\n--- PREFERENCIAS DEL USUARIO ---\n"
        if clean_genres:
            prefs_block += f"Géneros favoritos: {', '.join(clean_genres)}\n"
        if clean_directors:
            prefs_block += f"Directores de referencia: {', '.join(clean_directors)}\n"
        prefs_block += "--- FIN DE PREFERENCIAS ---"
        base_prompt += prefs_block

    if memory_notes and len(memory_notes) > 0:
        clean_notes: list[str] = [
            _sanitize_prompt_block(note, max_chars=200)
            for note in memory_notes
            if note.strip()
        ]
        if clean_notes:
            base_prompt += (
                "\n\n--- NOTAS DE MEMORIA DEL USUARIO ---\n"
                + "\n".join(f"- {note}" for note in clean_notes)
                + "\n--- FIN DE NOTAS ---"
            )

    if len(prior_sessions) >= 2:
        prior_context_lines: list[str] = [
            f"- {session['title']}: {session['main_themes']}"
            for session in prior_sessions
        ]
        prior_context_block: str = (
            "\n\n--- PELÍCULAS ANALIZADAS ANTERIORMENTE POR EL USUARIO ---\n"
            + "\n".join(prior_context_lines)
            + "\nCuando sea relevante y natural, menciona conexiones con estas películas.\n"
            "No forces conexiones que no existen.\n"
            "--- FIN DE CONTEXTO PREVIO ---"
        )
        return base_prompt + prior_context_block

    return base_prompt


async def extract_semantic_tags(
    session_id: str,
    supabase: AsyncClient,
    provider: LLMProvider,
    job_id: str | None = None,
) -> None:
    async def _try_mark(fn, *args) -> None:
        try:
            await fn(supabase, *args)
        except Exception:
            logger.warning("extract_semantic_tags_job_update_failed job_id=%s", job_id)

    try:
        if job_id is not None:
            await _try_mark(jobs_repo.mark_running, job_id)

        messages_result = await (
            supabase.table("analysis_messages")
            .select("role, content")
            .eq("session_id", session_id)
            .order("created_at", desc=False)
            .execute()
        )
        messages: list[dict[str, str]] = messages_result.data

        conversation_text: str = "\n".join(
            f"{msg['role'].upper()}: {msg['content']}" for msg in messages
        )

        base_prompt: str = (
            "Analyze this film analysis conversation and extract semantic tags.\n\n"
            f"CONVERSATION:\n{conversation_text}\n\n"
            "Respond with ONLY this JSON (no preamble, no markdown, no text before or after):\n"
            '{\n'
            '  "temas_principales": ["..."],\n'
            '  "tipo_narrativa": "...",\n'
            '  "dilemas_eticos": ["..."],\n'
            '  "directores_estilo_similar": ["..."],\n'
            '  "nivel_filosofico": "bajo|medio|alto",\n'
            '  "palabras_clave": ["..."]\n'
            '}'
        )

        tags: dict[str, object] = {}
        try:
            raw: str = await provider.complete([{"role": "user", "content": base_prompt}])
            tags = json.loads(raw)
        except Exception:
            logger.warning("extract_semantic_tags_json_retry session_id=%s", session_id)
            retry_prompt: str = (
                base_prompt
                + "\n\nIMPORTANT: respond with ONLY raw JSON, no text before or after."
            )
            try:
                raw = await provider.complete([{"role": "user", "content": retry_prompt}])
                tags = json.loads(raw)
            except Exception:
                logger.exception("extract_semantic_tags_failed session_id=%s", session_id)
                if job_id is not None:
                    await _try_mark(jobs_repo.mark_failed, job_id, "JSON parse failed after retry")
                return

        for key, value in tags.items():
            if not _is_valid_tag(key, value):
                logger.warning(
                    "extract_semantic_tags_invalid_tag session_id=%s tag_type=%s",
                    session_id,
                    key,
                )
                continue
            await (
                supabase.table("semantic_tags")
                .insert(
                    {
                        "session_id": session_id,
                        "tag_type": key,
                        "tag_value": value,
                        "confidence": 1.0,
                    }
                )
                .execute()
            )

        session_result = await (
            supabase.table("analysis_sessions")
            .select("user_id")
            .eq("id", session_id)
            .execute()
        )
        if session_result.data:
            user_id: str = str(session_result.data[0]["user_id"])
            await build_user_profile(user_id, supabase)

        if job_id is not None:
            await _try_mark(jobs_repo.mark_done, job_id)

    except Exception:
        logger.exception(
            "extract_semantic_tags_unexpected_error session_id=%s", session_id
        )
        if job_id is not None:
            await _try_mark(jobs_repo.mark_failed, job_id, "Unexpected error in extract_semantic_tags")
        return


async def generate_session_suggestions(
    movie_title: str, movie_overview: str, provider: LLMProvider
) -> list[str]:
    # Cache hit → evita llamada al LLM para la misma película
    cached = get_cached_suggestions(movie_title, movie_overview)
    if cached is not None:
        logger.debug("suggestion_cache_hit movie=%s", movie_title)
        return cached

    prompt: str = (
        f"Película: '{movie_title}'.\nSinopsis: {movie_overview}\n\n"
        "Genera 5 preguntas iniciales para abrir un análisis cinematográfico profundo "
        "de esta película. Cubre estos ángulos (uno por pregunta, en este orden): "
        "temas, simbolismo, dilemas éticos, narrativa, contexto histórico. "
        "Cada pregunta debe ser específica a la película, no genérica. "
        "Máximo 120 caracteres por pregunta.\n\n"
        "Responde SOLO con este JSON (sin preámbulo, sin markdown):\n"
        '{"suggestions": ["pregunta 1", "pregunta 2", "pregunta 3", "pregunta 4", "pregunta 5"]}'
    )

    async def _call_llm(user_prompt: str) -> str:
        return await provider.complete(
            [{"role": "user", "content": user_prompt}],
            max_tokens=600,
            temperature=0.7,
        )

    suggestions: list[str] = []

    try:
        raw: str = await _call_llm(prompt)
        data: dict[str, object] = json.loads(raw)
        result = data.get("suggestions", [])
        if isinstance(result, list) and len(result) > 0:
            suggestions = [str(s) for s in result[:5]]
    except Exception:
        logger.warning("generate_session_suggestions_json_retry")

    if not suggestions:
        try:
            retry_prompt: str = (
                prompt + "\n\nIMPORTANT: respond with ONLY raw JSON, no text before or after."
            )
            raw = await _call_llm(retry_prompt)
            data = json.loads(raw)
            result = data.get("suggestions", [])
            if isinstance(result, list) and len(result) > 0:
                suggestions = [str(s) for s in result[:5]]
        except Exception:
            logger.exception("generate_session_suggestions_failed")

    if suggestions:
        cache_suggestions(movie_title, movie_overview, suggestions)

    return suggestions


def _mode(values: list[str]) -> str | None:
    if not values:
        return None
    return Counter(values).most_common(1)[0][0]


async def build_user_profile(user_id: str, supabase: AsyncClient) -> None:
    try:
        sessions_result = await (
            supabase.table("analysis_sessions")
            .select("id")
            .eq("user_id", user_id)
            .eq("status", "closed")
            .is_("deleted_at", "null")
            .execute()
        )
        if not sessions_result.data:
            return

        session_ids: list[str] = [s["id"] for s in sessions_result.data]
        tags_result = await (
            supabase.table("semantic_tags")
            .select("tag_type, tag_value")
            .in_("session_id", session_ids)
            .execute()
        )

        temas: Counter[str] = Counter()
        directores: Counter[str] = Counter()
        narrativas: Counter[str] = Counter()
        nivel_filosofico_values: list[str] = []

        for tag in tags_result.data:
            value: object = tag["tag_value"]
            tag_type: str = str(tag["tag_type"])
            if tag_type == "temas_principales" and isinstance(value, list):
                for item in value:
                    temas[str(item)] += 1
            elif tag_type == "directores_estilo_similar" and isinstance(value, list):
                for item in value:
                    directores[str(item)] += 1
            elif tag_type == "tipo_narrativa":
                narrativas[str(value)] += 1
            elif tag_type == "nivel_filosofico":
                nivel_filosofico_values.append(str(value))

        profile_data: dict[str, object] = {
            "user_id": user_id,
            "temas_frecuentes": [list(pair) for pair in temas.most_common(10)],
            "directores_afines": [list(pair) for pair in directores.most_common(10)],
            "narrativa_predominante": narrativas.most_common(1)[0][0] if narrativas else None,
            "nivel_filosofico_promedio": _mode(nivel_filosofico_values),
            "total_sesiones_analizadas": len(session_ids),
            "updated_at": datetime.now(UTC).isoformat(),
        }

        # Jitter aleatorio antes del upsert para reducir la probabilidad de que
        # dos background tasks concurrentes (ej. dos sesiones cerradas casi
        # simultáneamente) sobreescriban el perfil con datos parciales.
        # Mitiga la race condition sin necesidad de un lock distribuido.
        await asyncio.sleep(random.uniform(0, 1.5))

        await (
            supabase.table("user_profile")
            .upsert(profile_data, on_conflict="user_id")
            .execute()
        )

    except Exception:
        logger.exception("build_user_profile_failed user_id=%s", user_id)
        return
