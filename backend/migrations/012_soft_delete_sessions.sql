-- 012_soft_delete_sessions.sql
--
-- Añade soft delete a analysis_sessions.
-- En lugar de borrar la fila, el backend setea deleted_at = now().
-- Las queries filtran por `deleted_at IS NULL`.
-- Esto permite recuperar sesiones borradas por error y mantiene
-- la integridad referencial de semantic_tags y analysis_messages.

ALTER TABLE analysis_sessions ADD COLUMN deleted_at TIMESTAMPTZ;

-- Índice parcial para que los filtros `deleted_at IS NULL` sean eficientes.
CREATE INDEX idx_analysis_sessions_not_deleted
    ON analysis_sessions (user_id, started_at DESC)
    WHERE deleted_at IS NULL;
