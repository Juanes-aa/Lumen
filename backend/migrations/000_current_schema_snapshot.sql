-- =====================================================================
-- 000_current_schema_snapshot.sql
-- =====================================================================
-- DOCUMENTAL — NO EJECUTAR.
--
-- Snapshot del schema `public` de Supabase tal como existe HOY,
-- antes de las migraciones 005+ (índices, FKs explícitas, jsonb,
-- paginación, RLS).
--
-- Fuente: information_schema.columns + pg_indexes +
--         information_schema.table_constraints (ejecutado en
--         Supabase SQL Editor, fase 0 del plan de DB).
--
-- Notas:
--   * Las FKs cuyo `foreign_table_name` aparecía como NULL apuntan a
--     `auth.users(id)` (schema `auth` de Supabase, fuera de `public`,
--     por eso no aparece en el join contra information_schema).
--   * Todas las FKs ya tienen ON DELETE CASCADE.
--   * No hay índices secundarios; sólo PKs y UNIQUEs.
--   * Hay redundancias detectadas, marcadas con `-- REDUNDANCIA:`.
-- =====================================================================


-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
CREATE TABLE profiles (
    id          uuid        NOT NULL,
    username    text,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT profiles_pkey    PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id)
        REFERENCES auth.users(id) ON DELETE CASCADE
);


-- ---------------------------------------------------------------------
-- movies_watched
-- ---------------------------------------------------------------------
CREATE TABLE movies_watched (
    id            uuid        NOT NULL DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL,
    tmdb_id       integer     NOT NULL,
    title         text        NOT NULL,
    poster_url    text,
    watched_at    timestamptz NOT NULL DEFAULT now(),
    initial_note  text,
    genre_ids     integer[]            DEFAULT '{}'::integer[],
    created_at    timestamptz NOT NULL DEFAULT now(),
    release_year  integer,
    has_analysis  boolean     NOT NULL DEFAULT false,

    CONSTRAINT movies_watched_pkey         PRIMARY KEY (id),
    CONSTRAINT movies_watched_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE,

    -- REDUNDANCIA: dos UNIQUE constraints sobre (user_id, tmdb_id).
    --   Uno proviene de la creación original (auto), el otro de
    --   migrations/001_add_genre_ids_and_unique_constraint.sql.
    --   Plan: dropear `movies_watched_user_tmdb_unique` en Fase 1.
    CONSTRAINT movies_watched_user_id_tmdb_id_key UNIQUE (user_id, tmdb_id),
    CONSTRAINT movies_watched_user_tmdb_unique    UNIQUE (user_id, tmdb_id)
);


-- ---------------------------------------------------------------------
-- analysis_sessions
-- ---------------------------------------------------------------------
CREATE TABLE analysis_sessions (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL,
    movie_id    uuid        NOT NULL,
    status      text        NOT NULL DEFAULT 'active'::text,
    started_at  timestamptz NOT NULL DEFAULT now(),
    closed_at   timestamptz,

    CONSTRAINT analysis_sessions_pkey         PRIMARY KEY (id),
    CONSTRAINT analysis_sessions_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT analysis_sessions_movie_id_fkey FOREIGN KEY (movie_id)
        REFERENCES movies_watched(id) ON DELETE CASCADE,
    CONSTRAINT analysis_sessions_status_check
        CHECK (status = ANY (ARRAY['active'::text, 'closed'::text]))
);


-- ---------------------------------------------------------------------
-- analysis_messages
-- ---------------------------------------------------------------------
CREATE TABLE analysis_messages (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    session_id  uuid        NOT NULL,
    role        text        NOT NULL,
    content     text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT analysis_messages_pkey            PRIMARY KEY (id),
    CONSTRAINT analysis_messages_session_id_fkey FOREIGN KEY (session_id)
        REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    CONSTRAINT analysis_messages_role_check
        CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text]))
    -- NOTA: NO incluye 'system'. Si el backend intenta insertar
    -- mensajes con role='system', fallará. Verificar en Fase 2/3.
);


-- ---------------------------------------------------------------------
-- semantic_tags
-- ---------------------------------------------------------------------
CREATE TABLE semantic_tags (
    id          uuid  NOT NULL DEFAULT gen_random_uuid(),
    session_id  uuid  NOT NULL,
    tag_type    text  NOT NULL,
    -- POLIMÓRFICO: a veces string, a veces JSON-array serializado
    -- (lista). Migrar a jsonb en Fase 3 con CASE según prefijo.
    tag_value   text  NOT NULL,
    confidence  real  NOT NULL DEFAULT 1.0,

    CONSTRAINT semantic_tags_pkey            PRIMARY KEY (id),
    CONSTRAINT semantic_tags_session_id_fkey FOREIGN KEY (session_id)
        REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    CONSTRAINT semantic_tags_confidence_check
        CHECK (confidence >= 0::double precision
           AND confidence <= 1::double precision)
);


-- ---------------------------------------------------------------------
-- user_profile
-- ---------------------------------------------------------------------
CREATE TABLE user_profile (
    id           uuid        NOT NULL DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL,

    -- Ya jsonb (correcto).
    profile_data jsonb       NOT NULL DEFAULT '{}'::jsonb,

    updated_at   timestamptz NOT NULL DEFAULT now(),

    -- JSON-EN-TEXT — migrar a jsonb en Fase 3.
    temas_frecuentes      text DEFAULT '[]'::text,
    directores_afines     text DEFAULT '[]'::text,
    favorite_genres       text DEFAULT '[]'::text,
    reference_directors   text DEFAULT '[]'::text,

    narrativa_predominante     text,
    nivel_filosofico_promedio  text,
    total_sesiones_analizadas  integer NOT NULL DEFAULT 0,
    instructions               text,

    CONSTRAINT user_profile_pkey         PRIMARY KEY (id),
    CONSTRAINT user_profile_user_id_key  UNIQUE (user_id),
    CONSTRAINT user_profile_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE

    -- REDUNDANCIA POTENCIAL: `profile_data jsonb` coexiste con columnas
    -- planas (favorite_genres, reference_directors, temas_frecuentes,
    -- directores_afines, narrativa_predominante, nivel_filosofico_promedio).
    -- Verificar en Fase 3 si `profile_data` está siendo usado realmente
    -- por el backend o si quedó huérfano.
);


-- ---------------------------------------------------------------------
-- user_memory
-- ---------------------------------------------------------------------
CREATE TABLE user_memory (
    id          uuid        NOT NULL DEFAULT gen_random_uuid(),
    user_id     uuid        NOT NULL,
    content     text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT user_memory_pkey         PRIMARY KEY (id),
    CONSTRAINT user_memory_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE
);


-- ---------------------------------------------------------------------
-- recommendations
-- ---------------------------------------------------------------------
CREATE TABLE recommendations (
    id            uuid        NOT NULL DEFAULT gen_random_uuid(),
    user_id       uuid        NOT NULL,
    tmdb_id       integer     NOT NULL,
    reason        text        NOT NULL,

    -- REDUNDANCIA: `common_themes text[]` y `themes text` parecen
    -- representar lo mismo. `themes` está en JSON-en-TEXT y se migra
    -- en Fase 3; `common_themes` puede estar muerto (verificar uso
    -- antes de dropear).
    common_themes text[],
    themes        text        DEFAULT '[]'::text,

    seen          boolean     NOT NULL DEFAULT false,
    status        text        NOT NULL DEFAULT 'active'::text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    title         text,
    poster_url    text,

    CONSTRAINT recommendations_pkey         PRIMARY KEY (id),
    CONSTRAINT recommendations_user_id_fkey FOREIGN KEY (user_id)
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT recommendations_status_check
        CHECK (status = ANY (ARRAY['active'::text, 'dismissed'::text]))
    -- NOTA: sólo 'active' y 'dismissed'. La columna `seen` (boolean)
    -- es independiente del status. No existe estado 'seen' en el CHECK.
);


-- =====================================================================
-- ÍNDICES ACTUALES (todos los listados por pg_indexes)
-- =====================================================================
-- Sólo existen los PKs y UNIQUEs declarados arriba. NO hay índices
-- secundarios sobre columnas como user_id, session_id, created_at,
-- started_at, status, etc. La migración 005_add_indexes.sql los
-- añadirá en Fase 1.
--
-- Listado literal (para referencia):
--   analysis_messages_pkey            (id)
--   analysis_sessions_pkey            (id)
--   movies_watched_pkey               (id)
--   movies_watched_user_id_tmdb_id_key (user_id, tmdb_id) UNIQUE
--   movies_watched_user_tmdb_unique    (user_id, tmdb_id) UNIQUE  -- duplicado
--   profiles_pkey                     (id)
--   recommendations_pkey              (id)
--   semantic_tags_pkey                (id)
--   user_memory_pkey                  (id)
--   user_profile_pkey                 (id)
--   user_profile_user_id_key          (user_id) UNIQUE


-- =====================================================================
-- RESUMEN PARA SIGUIENTES FASES
-- =====================================================================
-- FASE 1 (índices):
--   * Crear índices secundarios planificados.
--   * Dropear UNIQUE duplicado movies_watched_user_tmdb_unique.
--
-- FASE 2 (FKs CASCADE):
--   * NO-OP a nivel SQL: todas las FKs ya tienen ON DELETE CASCADE.
--   * Refactor backend: quitar DELETEs manuales de semantic_tags y
--     analysis_messages en routers/analysis.py:606-614.
--
-- FASE 3 (jsonb):
--   * user_profile.{temas_frecuentes, directores_afines,
--                   favorite_genres, reference_directors}
--   * recommendations.themes
--   * semantic_tags.tag_value (con CASE por polimorfismo)
--   * Decidir destino de user_profile.profile_data y
--     recommendations.common_themes (redundancias).
--
-- FASE 4 (paginación):
--   * Sin cambio de schema; sólo backend + frontend.
--
-- FASE 5 (RLS preparatoria):
--   * Crear políticas sin ENABLE.
-- =====================================================================
