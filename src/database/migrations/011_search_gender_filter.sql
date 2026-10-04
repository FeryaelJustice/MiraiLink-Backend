BEGIN;

-- Anadir columna search_gender a preferencias globales de busqueda del usuario
ALTER TABLE user_search_preferences
ADD COLUMN IF NOT EXISTS search_gender VARCHAR(20) DEFAULT NULL
CHECK (search_gender IS NULL OR search_gender IN ('male', 'female', 'all'));

-- Anadir columna target_gender a preferencias de busqueda por categoria
ALTER TABLE user_category_preferences
ADD COLUMN IF NOT EXISTS target_gender VARCHAR(20) DEFAULT NULL
CHECK (target_gender IS NULL OR target_gender IN ('male', 'female', 'all'));

COMMIT;
