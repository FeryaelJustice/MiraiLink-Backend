# Diccionario del esquema versionado

[Guía maestra](../guia-maestra.md) | [Modelo y operación](base-de-datos.md) | [Diagramas](../diagramas/indice.md).

Resultado documental del baseline y migraciones, más `schema_migrations` del migrador. No representa una inspección de la base desplegada. Las condiciones de migración dependen del estado previo; consultar el SQL para casos legacy. Índices y restricciones modificadas se conservan en el anexo DDL.

## users

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `username` | username VARCHAR(30) UNIQUE NOT NULL |
| `nickname` | nickname VARCHAR(50) DEFAULT '-' |
| `email` | email VARCHAR UNIQUE |
| `phone_number` | phone_number VARCHAR UNIQUE |
| `password_hash` | password_hash TEXT |
| `auth_provider` | auth_provider auth_provider NOT NULL |
| `is_verified` | is_verified BOOLEAN DEFAULT FALSE |
| `bio` | bio TEXT |
| `gender` | gender VARCHAR(20) |
| `birthdate` | birthdate DATE |
| `residence_latitude` | residence_latitude DOUBLE PRECISION |
| `residence_longitude` | residence_longitude DOUBLE PRECISION |
| `current_latitude` | current_latitude DOUBLE PRECISION |
| `current_longitude` | current_longitude DOUBLE PRECISION |
| `last_location_updated_at` | last_location_updated_at TIMESTAMP |
| `created_at` | created_at TIMESTAMP DEFAULT NOW() |
| `updated_at` | updated_at TIMESTAMP |
| `is_deleted` | is_deleted BOOLEAN DEFAULT FALSE |
| `residence_country_id` | residence_country_id UUID REFERENCES countries(id) ON DELETE RESTRICT |
| `residence_region_id` | residence_region_id UUID REFERENCES regions(id) ON DELETE RESTRICT |
| `residence_city_id` | residence_city_id UUID REFERENCES cities(id) ON DELETE RESTRICT |
| `profession` | profession VARCHAR(100) |
| `religion_id` | religion_id UUID REFERENCES religions(id) ON DELETE SET NULL |
| `zodiac_sign_id` | zodiac_sign_id UUID REFERENCES zodiac_signs(id) ON DELETE SET NULL |
| `political_stance_id` | political_stance_id UUID REFERENCES political_stances(id) ON DELETE SET NULL |
| `smoking_habit_id` | smoking_habit_id UUID REFERENCES smoking_habits(id) ON DELETE SET NULL |
| `drinking_habit_id` | drinking_habit_id UUID REFERENCES drinking_habits(id) ON DELETE SET NULL |
| `sexual_orientation_id` | sexual_orientation_id UUID REFERENCES sexual_orientations(id) ON DELETE SET NULL |
| `education_level_id` | education_level_id UUID REFERENCES education_levels(id) ON DELETE SET NULL |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## user_location_history

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `user_id` | user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `latitude` | latitude DOUBLE PRECISION NOT NULL |
| `longitude` | longitude DOUBLE PRECISION NOT NULL |
| `city` | city VARCHAR(100) |
| `country_code` | country_code VARCHAR(10) |
| `recorded_at` | recorded_at TIMESTAMP DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## token_blacklist

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `token` | token TEXT PRIMARY KEY |
| `invalidated_at` | invalidated_at TIMESTAMP DEFAULT NOW() |
| `expires_at` | expires_at TIMESTAMPTZ |

Restricciones de tabla/ajustes: `ALTER COLUMN expires_at SET NOT NULL`.

## verification_tokens

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `user_id` | user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `type` | type VARCHAR(10) CHECK (type IN ('email', 'sms')) |
| `expires_at` | expires_at TIMESTAMP NOT NULL |
| `created_at` | created_at TIMESTAMP DEFAULT NOW() |
| `token_hash` | token_hash VARCHAR NOT NULL |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## password_reset_tokens

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `user_id` | user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `expires_at` | expires_at TIMESTAMP NOT NULL |
| `created_at` | created_at TIMESTAMP DEFAULT NOW() |
| `token_hash` | token_hash VARCHAR NOT NULL |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## user_photos

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `user_id` | user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `url` | url TEXT NOT NULL |
| `position` | position INT CHECK (         position BETWEEN 1         AND 4     ) |

Restricciones de tabla/ajustes: `CONSTRAINT user_photos_user_position_unique UNIQUE (user_id, position)`.

## supported_languages

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(35) UNIQUE NOT NULL |
| `english_name` | english_name VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## animes

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `name` | name VARCHAR(100) UNIQUE NOT NULL |
| `description` | description TEXT |
| `image_url` | image_url TEXT |
| `catalog_key` | catalog_key VARCHAR(160) UNIQUE |
| `image_path` | image_path TEXT |

Restricciones de tabla/ajustes: `ALTER COLUMN catalog_key SET NOT NULL`.

## games

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `name` | name VARCHAR(100) UNIQUE NOT NULL |
| `description` | description TEXT |
| `image_url` | image_url TEXT |
| `catalog_key` | catalog_key VARCHAR(160) UNIQUE |
| `image_path` | image_path TEXT |

Restricciones de tabla/ajustes: `ALTER COLUMN catalog_key SET NOT NULL`.

## anime_name_translations

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `anime_id` | anime_id UUID NOT NULL REFERENCES animes(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `name` | name VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (anime_id, language_id)`.

## anime_biography_translations

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `anime_id` | anime_id UUID NOT NULL REFERENCES animes(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `biography` | biography TEXT NOT NULL DEFAULT '' |

Restricciones de tabla/ajustes: `PRIMARY KEY (anime_id, language_id)`.

## game_name_translations

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `game_id` | game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `name` | name VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (game_id, language_id)`.

## game_biography_translations

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `game_id` | game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `biography` | biography TEXT NOT NULL DEFAULT '' |

Restricciones de tabla/ajustes: `PRIMARY KEY (game_id, language_id)`.

## user_anime_interests

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `user_id` | user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `anime_id` | anime_id UUID REFERENCES animes(id) ON DELETE CASCADE |

Restricciones de tabla/ajustes: `PRIMARY KEY (user_id, anime_id)`.

## user_game_interests

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `user_id` | user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `game_id` | game_id UUID REFERENCES games(id) ON DELETE CASCADE |

Restricciones de tabla/ajustes: `PRIMARY KEY (user_id, game_id)`.

## likes

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `from_user_id` | from_user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `to_user_id` | to_user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `created_at` | created_at TIMESTAMP DEFAULT NOW() |

Restricciones de tabla/ajustes: `UNIQUE (from_user_id, to_user_id)`; `CONSTRAINT likes_not_self CHECK (from_user_id <> to_user_id)`.

## dislikes

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `from_user_id` | from_user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `to_user_id` | to_user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `created_at` | created_at TIMESTAMP DEFAULT NOW() |

Restricciones de tabla/ajustes: `UNIQUE (from_user_id, to_user_id)`; `CONSTRAINT dislikes_not_self CHECK (from_user_id <> to_user_id)`.

## matches

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `user1_id` | user1_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `user2_id` | user2_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `seen_by_user1` | seen_by_user1 BOOLEAN DEFAULT false |
| `seen_by_user2` | seen_by_user2 BOOLEAN DEFAULT false |
| `created_at` | created_at TIMESTAMP DEFAULT NOW() |

Restricciones de tabla/ajustes: `UNIQUE (user1_id, user2_id)`; `CONSTRAINT matches_not_self CHECK (user1_id <> user2_id)`.

## chats

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `type` | type TEXT CHECK (type IN ('private', 'group')) NOT NULL |
| `name` | name TEXT |
| `created_by` | created_by UUID REFERENCES users(id) ON DELETE SET NULL |
| `created_at` | created_at TIMESTAMP DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## chat_members

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `chat_id` | chat_id UUID REFERENCES chats(id) ON DELETE CASCADE |
| `user_id` | user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `role` | role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member' |
| `joined_at` | joined_at TIMESTAMP DEFAULT NOW() |
| `last_read_at` | last_read_at TIMESTAMP DEFAULT NOW() |

Restricciones de tabla/ajustes: `PRIMARY KEY (chat_id, user_id)`.

## messages

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `sender_id` | sender_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `chat_id` | chat_id UUID REFERENCES chats(id) ON DELETE CASCADE |
| `is_read` | is_read BOOLEAN DEFAULT false |
| `created_at` | created_at TIMESTAMP DEFAULT NOW() |
| `text` | text TEXT NOT NULL |
| `sent_at` | sent_at TIMESTAMP DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## push_tokens

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `user_id` | user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE |
| `token` | token TEXT NOT NULL |
| `platform` | platform TEXT CHECK (platform IN ('android', 'ios', 'web')) |
| `created_at` | created_at TIMESTAMP DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## reports

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `reported_by` | reported_by UUID REFERENCES users(id) ON DELETE SET NULL |
| `reported_user` | reported_user UUID REFERENCES users(id) ON DELETE SET NULL |
| `reason` | reason TEXT |
| `created_at` | created_at TIMESTAMP DEFAULT NOW() |

Restricciones de tabla/ajustes: `CONSTRAINT reports_not_self CHECK (reported_by IS NULL OR reported_user IS NULL OR reported_by <> reported_user)`.

## feedback

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `user_id` | user_id UUID REFERENCES users(id) ON DELETE SET NULL |
| `message` | message TEXT CHECK (char_length(message) <= 10000) |
| `created_at` | created_at TIMESTAMP DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## user_2fa

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `user_id` | user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE |
| `secret` | secret TEXT NOT NULL |
| `enabled` | enabled BOOLEAN DEFAULT FALSE |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## recovery_codes

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id SERIAL PRIMARY KEY |
| `user_id` | user_id UUID REFERENCES users(id) ON DELETE CASCADE |
| `code_hash` | code_hash TEXT NOT NULL |
| `used` | used BOOLEAN DEFAULT FALSE |

Restricciones de tabla/ajustes: `ALTER COLUMN code_hash TYPE TEXT`.

## app_versions

Origen: [src/database/db.sql](../../src/database/db.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `platform` | platform TEXT PRIMARY KEY |
| `min_supported_version_code` | min_supported_version_code INTEGER NOT NULL |
| `latest_version_code` | latest_version_code INTEGER NOT NULL |
| `message` | message TEXT |
| `play_store_url` | play_store_url TEXT NOT NULL |
| `updated_at` | updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## countries

Origen: [src/database/migrations/006_canonical_residence_and_search_preferences.sql](../../src/database/migrations/006_canonical_residence_and_search_preferences.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `iso_code` | iso_code CHAR(2) NOT NULL UNIQUE |
| `geonames_id` | geonames_id BIGINT UNIQUE |
| `latitude` | latitude DOUBLE PRECISION |
| `longitude` | longitude DOUBLE PRECISION |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| `updated_at` | updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: `CHECK (iso_code = upper(iso_code))`.

## country_name_translations

Origen: [src/database/migrations/006_canonical_residence_and_search_preferences.sql](../../src/database/migrations/006_canonical_residence_and_search_preferences.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `country_id` | country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `name` | name VARCHAR(160) NOT NULL |
| `normalized_name` | normalized_name VARCHAR(160) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (country_id, language_id)`.

## regions

Origen: [src/database/migrations/006_canonical_residence_and_search_preferences.sql](../../src/database/migrations/006_canonical_residence_and_search_preferences.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `country_id` | country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT |
| `geonames_id` | geonames_id BIGINT UNIQUE |
| `catalog_key` | catalog_key VARCHAR(220) UNIQUE |
| `admin_code` | admin_code VARCHAR(40) |
| `latitude` | latitude DOUBLE PRECISION |
| `longitude` | longitude DOUBLE PRECISION |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| `updated_at` | updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: `UNIQUE (country_id, admin_code)`.

## region_name_translations

Origen: [src/database/migrations/006_canonical_residence_and_search_preferences.sql](../../src/database/migrations/006_canonical_residence_and_search_preferences.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `region_id` | region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `name` | name VARCHAR(160) NOT NULL |
| `normalized_name` | normalized_name VARCHAR(160) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (region_id, language_id)`.

## cities

Origen: [src/database/migrations/006_canonical_residence_and_search_preferences.sql](../../src/database/migrations/006_canonical_residence_and_search_preferences.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `country_id` | country_id UUID NOT NULL REFERENCES countries(id) ON DELETE RESTRICT |
| `region_id` | region_id UUID REFERENCES regions(id) ON DELETE RESTRICT |
| `geonames_id` | geonames_id BIGINT UNIQUE |
| `catalog_key` | catalog_key VARCHAR(220) UNIQUE |
| `latitude` | latitude DOUBLE PRECISION NOT NULL |
| `longitude` | longitude DOUBLE PRECISION NOT NULL |
| `population` | population BIGINT |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| `updated_at` | updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## city_name_translations

Origen: [src/database/migrations/006_canonical_residence_and_search_preferences.sql](../../src/database/migrations/006_canonical_residence_and_search_preferences.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `city_id` | city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `name` | name VARCHAR(160) NOT NULL |
| `normalized_name` | normalized_name VARCHAR(160) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (city_id, language_id)`.

## user_search_preferences

Origen: [src/database/migrations/006_canonical_residence_and_search_preferences.sql](../../src/database/migrations/006_canonical_residence_and_search_preferences.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `user_id` | user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE |
| `search_radius_km` | search_radius_km INT NOT NULL DEFAULT 40 CHECK (search_radius_km BETWEEN 10 AND 800) |
| `search_scope` | search_scope VARCHAR(20) NOT NULL DEFAULT 'radius_residence' CHECK (search_scope IN ('radius_residence', 'radius_active', 'country', 'world', 'specific_country')) |
| `search_target_country_id` | search_target_country_id UUID REFERENCES countries(id) ON DELETE SET NULL |
| `search_match_live_location` | search_match_live_location BOOLEAN NOT NULL DEFAULT FALSE |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| `updated_at` | updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## relationship_goals

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(50) UNIQUE NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## relationship_goal_translations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `goal_id` | goal_id UUID NOT NULL REFERENCES relationship_goals(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `label` | label VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (goal_id, language_id)`.

## family_options

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(50) UNIQUE NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## family_option_translations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `option_id` | option_id UUID NOT NULL REFERENCES family_options(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `label` | label VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (option_id, language_id)`.

## religions

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(50) UNIQUE NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## religion_translations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `religion_id` | religion_id UUID NOT NULL REFERENCES religions(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `label` | label VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (religion_id, language_id)`.

## zodiac_signs

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(50) UNIQUE NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## zodiac_sign_translations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `sign_id` | sign_id UUID NOT NULL REFERENCES zodiac_signs(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `label` | label VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (sign_id, language_id)`.

## political_stances

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(50) UNIQUE NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## political_stance_translations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `stance_id` | stance_id UUID NOT NULL REFERENCES political_stances(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `label` | label VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (stance_id, language_id)`.

## smoking_habits

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(50) UNIQUE NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## smoking_habit_translations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `habit_id` | habit_id UUID NOT NULL REFERENCES smoking_habits(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `label` | label VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (habit_id, language_id)`.

## drinking_habits

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(50) UNIQUE NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## drinking_habit_translations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `habit_id` | habit_id UUID NOT NULL REFERENCES drinking_habits(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `label` | label VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (habit_id, language_id)`.

## sexual_orientations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(50) UNIQUE NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## sexual_orientation_translations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `orientation_id` | orientation_id UUID NOT NULL REFERENCES sexual_orientations(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `label` | label VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (orientation_id, language_id)`.

## education_levels

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(50) UNIQUE NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## education_level_translations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `level_id` | level_id UUID NOT NULL REFERENCES education_levels(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `label` | label VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (level_id, language_id)`.

## spoken_languages

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(10) UNIQUE NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## spoken_language_translations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `language_item_id` | language_item_id UUID NOT NULL REFERENCES spoken_languages(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `label` | label VARCHAR(100) NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (language_item_id, language_id)`.

## profile_prompts

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(50) UNIQUE NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## profile_prompt_translations

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `prompt_id` | prompt_id UUID NOT NULL REFERENCES profile_prompts(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `question` | question TEXT NOT NULL |

Restricciones de tabla/ajustes: `PRIMARY KEY (prompt_id, language_id)`.

## user_relationship_goals

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `user_id` | user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| `goal_id` | goal_id UUID NOT NULL REFERENCES relationship_goals(id) ON DELETE CASCADE |

Restricciones de tabla/ajustes: `PRIMARY KEY (user_id, goal_id)`.

## user_family_options

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `user_id` | user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| `option_id` | option_id UUID NOT NULL REFERENCES family_options(id) ON DELETE CASCADE |

Restricciones de tabla/ajustes: `PRIMARY KEY (user_id, option_id)`.

## user_spoken_languages

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `user_id` | user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES spoken_languages(id) ON DELETE CASCADE |

Restricciones de tabla/ajustes: `PRIMARY KEY (user_id, language_id)`.

## user_profile_prompts

Origen: [src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `user_id` | user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| `prompt_id` | prompt_id UUID NOT NULL REFERENCES profile_prompts(id) ON DELETE CASCADE |
| `answer` | answer VARCHAR(300) NOT NULL |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: `UNIQUE (user_id, prompt_id)`.

## explore_categories

Origen: [src/database/migrations/008_explore_categories_and_preferences.sql](../../src/database/migrations/008_explore_categories_and_preferences.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `code` | code VARCHAR(50) UNIQUE NOT NULL |
| `section_group` | section_group VARCHAR(50) NOT NULL |
| `icon_key` | icon_key VARCHAR(50) NOT NULL |
| `filter_type` | filter_type VARCHAR(50) NOT NULL |
| `filter_value` | filter_value VARCHAR(100) |
| `sort_order` | sort_order INT NOT NULL DEFAULT 0 |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## explore_category_translations

Origen: [src/database/migrations/008_explore_categories_and_preferences.sql](../../src/database/migrations/008_explore_categories_and_preferences.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `category_id` | category_id UUID NOT NULL REFERENCES explore_categories(id) ON DELETE CASCADE |
| `language_id` | language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE |
| `title` | title VARCHAR(100) NOT NULL |
| `description` | description VARCHAR(255) |

Restricciones de tabla/ajustes: `PRIMARY KEY (category_id, language_id)`.

## user_category_preferences

Origen: [src/database/migrations/008_explore_categories_and_preferences.sql](../../src/database/migrations/008_explore_categories_and_preferences.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `user_id` | user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| `category_id` | category_id UUID NOT NULL REFERENCES explore_categories(id) ON DELETE CASCADE |
| `radius_km` | radius_km INT NOT NULL DEFAULT 40 CHECK (radius_km >= 10 AND radius_km <= 500) |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| `updated_at` | updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: `PRIMARY KEY (user_id, category_id)`.

## user_subscriptions

Origen: [src/database/migrations/009_user_subscriptions.sql](../../src/database/migrations/009_user_subscriptions.sql).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `id` | id UUID PRIMARY KEY DEFAULT gen_random_uuid() |
| `user_id` | user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE |
| `product_id` | product_id VARCHAR(100) NOT NULL |
| `base_plan_id` | base_plan_id VARCHAR(100) NOT NULL DEFAULT 'monthly-autorenew' |
| `purchase_token` | purchase_token TEXT NOT NULL |
| `order_id` | order_id VARCHAR(100) |
| `status` | status VARCHAR(30) NOT NULL DEFAULT 'active' |
| `auto_renewing` | auto_renewing BOOLEAN NOT NULL DEFAULT TRUE |
| `start_date` | start_date TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| `expires_at` | expires_at TIMESTAMPTZ |
| `last_verified_at` | last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| `created_at` | created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |
| `updated_at` | updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: `CONSTRAINT uq_user_subscription UNIQUE(user_id)`.

## schema_migrations

Origen: [src/database/migrator.js](../../src/database/migrator.js).

| Columna | Declaración SQL final o inicial con ajustes en restricciones |
| --- | --- |
| `filename` | filename TEXT PRIMARY KEY |
| `applied_at` | applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW() |

Restricciones de tabla/ajustes: Ver restricciones inline en columnas.

## Relaciones declaradas

| Tabla hija y columna | Tabla padre | ON DELETE | Nulabilidad |
| --- | --- | --- | --- |
| users.residence_country_id | countries | RESTRICT | Admite NULL |
| users.residence_region_id | regions | RESTRICT | Admite NULL |
| users.residence_city_id | cities | RESTRICT | Admite NULL |
| users.religion_id | religions | SET NULL | Admite NULL |
| users.zodiac_sign_id | zodiac_signs | SET NULL | Admite NULL |
| users.political_stance_id | political_stances | SET NULL | Admite NULL |
| users.smoking_habit_id | smoking_habits | SET NULL | Admite NULL |
| users.drinking_habit_id | drinking_habits | SET NULL | Admite NULL |
| users.sexual_orientation_id | sexual_orientations | SET NULL | Admite NULL |
| users.education_level_id | education_levels | SET NULL | Admite NULL |
| user_location_history.user_id | users | CASCADE | Admite NULL |
| verification_tokens.user_id | users | CASCADE | Admite NULL |
| password_reset_tokens.user_id | users | CASCADE | Admite NULL |
| user_photos.user_id | users | CASCADE | Admite NULL |
| anime_name_translations.anime_id | animes | CASCADE | Obligatoria |
| anime_name_translations.language_id | supported_languages | CASCADE | Obligatoria |
| anime_biography_translations.anime_id | animes | CASCADE | Obligatoria |
| anime_biography_translations.language_id | supported_languages | CASCADE | Obligatoria |
| game_name_translations.game_id | games | CASCADE | Obligatoria |
| game_name_translations.language_id | supported_languages | CASCADE | Obligatoria |
| game_biography_translations.game_id | games | CASCADE | Obligatoria |
| game_biography_translations.language_id | supported_languages | CASCADE | Obligatoria |
| user_anime_interests.user_id | users | CASCADE | Obligatoria |
| user_anime_interests.anime_id | animes | CASCADE | Obligatoria |
| user_game_interests.user_id | users | CASCADE | Obligatoria |
| user_game_interests.game_id | games | CASCADE | Obligatoria |
| likes.from_user_id | users | CASCADE | Admite NULL |
| likes.to_user_id | users | CASCADE | Admite NULL |
| dislikes.from_user_id | users | CASCADE | Admite NULL |
| dislikes.to_user_id | users | CASCADE | Admite NULL |
| matches.user1_id | users | CASCADE | Admite NULL |
| matches.user2_id | users | CASCADE | Admite NULL |
| chats.created_by | users | SET NULL | Admite NULL |
| chat_members.chat_id | chats | CASCADE | Obligatoria |
| chat_members.user_id | users | CASCADE | Obligatoria |
| messages.sender_id | users | CASCADE | Admite NULL |
| messages.chat_id | chats | CASCADE | Admite NULL |
| push_tokens.user_id | users | CASCADE | Admite NULL |
| reports.reported_by | users | SET NULL | Admite NULL |
| reports.reported_user | users | SET NULL | Admite NULL |
| feedback.user_id | users | SET NULL | Admite NULL |
| user_2fa.user_id | users | CASCADE | Obligatoria |
| recovery_codes.user_id | users | CASCADE | Admite NULL |
| country_name_translations.country_id | countries | CASCADE | Obligatoria |
| country_name_translations.language_id | supported_languages | CASCADE | Obligatoria |
| regions.country_id | countries | RESTRICT | Obligatoria |
| region_name_translations.region_id | regions | CASCADE | Obligatoria |
| region_name_translations.language_id | supported_languages | CASCADE | Obligatoria |
| cities.country_id | countries | RESTRICT | Obligatoria |
| cities.region_id | regions | RESTRICT | Admite NULL |
| city_name_translations.city_id | cities | CASCADE | Obligatoria |
| city_name_translations.language_id | supported_languages | CASCADE | Obligatoria |
| user_search_preferences.user_id | users | CASCADE | Obligatoria |
| user_search_preferences.search_target_country_id | countries | SET NULL | Admite NULL |
| relationship_goal_translations.goal_id | relationship_goals | CASCADE | Obligatoria |
| relationship_goal_translations.language_id | supported_languages | CASCADE | Obligatoria |
| family_option_translations.option_id | family_options | CASCADE | Obligatoria |
| family_option_translations.language_id | supported_languages | CASCADE | Obligatoria |
| religion_translations.religion_id | religions | CASCADE | Obligatoria |
| religion_translations.language_id | supported_languages | CASCADE | Obligatoria |
| zodiac_sign_translations.sign_id | zodiac_signs | CASCADE | Obligatoria |
| zodiac_sign_translations.language_id | supported_languages | CASCADE | Obligatoria |
| political_stance_translations.stance_id | political_stances | CASCADE | Obligatoria |
| political_stance_translations.language_id | supported_languages | CASCADE | Obligatoria |
| smoking_habit_translations.habit_id | smoking_habits | CASCADE | Obligatoria |
| smoking_habit_translations.language_id | supported_languages | CASCADE | Obligatoria |
| drinking_habit_translations.habit_id | drinking_habits | CASCADE | Obligatoria |
| drinking_habit_translations.language_id | supported_languages | CASCADE | Obligatoria |
| sexual_orientation_translations.orientation_id | sexual_orientations | CASCADE | Obligatoria |
| sexual_orientation_translations.language_id | supported_languages | CASCADE | Obligatoria |
| education_level_translations.level_id | education_levels | CASCADE | Obligatoria |
| education_level_translations.language_id | supported_languages | CASCADE | Obligatoria |
| spoken_language_translations.language_item_id | spoken_languages | CASCADE | Obligatoria |
| spoken_language_translations.language_id | supported_languages | CASCADE | Obligatoria |
| profile_prompt_translations.prompt_id | profile_prompts | CASCADE | Obligatoria |
| profile_prompt_translations.language_id | supported_languages | CASCADE | Obligatoria |
| user_relationship_goals.user_id | users | CASCADE | Obligatoria |
| user_relationship_goals.goal_id | relationship_goals | CASCADE | Obligatoria |
| user_family_options.user_id | users | CASCADE | Obligatoria |
| user_family_options.option_id | family_options | CASCADE | Obligatoria |
| user_spoken_languages.user_id | users | CASCADE | Obligatoria |
| user_spoken_languages.language_id | spoken_languages | CASCADE | Obligatoria |
| user_profile_prompts.user_id | users | CASCADE | Obligatoria |
| user_profile_prompts.prompt_id | profile_prompts | CASCADE | Obligatoria |
| explore_category_translations.category_id | explore_categories | CASCADE | Obligatoria |
| explore_category_translations.language_id | supported_languages | CASCADE | Obligatoria |
| user_category_preferences.user_id | users | CASCADE | Obligatoria |
| user_category_preferences.category_id | explore_categories | CASCADE | Obligatoria |
| user_subscriptions.user_id | users | CASCADE | Obligatoria |
