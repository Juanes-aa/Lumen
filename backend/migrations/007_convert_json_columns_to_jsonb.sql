-- =====================================================================
-- 007_convert_json_columns_to_jsonb.sql
-- =====================================================================
-- Fase 3 del plan de DB:
--   1. Backups de las 3 tablas afectadas (CREATE TABLE _backup_007).
--   2. DROP de columnas muertas (verificadas en grep del backend):
--        - user_profile.profile_data       (jsonb sin uso real)
--        - recommendations.common_themes   (text[] sin uso real)
--   3. ALTER TYPE de TEXT-con-JSON-serializado → jsonb:
--        - user_profile.{temas_frecuentes, directores_afines,
--                        favorite_genres, reference_directors}
--        - recommendations.themes
--        - semantic_tags.tag_value (polimórfico, con CASE)
--   4. Reset de DEFAULTs al equivalente jsonb.
--
-- Datos al momento de aplicar: TODAS las tablas afectadas están vacías
-- (verificado en query previo). El CASE polimórfico de tag_value sigue
-- siendo correcto si llegan datos antiguos serializados.
--
-- Idempotente sólo en parte: los ALTER TYPE no son re-ejecutables si
-- ya están en jsonb. Por eso se envuelven en bloques DO IF EXISTS que
-- comprueban el tipo actual antes de actuar.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Backups
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS user_profile_backup_007;
DROP TABLE IF EXISTS recommendations_backup_007;
DROP TABLE IF EXISTS semantic_tags_backup_007;

CREATE TABLE user_profile_backup_007    AS SELECT * FROM user_profile;
CREATE TABLE recommendations_backup_007 AS SELECT * FROM recommendations;
CREATE TABLE semantic_tags_backup_007   AS SELECT * FROM semantic_tags;


-- ---------------------------------------------------------------------
-- 2. Drop de columnas muertas
-- ---------------------------------------------------------------------
ALTER TABLE user_profile     DROP COLUMN IF EXISTS profile_data;
ALTER TABLE recommendations  DROP COLUMN IF EXISTS common_themes;


-- ---------------------------------------------------------------------
-- 3a. user_profile: text → jsonb
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name='user_profile'
          AND column_name='temas_frecuentes') = 'text' THEN
        ALTER TABLE user_profile
            ALTER COLUMN temas_frecuentes DROP DEFAULT,
            ALTER COLUMN temas_frecuentes TYPE jsonb
                USING COALESCE(NULLIF(temas_frecuentes, '')::jsonb, '[]'::jsonb),
            ALTER COLUMN temas_frecuentes SET DEFAULT '[]'::jsonb;
    END IF;

    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name='user_profile'
          AND column_name='directores_afines') = 'text' THEN
        ALTER TABLE user_profile
            ALTER COLUMN directores_afines DROP DEFAULT,
            ALTER COLUMN directores_afines TYPE jsonb
                USING COALESCE(NULLIF(directores_afines, '')::jsonb, '[]'::jsonb),
            ALTER COLUMN directores_afines SET DEFAULT '[]'::jsonb;
    END IF;

    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name='user_profile'
          AND column_name='favorite_genres') = 'text' THEN
        ALTER TABLE user_profile
            ALTER COLUMN favorite_genres DROP DEFAULT,
            ALTER COLUMN favorite_genres TYPE jsonb
                USING COALESCE(NULLIF(favorite_genres, '')::jsonb, '[]'::jsonb),
            ALTER COLUMN favorite_genres SET DEFAULT '[]'::jsonb;
    END IF;

    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name='user_profile'
          AND column_name='reference_directors') = 'text' THEN
        ALTER TABLE user_profile
            ALTER COLUMN reference_directors DROP DEFAULT,
            ALTER COLUMN reference_directors TYPE jsonb
                USING COALESCE(NULLIF(reference_directors, '')::jsonb, '[]'::jsonb),
            ALTER COLUMN reference_directors SET DEFAULT '[]'::jsonb;
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- 3b. recommendations.themes: text → jsonb
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name='recommendations'
          AND column_name='themes') = 'text' THEN
        ALTER TABLE recommendations
            ALTER COLUMN themes DROP DEFAULT,
            ALTER COLUMN themes TYPE jsonb
                USING COALESCE(NULLIF(themes, '')::jsonb, '[]'::jsonb),
            ALTER COLUMN themes SET DEFAULT '[]'::jsonb;
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- 3c. semantic_tags.tag_value: text → jsonb (polimórfico)
-- ---------------------------------------------------------------------
-- Estrategia:
--   * Si comienza con '[' → asumir array JSON y castear.
--   * Si comienza con '{' → asumir objeto JSON y castear.
--   * Cualquier otra cosa → tratar como string y envolver con to_jsonb.
DO $$
BEGIN
    IF (SELECT data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name='semantic_tags'
          AND column_name='tag_value') = 'text' THEN
        ALTER TABLE semantic_tags
            ALTER COLUMN tag_value TYPE jsonb
                USING (
                    CASE
                        WHEN LEFT(tag_value, 1) IN ('[', '{') THEN tag_value::jsonb
                        ELSE to_jsonb(tag_value)
                    END
                );
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- 4. Verificación rápida (no-op pero útil al ejecutar manualmente)
-- ---------------------------------------------------------------------
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema='public'
--   AND ((table_name='user_profile' AND column_name IN
--          ('temas_frecuentes','directores_afines',
--           'favorite_genres','reference_directors'))
--     OR (table_name='recommendations' AND column_name='themes')
--     OR (table_name='semantic_tags' AND column_name='tag_value'));
-- Esperado: data_type = 'jsonb' en TODAS.
