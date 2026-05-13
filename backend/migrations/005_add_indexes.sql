-- =====================================================================
-- 005_add_indexes.sql
-- =====================================================================
-- Fase 1 del plan de DB: índices secundarios sobre las columnas usadas
-- en filtros + orden de los listados principales.
--
-- Idempotente. Seguro de re-ejecutar.
--
-- También limpia un UNIQUE duplicado heredado de migrations/001 sobre
-- movies_watched(user_id, tmdb_id):
--   * Se conserva  : movies_watched_user_id_tmdb_id_key
--   * Se elimina   : movies_watched_user_tmdb_unique
-- =====================================================================


-- ---------------------------------------------------------------------
-- analysis_sessions
-- ---------------------------------------------------------------------
-- Listado principal: list_user_sessions
--   .eq("user_id", uid).order("started_at", desc=True)
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_started
    ON analysis_sessions (user_id, started_at DESC);

-- Listado de cerradas: list_recent_closed_sessions_with_movie
--   .eq("user_id", uid).eq("status", "closed").order("closed_at", desc=True)
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_status_closed
    ON analysis_sessions (user_id, status, closed_at DESC);


-- ---------------------------------------------------------------------
-- analysis_messages
-- ---------------------------------------------------------------------
-- Lectura de hilo: filtra por session_id y ordena por created_at ASC.
CREATE INDEX IF NOT EXISTS idx_analysis_messages_session_created
    ON analysis_messages (session_id, created_at);


-- ---------------------------------------------------------------------
-- semantic_tags
-- ---------------------------------------------------------------------
-- Acceso típico: por session_id, a veces filtrando por tag_type.
CREATE INDEX IF NOT EXISTS idx_semantic_tags_session_type
    ON semantic_tags (session_id, tag_type);


-- ---------------------------------------------------------------------
-- movies_watched
-- ---------------------------------------------------------------------
-- Listado principal: por user_id, orden desc por created_at.
CREATE INDEX IF NOT EXISTS idx_movies_watched_user_created
    ON movies_watched (user_id, created_at DESC);


-- ---------------------------------------------------------------------
-- recommendations
-- ---------------------------------------------------------------------
-- Listado del usuario filtrando por status, orden por created_at desc.
CREATE INDEX IF NOT EXISTS idx_recommendations_user_status_created
    ON recommendations (user_id, status, created_at DESC);


-- ---------------------------------------------------------------------
-- user_memory
-- ---------------------------------------------------------------------
-- Listado de memorias por usuario, orden ascendente por created_at
-- (cronológico, como pidió el plan).
CREATE INDEX IF NOT EXISTS idx_user_memory_user_created
    ON user_memory (user_id, created_at);


-- =====================================================================
-- Limpieza: UNIQUE constraint duplicado sobre movies_watched
-- =====================================================================
-- Detectado en Fase 0: existen DOS UNIQUE sobre (user_id, tmdb_id).
-- Eliminamos el redundante. El índice único subyacente se borra
-- automáticamente al dropear la constraint.
ALTER TABLE movies_watched
    DROP CONSTRAINT IF EXISTS movies_watched_user_tmdb_unique;
