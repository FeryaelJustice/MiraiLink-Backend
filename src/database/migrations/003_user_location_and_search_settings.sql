BEGIN;

-- 1. Campos de Residencia, Ubicacion Activa y Preferencias de Busqueda en la tabla users
ALTER TABLE users ADD COLUMN IF NOT EXISTS residence_city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS residence_region VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS residence_country_code VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS residence_latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS residence_longitude DOUBLE PRECISION;

ALTER TABLE users ADD COLUMN IF NOT EXISTS current_latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_longitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_location_updated_at TIMESTAMP;

ALTER TABLE users ADD COLUMN IF NOT EXISTS search_radius_km INT DEFAULT 40;
ALTER TABLE users ADD COLUMN IF NOT EXISTS search_scope VARCHAR(20) DEFAULT 'radius_residence';
ALTER TABLE users ADD COLUMN IF NOT EXISTS search_target_country VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS search_match_live_location BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_residence_coords ON users(residence_latitude, residence_longitude) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_users_current_coords ON users(current_latitude, current_longitude) WHERE is_deleted = FALSE;

-- 2. Tabla de Historico de Ubicaciones (Limitado a 50 puntos por usuario)
CREATE TABLE IF NOT EXISTS user_location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    city VARCHAR(100),
    country_code VARCHAR(10),
    recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_location_history_user_time ON user_location_history(user_id, recorded_at DESC);

COMMIT;
