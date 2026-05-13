import json
import logging
from collections import Counter
from datetime import datetime, timezone

from groq import AsyncGroq
from supabase import Client

from app.utils.async_supabase import run_sync

logger: logging.Logger = logging.getLogger(__name__)


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
        base_prompt += (
            "\n\n--- INSTRUCCIONES DEL USUARIO ---\n"
            + user_instructions
            + "\n--- FIN DE INSTRUCCIONES ---"
        )

    if (favorite_genres and len(favorite_genres) > 0) or (reference_directors and len(reference_directors) > 0):
        prefs_block: str = "\n\n--- PREFERENCIAS DEL USUARIO ---\n"
        if favorite_genres and len(favorite_genres) > 0:
            prefs_block += f"Géneros favoritos: {', '.join(favorite_genres)}\n"
        if reference_directors and len(reference_directors) > 0:
            prefs_block += f"Directores de referencia: {', '.join(reference_directors)}\n"
        prefs_block += "--- FIN DE PREFERENCIAS ---"
        base_prompt += prefs_block

    if memory_notes and len(memory_notes) > 0:
        base_prompt += (
            "\n\n--- NOTAS DE MEMORIA DEL USUARIO ---\n"
            + "\n".join(f"- {note}" for note in memory_notes)
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
    session_id: str, supabase: Client, groq_client: AsyncGroq
) -> None:
    try:
        messages_result = await run_sync(
            lambda: supabase.table("analysis_messages")
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
            first_response = await groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": base_prompt}],
                stream=False,
            )
            raw: str = first_response.choices[0].message.content
            tags = json.loads(raw)
        except Exception:
            logger.warning(
                "extract_semantic_tags_json_retry session_id=%s", session_id
            )
            retry_prompt: str = (
                base_prompt
                + "\n\nIMPORTANT: respond with ONLY raw JSON, no text before or after."
            )
            try:
                retry_response = await groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": retry_prompt}],
                    stream=False,
                )
                raw = retry_response.choices[0].message.content
                tags = json.loads(raw)
            except Exception:
                logger.exception(
                    "extract_semantic_tags_failed session_id=%s", session_id
                )
                return

        for key, value in tags.items():
            # tag_value es jsonb: insertar el objeto Python directamente
            # (lista o string), Supabase/postgrest lo serializa a jsonb.
            await run_sync(
                lambda k=key, v=value: supabase.table("semantic_tags")
                .insert(
                    {
                        "session_id": session_id,
                        "tag_type": k,
                        "tag_value": v,
                        "confidence": 1.0,
                    }
                )
                .execute()
            )

        session_result = await run_sync(
            lambda: supabase.table("analysis_sessions")
            .select("user_id")
            .eq("id", session_id)
            .execute()
        )
        if session_result.data:
            user_id: str = str(session_result.data[0]["user_id"])
            # build_user_profile sigue siendo sync (usa supabase sync).
            # Lo lanzamos en threadpool para no bloquear el loop.
            await run_sync(lambda: build_user_profile(user_id, supabase))

    except Exception:
        logger.exception(
            "extract_semantic_tags_unexpected_error session_id=%s", session_id
        )
        return


async def generate_session_suggestions(
    movie_title: str, movie_overview: str, groq_client: AsyncGroq
) -> list[str]:
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

    async def _call_groq(user_prompt: str) -> str:
        response = await groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": user_prompt}],
            stream=False,
            temperature=0.7,
            max_tokens=600,
        )
        return response.choices[0].message.content

    try:
        raw: str = await _call_groq(prompt)
        data: dict[str, object] = json.loads(raw)
        suggestions = data.get("suggestions", [])
        if isinstance(suggestions, list) and len(suggestions) > 0:
            return [str(s) for s in suggestions[:5]]
    except Exception:
        logger.warning("generate_session_suggestions_json_retry")

    try:
        retry_prompt: str = prompt + "\n\nIMPORTANT: respond with ONLY raw JSON, no text before or after."
        raw = await _call_groq(retry_prompt)
        data = json.loads(raw)
        suggestions = data.get("suggestions", [])
        if isinstance(suggestions, list) and len(suggestions) > 0:
            return [str(s) for s in suggestions[:5]]
    except Exception:
        logger.exception("generate_session_suggestions_failed")

    return []


def _mode(values: list[str]) -> str | None:
    if not values:
        return None
    return Counter(values).most_common(1)[0][0]


def build_user_profile(user_id: str, supabase: Client) -> None:
    try:
        sessions_result = (
            supabase.table("analysis_sessions")
            .select("id")
            .eq("user_id", user_id)
            .eq("status", "closed")
            .execute()
        )
        if not sessions_result.data:
            return

        session_ids: list[str] = [s["id"] for s in sessions_result.data]
        tags_result = (
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
            # Tras la migración a jsonb, value ya es list/str/dict (no string serializado).
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

        # temas_frecuentes y directores_afines son jsonb: enviar listas
        # de pares [item, count] directamente (most_common devuelve tuplas;
        # las convertimos a listas para serializar limpio a JSON).
        profile_data: dict[str, object] = {
            "user_id": user_id,
            "temas_frecuentes": [list(pair) for pair in temas.most_common(10)],
            "directores_afines": [list(pair) for pair in directores.most_common(10)],
            "narrativa_predominante": narrativas.most_common(1)[0][0] if narrativas else None,
            "nivel_filosofico_promedio": _mode(nivel_filosofico_values),
            "total_sesiones_analizadas": len(session_ids),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        supabase.table("user_profile").upsert(profile_data, on_conflict="user_id").execute()

    except Exception:
        logger.exception(
            "build_user_profile_failed user_id=%s", user_id
        )
        return
