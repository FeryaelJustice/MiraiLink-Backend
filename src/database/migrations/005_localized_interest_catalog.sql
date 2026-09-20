BEGIN;

CREATE TABLE IF NOT EXISTS supported_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(35) UNIQUE NOT NULL,
    english_name VARCHAR(100) NOT NULL
);

ALTER TABLE animes ADD COLUMN IF NOT EXISTS catalog_key VARCHAR(160);
ALTER TABLE animes ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS catalog_key VARCHAR(160);
ALTER TABLE games ADD COLUMN IF NOT EXISTS image_path TEXT;

CREATE TABLE IF NOT EXISTS anime_name_translations (
    anime_id UUID NOT NULL REFERENCES animes(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (anime_id, language_id)
);

CREATE TABLE IF NOT EXISTS anime_biography_translations (
    anime_id UUID NOT NULL REFERENCES animes(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    biography TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (anime_id, language_id)
);

CREATE TABLE IF NOT EXISTS game_name_translations (
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (game_id, language_id)
);

CREATE TABLE IF NOT EXISTS game_biography_translations (
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    biography TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (game_id, language_id)
);

INSERT INTO supported_languages (code, english_name) VALUES
    ('es', 'Spanish'),
    ('en', 'English')
ON CONFLICT (code) DO UPDATE SET english_name = EXCLUDED.english_name;

UPDATE animes
SET catalog_key = COALESCE(catalog_key, trim(both '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 8)),
    image_path = COALESCE(image_path, image_url);

UPDATE games
SET catalog_key = COALESCE(catalog_key, trim(both '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 8)),
    image_path = COALESCE(image_path, image_url);

INSERT INTO anime_name_translations (anime_id, language_id, name)
SELECT a.id, l.id, a.name FROM animes a CROSS JOIN supported_languages l
ON CONFLICT (anime_id, language_id) DO NOTHING;

INSERT INTO game_name_translations (game_id, language_id, name)
SELECT g.id, l.id, g.name FROM games g CROSS JOIN supported_languages l
ON CONFLICT (game_id, language_id) DO NOTHING;

INSERT INTO anime_biography_translations (anime_id, language_id, biography)
SELECT a.id, l.id, '' FROM animes a CROSS JOIN supported_languages l
ON CONFLICT (anime_id, language_id) DO NOTHING;

INSERT INTO game_biography_translations (game_id, language_id, biography)
SELECT g.id, l.id, '' FROM games g CROSS JOIN supported_languages l
ON CONFLICT (game_id, language_id) DO NOTHING;

ALTER TABLE animes ALTER COLUMN catalog_key SET NOT NULL;
ALTER TABLE games ALTER COLUMN catalog_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_animes_catalog_key ON animes(catalog_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_catalog_key ON games(catalog_key);

COMMIT;
