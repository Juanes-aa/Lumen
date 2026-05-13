-- =====================================================================
-- 008_enable_rls.sql
-- =====================================================================
-- Habilita Row Level Security en TODAS las tablas de `public.*` y
-- crea políticas SELECT/INSERT/UPDATE/DELETE basadas en `auth.uid()`.
--
-- Idempotente: cada CREATE POLICY va precedido de DROP POLICY IF EXISTS.
-- Seguro re-ejecutar.
--
-- Modelo de aislamiento:
--   * profiles                 → auth.uid() = id
--   * movies_watched           → auth.uid() = user_id
--   * analysis_sessions        → auth.uid() = user_id
--   * user_profile             → auth.uid() = user_id
--   * user_memory              → auth.uid() = user_id
--   * recommendations          → auth.uid() = user_id
--   * analysis_messages        → EXISTS (sesión del usuario)
--   * semantic_tags            → EXISTS (sesión del usuario)
--
-- IMPORTANTE: el backend debe usar el cliente con anon_key + JWT del
-- usuario en todos los endpoints protegidos. Las operaciones de Auth
-- Admin (register, etc.) usan service_role y bypassean RLS.
-- =====================================================================


-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;

CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_delete_own ON public.profiles
    FOR DELETE USING (auth.uid() = id);


-- ---------------------------------------------------------------------
-- movies_watched
-- ---------------------------------------------------------------------
ALTER TABLE public.movies_watched ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS movies_watched_select_own ON public.movies_watched;
DROP POLICY IF EXISTS movies_watched_insert_own ON public.movies_watched;
DROP POLICY IF EXISTS movies_watched_update_own ON public.movies_watched;
DROP POLICY IF EXISTS movies_watched_delete_own ON public.movies_watched;

CREATE POLICY movies_watched_select_own ON public.movies_watched
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY movies_watched_insert_own ON public.movies_watched
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY movies_watched_update_own ON public.movies_watched
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY movies_watched_delete_own ON public.movies_watched
    FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- analysis_sessions
-- ---------------------------------------------------------------------
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analysis_sessions_select_own ON public.analysis_sessions;
DROP POLICY IF EXISTS analysis_sessions_insert_own ON public.analysis_sessions;
DROP POLICY IF EXISTS analysis_sessions_update_own ON public.analysis_sessions;
DROP POLICY IF EXISTS analysis_sessions_delete_own ON public.analysis_sessions;

CREATE POLICY analysis_sessions_select_own ON public.analysis_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY analysis_sessions_insert_own ON public.analysis_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY analysis_sessions_update_own ON public.analysis_sessions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY analysis_sessions_delete_own ON public.analysis_sessions
    FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- user_profile
-- ---------------------------------------------------------------------
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profile_select_own ON public.user_profile;
DROP POLICY IF EXISTS user_profile_insert_own ON public.user_profile;
DROP POLICY IF EXISTS user_profile_update_own ON public.user_profile;
DROP POLICY IF EXISTS user_profile_delete_own ON public.user_profile;

CREATE POLICY user_profile_select_own ON public.user_profile
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_profile_insert_own ON public.user_profile
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_profile_update_own ON public.user_profile
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_profile_delete_own ON public.user_profile
    FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- user_memory
-- ---------------------------------------------------------------------
ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_memory_select_own ON public.user_memory;
DROP POLICY IF EXISTS user_memory_insert_own ON public.user_memory;
DROP POLICY IF EXISTS user_memory_update_own ON public.user_memory;
DROP POLICY IF EXISTS user_memory_delete_own ON public.user_memory;

CREATE POLICY user_memory_select_own ON public.user_memory
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_memory_insert_own ON public.user_memory
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_memory_update_own ON public.user_memory
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_memory_delete_own ON public.user_memory
    FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- recommendations
-- ---------------------------------------------------------------------
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recommendations_select_own ON public.recommendations;
DROP POLICY IF EXISTS recommendations_insert_own ON public.recommendations;
DROP POLICY IF EXISTS recommendations_update_own ON public.recommendations;
DROP POLICY IF EXISTS recommendations_delete_own ON public.recommendations;

CREATE POLICY recommendations_select_own ON public.recommendations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY recommendations_insert_own ON public.recommendations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY recommendations_update_own ON public.recommendations
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY recommendations_delete_own ON public.recommendations
    FOR DELETE USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------
-- analysis_messages (sin user_id directo → join contra analysis_sessions)
-- ---------------------------------------------------------------------
ALTER TABLE public.analysis_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analysis_messages_select_own ON public.analysis_messages;
DROP POLICY IF EXISTS analysis_messages_insert_own ON public.analysis_messages;
DROP POLICY IF EXISTS analysis_messages_update_own ON public.analysis_messages;
DROP POLICY IF EXISTS analysis_messages_delete_own ON public.analysis_messages;

CREATE POLICY analysis_messages_select_own ON public.analysis_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.analysis_sessions s
            WHERE s.id = analysis_messages.session_id
              AND s.user_id = auth.uid()
        )
    );
CREATE POLICY analysis_messages_insert_own ON public.analysis_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analysis_sessions s
            WHERE s.id = analysis_messages.session_id
              AND s.user_id = auth.uid()
        )
    );
CREATE POLICY analysis_messages_update_own ON public.analysis_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.analysis_sessions s
            WHERE s.id = analysis_messages.session_id
              AND s.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analysis_sessions s
            WHERE s.id = analysis_messages.session_id
              AND s.user_id = auth.uid()
        )
    );
CREATE POLICY analysis_messages_delete_own ON public.analysis_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.analysis_sessions s
            WHERE s.id = analysis_messages.session_id
              AND s.user_id = auth.uid()
        )
    );


-- ---------------------------------------------------------------------
-- semantic_tags (sin user_id directo → join contra analysis_sessions)
-- ---------------------------------------------------------------------
ALTER TABLE public.semantic_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS semantic_tags_select_own ON public.semantic_tags;
DROP POLICY IF EXISTS semantic_tags_insert_own ON public.semantic_tags;
DROP POLICY IF EXISTS semantic_tags_update_own ON public.semantic_tags;
DROP POLICY IF EXISTS semantic_tags_delete_own ON public.semantic_tags;

CREATE POLICY semantic_tags_select_own ON public.semantic_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.analysis_sessions s
            WHERE s.id = semantic_tags.session_id
              AND s.user_id = auth.uid()
        )
    );
CREATE POLICY semantic_tags_insert_own ON public.semantic_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analysis_sessions s
            WHERE s.id = semantic_tags.session_id
              AND s.user_id = auth.uid()
        )
    );
CREATE POLICY semantic_tags_update_own ON public.semantic_tags
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.analysis_sessions s
            WHERE s.id = semantic_tags.session_id
              AND s.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.analysis_sessions s
            WHERE s.id = semantic_tags.session_id
              AND s.user_id = auth.uid()
        )
    );
CREATE POLICY semantic_tags_delete_own ON public.semantic_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.analysis_sessions s
            WHERE s.id = semantic_tags.session_id
              AND s.user_id = auth.uid()
        )
    );
