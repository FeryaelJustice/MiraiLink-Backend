-- ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_provider') THEN
        CREATE TYPE auth_provider AS ENUM ('email', 'phone', 'google');
    END IF;
END $$;

-- USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(30) UNIQUE NOT NULL,
    nickname VARCHAR(50) DEFAULT '-',
    email VARCHAR UNIQUE,
    phone_number VARCHAR UNIQUE,
    password_hash TEXT,
    auth_provider auth_provider NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_secret TEXT,
    bio TEXT,
    gender VARCHAR(20) CHECK (gender IS NULL OR gender IN ('male', 'female')),
    birthdate DATE,
    residence_city VARCHAR(100),
    residence_region VARCHAR(100),
    residence_country_code VARCHAR(10),
    residence_latitude DOUBLE PRECISION,
    residence_longitude DOUBLE PRECISION,
    current_latitude DOUBLE PRECISION,
    current_longitude DOUBLE PRECISION,
    last_location_updated_at TIMESTAMPTZ,
    search_radius_km INT DEFAULT 40,
    search_scope VARCHAR(20) DEFAULT 'radius_residence',
    search_target_country VARCHAR(10),
    search_match_live_location BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- USER LOCATION HISTORY (MAX 50 POINTS PER USER)
CREATE TABLE user_location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    city VARCHAR(100),
    country_code VARCHAR(10),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- STATELESS JWT FOR INVALIDATING BEFORE TIME
CREATE TABLE token_blacklist (
    token TEXT PRIMARY KEY,
    invalidated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VERIFICATION TOKENS
CREATE TABLE verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR NOT NULL,
    type VARCHAR(10) CHECK (type IN ('email', 'sms')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASSWORD RESET TOKENS
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PHOTOS
CREATE TABLE user_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INT CHECK (
        position BETWEEN 1
        AND 4
    )
);

-- MASTER TABLE OF ANIMES
CREATE TABLE supported_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(35) UNIQUE NOT NULL,
    english_name VARCHAR(100) NOT NULL
);

CREATE TABLE animes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    catalog_key VARCHAR(160) UNIQUE,
    image_path TEXT
);

-- MASTER TABLE OF GAMES
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    catalog_key VARCHAR(160) UNIQUE,
    image_path TEXT
);

CREATE TABLE anime_name_translations (
    anime_id UUID NOT NULL REFERENCES animes(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (anime_id, language_id)
);

CREATE TABLE anime_biography_translations (
    anime_id UUID NOT NULL REFERENCES animes(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    biography TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (anime_id, language_id)
);

CREATE TABLE game_name_translations (
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (game_id, language_id)
);

CREATE TABLE game_biography_translations (
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    language_id UUID NOT NULL REFERENCES supported_languages(id) ON DELETE CASCADE,
    biography TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (game_id, language_id)
);

-- USER SELECTED ANIME INTERESTS
CREATE TABLE user_anime_interests (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    anime_id UUID REFERENCES animes(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, anime_id)
);

-- USER SELECTED GAME INTERESTS
CREATE TABLE user_game_interests (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, game_id)
);

-- LIKES
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (from_user_id, to_user_id)
);

-- DISLIKES (O IGNORES)
CREATE TABLE dislikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (from_user_id, to_user_id)
);

-- USER SWIPE UNDOS (REWIND LOG & QUOTA AUDITING)
CREATE TABLE user_swipe_undos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_undone VARCHAR(10) NOT NULL, -- 'like' o 'dislike'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- MATCHES
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seen_by_user1 BOOLEAN DEFAULT false,
    seen_by_user2 BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user1_id, user2_id)
);

-- CHATS
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT CHECK (type IN ('private', 'group')) NOT NULL,
    name TEXT,
    -- solo si es grupo
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHAT MEMBERS
-- Para evitar duplicados de miembros en el mismo chat, se utiliza una tabla intermedia llamada chat_members.
CREATE TABLE chat_members (
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    -- Evita duplicados de miembros en el mismo chat
    PRIMARY KEY (chat_id, user_id)
);

-- MESSAGES
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    text TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- PUSH NOTIFICATIONS
CREATE TABLE push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('android', 'ios', 'web')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REPORTS
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_user UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FEEDBACK
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT CHECK (char_length(message) <= 10000),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER 2FA (TWO-FACTOR AUTHENTICATION)
CREATE TABLE user_2fa (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    secret TEXT NOT NULL,
    enabled BOOLEAN DEFAULT FALSE
);

-- RECOVERY CODES
CREATE TABLE recovery_codes (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

-- APP VERSIONS
CREATE TABLE app_versions (
    platform TEXT PRIMARY KEY,
    min_supported_version_code INTEGER NOT NULL,
    latest_version_code INTEGER NOT NULL,
    message TEXT,
    play_store_url TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_likes_from_user ON likes(from_user_id);

CREATE INDEX idx_likes_to_user ON likes(to_user_id);

CREATE INDEX idx_matches_user1 ON matches(user1_id);

CREATE INDEX idx_matches_user2 ON matches(user2_id);

CREATE INDEX idx_user_swipe_undos_user_created ON user_swipe_undos(user_id, created_at DESC);

-- Cápsula de Cristal: migración aditiva, sin borrar interacciones.
DO $$ BEGIN
 IF to_regclass('public.user_search_preferences') IS NULL THEN
  CREATE TABLE user_search_preferences (
   user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
   search_radius_km INT NOT NULL DEFAULT 40, search_scope VARCHAR(20) NOT NULL DEFAULT 'radius_residence',
   search_target_country_id UUID, search_match_live_location BOOLEAN NOT NULL DEFAULT FALSE,
   search_gender TEXT DEFAULT 'all', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
 END IF;
END $$;
ALTER TABLE user_search_preferences ADD COLUMN IF NOT EXISTS discovery_mode TEXT NOT NULL DEFAULT 'classic' CHECK (discovery_mode IN ('classic','capsule'));
ALTER TABLE likes ADD COLUMN IF NOT EXISTS discovery_mode TEXT NOT NULL DEFAULT 'classic' CHECK (discovery_mode IN ('classic','capsule'));
ALTER TABLE dislikes ADD COLUMN IF NOT EXISTS discovery_mode TEXT NOT NULL DEFAULT 'classic' CHECK (discovery_mode IN ('classic','capsule'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS messages_client_id ON messages(chat_id,sender_id,client_message_id) WHERE client_message_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS capsule_sessions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
 chat_id UUID REFERENCES chats(id) ON DELETE SET NULL, status TEXT NOT NULL CHECK(status IN ('active','paused','left','cancelled','revealed')),
 progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 8), revision INTEGER NOT NULL DEFAULT 0,
 rules_version INTEGER NOT NULL DEFAULT 1, snapshot JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user1_id,user2_id), CHECK(user1_id < user2_id)
);
CREATE TABLE IF NOT EXISTS capsule_participants (
 capsule_id UUID NOT NULL REFERENCES capsule_sessions(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), paused BOOLEAN NOT NULL DEFAULT FALSE, resume_accepted BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY(capsule_id,user_id)
);
CREATE TABLE IF NOT EXISTS capsule_questions (id TEXT PRIMARY KEY, category TEXT NOT NULL, catalog_version INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS capsule_question_translations (question_id TEXT REFERENCES capsule_questions(id) ON DELETE CASCADE, language TEXT CHECK(language IN ('es','en')), text TEXT NOT NULL, PRIMARY KEY(question_id,language));
CREATE TABLE IF NOT EXISTS capsule_missions (id UUID PRIMARY KEY, capsule_id UUID NOT NULL REFERENCES capsule_sessions(id) ON DELETE CASCADE, question_id TEXT NOT NULL REFERENCES capsule_questions(id), completed BOOLEAN NOT NULL DEFAULT FALSE, skipped BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE IF NOT EXISTS capsule_answers (mission_id UUID REFERENCES capsule_missions(id) ON DELETE CASCADE, user_id UUID REFERENCES users(id) ON DELETE CASCADE, message_id UUID REFERENCES messages(id) ON DELETE CASCADE, PRIMARY KEY(mission_id,user_id));
CREATE TABLE IF NOT EXISTS capsule_actions (capsule_id UUID REFERENCES capsule_sessions(id) ON DELETE CASCADE, actor_id UUID REFERENCES users(id) ON DELETE CASCADE, action_id UUID NOT NULL, response JSONB NOT NULL, PRIMARY KEY(capsule_id,actor_id,action_id));
CREATE TABLE IF NOT EXISTS capsule_events (id BIGSERIAL PRIMARY KEY, capsule_id UUID NOT NULL REFERENCES capsule_sessions(id) ON DELETE CASCADE, revision INTEGER NOT NULL, type TEXT NOT NULL, level INTEGER NOT NULL, category TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(capsule_id,revision,type));
CREATE INDEX IF NOT EXISTS capsule_sessions_user2 ON capsule_sessions(user2_id);
