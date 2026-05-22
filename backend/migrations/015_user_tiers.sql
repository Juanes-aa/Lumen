-- 015_user_tiers.sql
--
-- Añade el campo `tier` a user_profile para gestionar planes de usuario.
-- Valores posibles: 'free' (default) | 'pro'.
-- El backend usa este campo para aplicar límites diferenciados por plan.

ALTER TABLE user_profile
    ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free'
    CONSTRAINT valid_user_tier CHECK (tier IN ('free', 'pro'));

-- Índice para queries de tier (ej. auditorías, analytics).
CREATE INDEX IF NOT EXISTS idx_user_profile_tier
    ON user_profile (tier);
