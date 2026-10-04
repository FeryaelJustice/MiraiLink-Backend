BEGIN;

-- 1. Normalizar usuarios existentes a solo 'male' o 'female'. Cualquier otro valor se convierte a 'male'.
UPDATE users
SET gender = 'male'
WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female');

-- 2. Restringir gender en la tabla users para admitir unicamente 'male' o 'female'
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_gender_check;

ALTER TABLE users
ADD CONSTRAINT users_gender_check
CHECK (gender IS NULL OR gender IN ('male', 'female'));

-- 3. Asegurar columnas de preferencias de busqueda de genero
ALTER TABLE user_search_preferences
ADD COLUMN IF NOT EXISTS search_gender VARCHAR(20) DEFAULT 'all';

UPDATE user_search_preferences
SET search_gender = 'all'
WHERE search_gender IS NULL;

ALTER TABLE user_search_preferences
DROP CONSTRAINT IF EXISTS user_search_preferences_search_gender_check;

ALTER TABLE user_search_preferences
ADD CONSTRAINT user_search_preferences_search_gender_check
CHECK (search_gender IN ('male', 'female', 'all'));

-- 4. Preferencias de categoria
ALTER TABLE user_category_preferences
ADD COLUMN IF NOT EXISTS target_gender VARCHAR(20) DEFAULT NULL;

ALTER TABLE user_category_preferences
DROP CONSTRAINT IF EXISTS user_category_preferences_target_gender_check;

ALTER TABLE user_category_preferences
ADD CONSTRAINT user_category_preferences_target_gender_check
CHECK (target_gender IS NULL OR target_gender IN ('male', 'female', 'all'));

COMMIT;
