BEGIN;

-- 1. Homogeneización de columnas de tiempo a TIMESTAMPTZ para garantizar consistencia UTC global

DO $$
BEGIN
    -- users
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE users ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_location_updated_at') THEN
        ALTER TABLE users ALTER COLUMN last_location_updated_at TYPE TIMESTAMPTZ USING last_location_updated_at AT TIME ZONE 'UTC';
    END IF;

    -- user_location_history
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_location_history' AND column_name = 'recorded_at') THEN
        ALTER TABLE user_location_history ALTER COLUMN recorded_at TYPE TIMESTAMPTZ USING recorded_at AT TIME ZONE 'UTC';
    END IF;

    -- token_blacklist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'token_blacklist' AND column_name = 'invalidated_at') THEN
        ALTER TABLE token_blacklist ALTER COLUMN invalidated_at TYPE TIMESTAMPTZ USING invalidated_at AT TIME ZONE 'UTC';
    END IF;

    -- verification_tokens
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification_tokens' AND column_name = 'expires_at') THEN
        ALTER TABLE verification_tokens ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification_tokens' AND column_name = 'created_at') THEN
        ALTER TABLE verification_tokens ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;

    -- password_reset_tokens
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'password_reset_tokens' AND column_name = 'expires_at') THEN
        ALTER TABLE password_reset_tokens ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'password_reset_tokens' AND column_name = 'created_at') THEN
        ALTER TABLE password_reset_tokens ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;

    -- likes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'likes' AND column_name = 'created_at') THEN
        ALTER TABLE likes ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;

    -- dislikes
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dislikes' AND column_name = 'created_at') THEN
        ALTER TABLE dislikes ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;

    -- matches
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'created_at') THEN
        ALTER TABLE matches ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;

    -- chats
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chats' AND column_name = 'created_at') THEN
        ALTER TABLE chats ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;

    -- chat_members
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_members' AND column_name = 'joined_at') THEN
        ALTER TABLE chat_members ALTER COLUMN joined_at TYPE TIMESTAMPTZ USING joined_at AT TIME ZONE 'UTC';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_members' AND column_name = 'last_read_at') THEN
        ALTER TABLE chat_members ALTER COLUMN last_read_at TYPE TIMESTAMPTZ USING last_read_at AT TIME ZONE 'UTC';
    END IF;

    -- messages
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'created_at') THEN
        ALTER TABLE messages ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sent_at') THEN
        ALTER TABLE messages ALTER COLUMN sent_at TYPE TIMESTAMPTZ USING sent_at AT TIME ZONE 'UTC';
    END IF;

    -- push_tokens
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'push_tokens' AND column_name = 'created_at') THEN
        ALTER TABLE push_tokens ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;

    -- reports
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'created_at') THEN
        ALTER TABLE reports ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;

    -- feedback
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'created_at') THEN
        ALTER TABLE feedback ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
    END IF;
END $$;

-- 2. Tabla para registrar y auditar cuota de deshacer (Rewind) en Discovery

CREATE TABLE IF NOT EXISTS user_swipe_undos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_undone VARCHAR(10) NOT NULL, -- 'like' o 'dislike'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_swipe_undos_user_created 
ON user_swipe_undos(user_id, created_at DESC);

COMMIT;
