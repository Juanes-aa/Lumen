-- 010_drop_profile_data_column.sql
--
-- La columna profile_data (jsonb) en user_profile nunca fue escrita
-- por el código de la aplicación. Se elimina para mantener el schema limpio.

ALTER TABLE user_profile DROP COLUMN IF EXISTS profile_data;
