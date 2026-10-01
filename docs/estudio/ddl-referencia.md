# DDL de referencia

[Modelo de datos](base-de-datos.md). Selección de definiciones estructurales para estudio, nunca instrucciones para ejecutar contra producción. Las sentencias condicionales deben interpretarse en su contexto original.

## src/database/db.sql

[src/database/db.sql](../../src/database/db.sql)

```sql
CREATE INDEX idx_likes_from_user ON likes(from_user_id);
CREATE INDEX idx_likes_to_user ON likes(to_user_id);
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
```

## src/database/migrations/002_security_hardening.sql

[src/database/migrations/002_security_hardening.sql](../../src/database/migrations/002_security_hardening.sql)

```sql
ALTER TABLE token_blacklist ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE token_blacklist ALTER COLUMN expires_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expiry ON token_blacklist(expires_at);
        ALTER TABLE verification_tokens RENAME COLUMN token TO token_hash;
        ALTER TABLE password_reset_tokens RENAME COLUMN token TO token_hash;
        ALTER TABLE recovery_codes RENAME COLUMN code TO code_hash;
ALTER TABLE recovery_codes ALTER COLUMN code_hash TYPE TEXT;
COMMENT ON TABLE recovery_codes IS 'Recovery codes are bcrypt hashes. Existing plaintext codes were invalidated by migration 002.';
ALTER TABLE users DROP COLUMN IF EXISTS two_fa_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS two_fa_secret;
ALTER TABLE user_photos ADD CONSTRAINT user_photos_user_position_unique UNIQUE (user_id, position);
ALTER TABLE likes ADD CONSTRAINT likes_not_self CHECK (from_user_id <> to_user_id);
ALTER TABLE dislikes ADD CONSTRAINT dislikes_not_self CHECK (from_user_id <> to_user_id);
ALTER TABLE matches ADD CONSTRAINT matches_not_self CHECK (user1_id <> user2_id);
ALTER TABLE reports ADD CONSTRAINT reports_not_self CHECK (reported_by IS NULL OR reported_user IS NULL OR reported_by <> reported_user);
CREATE INDEX IF NOT EXISTS idx_messages_chat_sent_at ON messages(chat_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_type ON verification_tokens(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created ON password_reset_tokens(user_id, created_at DESC);
```

## src/database/migrations/003_user_location_and_search_settings.sql

[src/database/migrations/003_user_location_and_search_settings.sql](../../src/database/migrations/003_user_location_and_search_settings.sql)

```sql
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
CREATE INDEX IF NOT EXISTS idx_user_location_history_user_time ON user_location_history(user_id, recorded_at DESC);
```

## src/database/migrations/004_recovery_codes_code_hash.sql

[src/database/migrations/004_recovery_codes_code_hash.sql](../../src/database/migrations/004_recovery_codes_code_hash.sql)

```sql
        ALTER TABLE recovery_codes RENAME COLUMN code TO code_hash;
ALTER TABLE recovery_codes ADD COLUMN IF NOT EXISTS code_hash TEXT;
```

## src/database/migrations/005_localized_interest_catalog.sql

[src/database/migrations/005_localized_interest_catalog.sql](../../src/database/migrations/005_localized_interest_catalog.sql)

```sql
ALTER TABLE animes ADD COLUMN IF NOT EXISTS catalog_key VARCHAR(160);
ALTER TABLE animes ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS catalog_key VARCHAR(160);
ALTER TABLE games ADD COLUMN IF NOT EXISTS image_path TEXT;
ALTER TABLE animes ALTER COLUMN catalog_key SET NOT NULL;
ALTER TABLE games ALTER COLUMN catalog_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_animes_catalog_key ON animes(catalog_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_catalog_key ON games(catalog_key);
```

## src/database/migrations/006_canonical_residence_and_search_preferences.sql

[src/database/migrations/006_canonical_residence_and_search_preferences.sql](../../src/database/migrations/006_canonical_residence_and_search_preferences.sql)

```sql
CREATE INDEX idx_regions_country_id ON regions(country_id);
CREATE INDEX idx_cities_country_id ON cities(country_id);
CREATE INDEX idx_cities_region_id ON cities(region_id);
CREATE INDEX idx_country_names_lookup ON country_name_translations(language_id, normalized_name);
CREATE INDEX idx_region_names_lookup ON region_name_translations(region_id, language_id, normalized_name);
CREATE INDEX idx_city_names_lookup ON city_name_translations(city_id, language_id, normalized_name);
ALTER TABLE users ADD COLUMN residence_country_id UUID REFERENCES countries(id) ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN residence_region_id UUID REFERENCES regions(id) ON DELETE RESTRICT;
ALTER TABLE users ADD COLUMN residence_city_id UUID REFERENCES cities(id) ON DELETE RESTRICT;
CREATE INDEX idx_users_residence_country_id ON users(residence_country_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_residence_region_id ON users(residence_region_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_residence_city_id ON users(residence_city_id) WHERE is_deleted = FALSE;
ALTER TABLE users DROP COLUMN residence_city;
ALTER TABLE users DROP COLUMN residence_region;
ALTER TABLE users DROP COLUMN residence_country_code;
ALTER TABLE users DROP COLUMN search_radius_km;
ALTER TABLE users DROP COLUMN search_scope;
ALTER TABLE users DROP COLUMN search_target_country;
ALTER TABLE users DROP COLUMN search_match_live_location;
```

## src/database/migrations/007_extended_profile_and_likes.sql

[src/database/migrations/007_extended_profile_and_likes.sql](../../src/database/migrations/007_extended_profile_and_likes.sql)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS religion_id UUID REFERENCES religions(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS zodiac_sign_id UUID REFERENCES zodiac_signs(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS political_stance_id UUID REFERENCES political_stances(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS smoking_habit_id UUID REFERENCES smoking_habits(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS drinking_habit_id UUID REFERENCES drinking_habits(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sexual_orientation_id UUID REFERENCES sexual_orientations(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS education_level_id UUID REFERENCES education_levels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_likes_to_user_created ON likes(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));
```

## src/database/migrations/008_explore_categories_and_preferences.sql

[src/database/migrations/008_explore_categories_and_preferences.sql](../../src/database/migrations/008_explore_categories_and_preferences.sql)

```sql
CREATE INDEX IF NOT EXISTS idx_user_cat_prefs ON user_category_preferences(user_id, category_id);
```

## src/database/migrations/009_user_subscriptions.sql

[src/database/migrations/009_user_subscriptions.sql](../../src/database/migrations/009_user_subscriptions.sql)

```sql
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
```
