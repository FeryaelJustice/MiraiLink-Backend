BEGIN;

ALTER TABLE token_blacklist ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
UPDATE token_blacklist SET expires_at = NOW() + INTERVAL '24 hours' WHERE expires_at IS NULL;
ALTER TABLE token_blacklist ALTER COLUMN expires_at SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expiry ON token_blacklist(expires_at);

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verification_tokens' AND column_name = 'token') THEN
        ALTER TABLE verification_tokens RENAME COLUMN token TO token_hash;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'password_reset_tokens' AND column_name = 'token') THEN
        ALTER TABLE password_reset_tokens RENAME COLUMN token TO token_hash;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recovery_codes' AND column_name = 'code') THEN
        ALTER TABLE recovery_codes RENAME COLUMN code TO code_hash;
    END IF;
END $$;

TRUNCATE TABLE recovery_codes;
ALTER TABLE recovery_codes ALTER COLUMN code_hash TYPE TEXT;
COMMENT ON TABLE recovery_codes IS 'Recovery codes are bcrypt hashes. Existing plaintext codes were invalidated by migration 002.';
ALTER TABLE users DROP COLUMN IF EXISTS two_fa_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS two_fa_secret;
DELETE FROM user_photos a USING user_photos b WHERE a.user_id = b.user_id AND a.position = b.position AND a.id > b.id;
ALTER TABLE user_photos ADD CONSTRAINT user_photos_user_position_unique UNIQUE (user_id, position);
ALTER TABLE likes ADD CONSTRAINT likes_not_self CHECK (from_user_id <> to_user_id);
ALTER TABLE dislikes ADD CONSTRAINT dislikes_not_self CHECK (from_user_id <> to_user_id);
ALTER TABLE matches ADD CONSTRAINT matches_not_self CHECK (user1_id <> user2_id);
ALTER TABLE reports ADD CONSTRAINT reports_not_self CHECK (reported_by IS NULL OR reported_user IS NULL OR reported_by <> reported_user);
CREATE INDEX IF NOT EXISTS idx_messages_chat_sent_at ON messages(chat_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_type ON verification_tokens(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created ON password_reset_tokens(user_id, created_at DESC);

COMMIT;
