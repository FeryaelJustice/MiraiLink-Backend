BEGIN;

INSERT INTO supported_languages (code, english_name) VALUES
    ('es', 'Spanish'),
    ('en', 'English')
ON CONFLICT (code) DO UPDATE SET english_name = EXCLUDED.english_name;

CREATE TABLE countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iso_code CHAR(2) NOT NULL UNIQUE,
    geonames_id BIGINT UNIQUE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (iso_code = upper(iso_code))
);

CREATE TABLE country_name_translations (
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    normalized_name VARCHAR(160) NOT NULL,
    PRIMARY KEY (country_id, language_id)
);

CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    geonames_id BIGINT UNIQUE,
    catalog_key VARCHAR(220) UNIQUE,
    admin_code VARCHAR(40),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (country_id, admin_code)
);

CREATE TABLE region_name_translations (
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    normalized_name VARCHAR(160) NOT NULL,
    PRIMARY KEY (region_id, language_id)
);

CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    region_id UUID REFERENCES regions(id) ON DELETE RESTRICT,
    geonames_id BIGINT UNIQUE,
    catalog_key VARCHAR(220) UNIQUE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    population BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE city_name_translations (
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    normalized_name VARCHAR(160) NOT NULL,
    PRIMARY KEY (city_id, language_id)
);

CREATE INDEX idx_regions_country_id ON regions(country_id);
CREATE INDEX idx_cities_country_id ON cities(country_id);
CREATE INDEX idx_cities_region_id ON cities(region_id);
CREATE INDEX idx_country_names_lookup ON country_name_translations(language_id, normalized_name);
CREATE INDEX idx_region_names_lookup ON region_name_translations(region_id, language_id, normalized_name);
CREATE INDEX idx_city_names_lookup ON city_name_translations(city_id, language_id, normalized_name);

ALTER TABLE users ADD COLUMN residence_country_id UUID REFERENCES countries(id) ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN residence_region_id UUID REFERENCES regions(id) ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN residence_city_id UUID REFERENCES cities(id) ON DELETE RESTRICT;

CREATE TABLE user_search_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    search_radius_km INT NOT NULL DEFAULT 40 CHECK (search_radius_km BETWEEN 10 AND 800),
    search_scope VARCHAR(20) NOT NULL DEFAULT 'radius_residence' CHECK (search_scope IN ('radius_residence', 'radius_active', 'country', 'world', 'specific_country')),
    search_target_country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
    search_match_live_location BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_residence_country_id ON users(residence_country_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_residence_region_id ON users(residence_region_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_residence_city_id ON users(residence_city_id) WHERE is_deleted = FALSE;

WITH legacy_countries AS (
    SELECT DISTINCT upper(trim(residence_country_code)) AS iso_code
    FROM users
    WHERE residence_country_code IS NOT NULL AND trim(residence_country_code) ~ '^[A-Za-z]{2}$'
)
INSERT INTO countries (iso_code)
SELECT iso_code FROM legacy_countries
ON CONFLICT (iso_code) DO NOTHING;

INSERT INTO country_name_translations (country_id, language_id, name, normalized_name)
SELECT c.id, l.id, c.iso_code, lower(c.iso_code)
FROM countries c CROSS JOIN supported_languages l
ON CONFLICT (country_id, language_id) DO NOTHING;

WITH legacy_regions AS (
    SELECT DISTINCT
        c.id AS country_id,
        trim(u.residence_region) AS name,
        'legacy-region:' || c.id::text || ':' || lower(translate(trim(u.residence_region), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) AS catalog_key
    FROM users u
    JOIN countries c ON c.iso_code = upper(trim(u.residence_country_code))
    WHERE u.residence_region IS NOT NULL AND trim(u.residence_region) <> ''
)
INSERT INTO regions (country_id, catalog_key)
SELECT country_id, catalog_key FROM legacy_regions
ON CONFLICT (catalog_key) DO NOTHING;

WITH unmatched_regions AS (
    SELECT r.id, lr.name
    FROM regions r
    JOIN (
        SELECT DISTINCT
            c.id AS country_id,
            trim(u.residence_region) AS name,
            'legacy-region:' || c.id::text || ':' || lower(translate(trim(u.residence_region), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) AS catalog_key
        FROM users u
        JOIN countries c ON c.iso_code = upper(trim(u.residence_country_code))
        WHERE u.residence_region IS NOT NULL AND trim(u.residence_region) <> ''
    ) lr ON lr.catalog_key = r.catalog_key
    LEFT JOIN region_name_translations t ON t.region_id = r.id
    WHERE t.region_id IS NULL
)
INSERT INTO region_name_translations (region_id, language_id, name, normalized_name)
SELECT ur.id, l.id, ur.name, lower(translate(ur.name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))
FROM unmatched_regions ur CROSS JOIN supported_languages l
ON CONFLICT (region_id, language_id) DO NOTHING;

UPDATE users u
SET residence_country_id = c.id
FROM countries c
WHERE c.iso_code = upper(trim(u.residence_country_code));

UPDATE users u
SET residence_region_id = r.id
FROM region_name_translations t
JOIN regions r ON r.id = t.region_id
WHERE u.residence_country_id = r.country_id
  AND t.language_id = (SELECT id FROM supported_languages WHERE code = 'es')
  AND t.normalized_name = lower(translate(trim(u.residence_region), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));

WITH legacy_cities AS (
    SELECT DISTINCT ON (u.residence_country_id, u.residence_region_id, lower(trim(u.residence_city)))
        u.residence_country_id AS country_id,
        u.residence_region_id AS region_id,
        trim(u.residence_city) AS name,
        u.residence_latitude AS latitude,
        u.residence_longitude AS longitude,
        'legacy-city:' || u.residence_country_id::text || ':' || u.residence_region_id::text || ':' || lower(translate(trim(u.residence_city), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) AS catalog_key
    FROM users u
    WHERE u.residence_country_id IS NOT NULL
      AND u.residence_region_id IS NOT NULL
      AND u.residence_city IS NOT NULL
      AND trim(u.residence_city) <> ''
      AND u.residence_latitude IS NOT NULL
      AND u.residence_longitude IS NOT NULL
)
INSERT INTO cities (country_id, region_id, latitude, longitude, catalog_key)
SELECT country_id, region_id, latitude, longitude, catalog_key FROM legacy_cities
ON CONFLICT (catalog_key) DO NOTHING;

WITH unmatched_cities AS (
    SELECT c.id, lc.name
    FROM cities c
    JOIN (
        SELECT DISTINCT ON (u.residence_country_id, u.residence_region_id, lower(trim(u.residence_city)))
            u.residence_country_id AS country_id,
            u.residence_region_id AS region_id,
            trim(u.residence_city) AS name,
            'legacy-city:' || u.residence_country_id::text || ':' || u.residence_region_id::text || ':' || lower(translate(trim(u.residence_city), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) AS catalog_key
        FROM users u
        WHERE u.residence_country_id IS NOT NULL
          AND u.residence_region_id IS NOT NULL
          AND u.residence_city IS NOT NULL
          AND trim(u.residence_city) <> ''
          AND u.residence_latitude IS NOT NULL
          AND u.residence_longitude IS NOT NULL
    ) lc ON lc.catalog_key = c.catalog_key
    LEFT JOIN city_name_translations t ON t.city_id = c.id
    WHERE t.city_id IS NULL
)
INSERT INTO city_name_translations (city_id, language_id, name, normalized_name)
SELECT uc.id, l.id, uc.name, lower(translate(uc.name, 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'))
FROM unmatched_cities uc CROSS JOIN supported_languages l
ON CONFLICT (city_id, language_id) DO NOTHING;

UPDATE users u
SET residence_city_id = c.id
FROM cities c
JOIN city_name_translations t ON t.city_id = c.id
WHERE c.country_id = u.residence_country_id
  AND c.region_id = u.residence_region_id
  AND t.language_id = (SELECT id FROM supported_languages WHERE code = 'es')
  AND t.normalized_name = lower(translate(trim(u.residence_city), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'));

INSERT INTO user_search_preferences (
    user_id, search_radius_km, search_scope, search_target_country_id, search_match_live_location
)
SELECT
    u.id,
    COALESCE(u.search_radius_km, 40),
    CASE
        WHEN u.search_scope IN ('radius_residence', 'radius_active', 'country', 'world', 'specific_country') THEN u.search_scope
        WHEN u.search_scope = 'radius' AND COALESCE(u.search_match_live_location, FALSE) THEN 'radius_active'
        WHEN u.search_scope = 'radius' THEN 'radius_residence'
        ELSE 'radius_residence'
    END,
    target.id,
    COALESCE(u.search_match_live_location, FALSE)
FROM users u
LEFT JOIN countries target ON target.iso_code = upper(trim(u.search_target_country))
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE users DROP COLUMN residence_city;
ALTER TABLE users DROP COLUMN residence_region;
ALTER TABLE users DROP COLUMN residence_country_code;
ALTER TABLE users DROP COLUMN search_radius_km;
ALTER TABLE users DROP COLUMN search_scope;
ALTER TABLE users DROP COLUMN search_target_country;
ALTER TABLE users DROP COLUMN search_match_live_location;

COMMIT;
