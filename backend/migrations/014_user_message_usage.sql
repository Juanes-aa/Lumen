-- 014_user_message_usage.sql
--
-- Contador diario de mensajes enviados al LLM por usuario.
-- Permite aplicar un límite configurable (llm_daily_message_limit en config.py)
-- para controlar el coste de Groq por usuario.

CREATE TABLE user_message_usage (
    user_id      UUID  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date   DATE  NOT NULL DEFAULT CURRENT_DATE,
    messages_sent INT  NOT NULL DEFAULT 0,

    PRIMARY KEY (user_id, usage_date)
);

-- RLS: cada usuario solo ve su propio contador.
ALTER TABLE user_message_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_message_usage_self"
    ON user_message_usage
    FOR ALL
    USING (auth.uid() = user_id);
