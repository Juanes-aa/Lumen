-- 013_background_jobs.sql
--
-- Tabla de jobs persistentes para tareas que corren como BackgroundTask
-- de FastAPI. Permite detectar jobs perdidos si el servidor se reinicia
-- durante la ejecución, y auditar fallos históricos.
--
-- Acceso: solo el backend vía service_role (no RLS de usuario).

CREATE TABLE background_jobs (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type     TEXT        NOT NULL,
    payload      JSONB       NOT NULL DEFAULT '{}',
    status       TEXT        NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error        TEXT,
    retry_count  INT         NOT NULL DEFAULT 0,

    CONSTRAINT valid_job_status CHECK (status IN ('pending', 'running', 'done', 'failed'))
);

CREATE INDEX idx_background_jobs_status ON background_jobs (status, created_at DESC);
