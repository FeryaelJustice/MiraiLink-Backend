BEGIN;
CREATE TABLE affinity_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    observed_since TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    last_like_at TIMESTAMPTZ,
    last_match_at TIMESTAMPTZ
);
INSERT INTO affinity_preferences(user_id) SELECT id FROM users ON CONFLICT DO NOTHING;
CREATE TABLE affinity_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '7 days'
);
CREATE INDEX affinity_batch_owner ON affinity_batches(user_id,created_at DESC);
CREATE TABLE affinity_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES affinity_batches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    common_keys JSONB NOT NULL,
    score REAL NOT NULL,
    state TEXT NOT NULL DEFAULT 'available' CHECK(state IN('available','liked','dismissed','requested','matched')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK(user_id<>target_id), UNIQUE(batch_id,target_id)
);
CREATE INDEX affinity_recommendation_pair ON affinity_recommendations(user_id,target_id,created_at DESC);
ALTER TABLE likes ADD COLUMN origin TEXT NOT NULL DEFAULT 'discovery' CHECK(origin IN('discovery','affinity'));
ALTER TABLE chats ADD COLUMN origin TEXT NOT NULL DEFAULT 'legacy' CHECK(origin IN('legacy','match','affinity'));
ALTER TABLE messages ADD COLUMN affinity_request_id UUID UNIQUE;
CREATE TABLE user_blocks (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id,target_id), CHECK(user_id<>target_id)
);
CREATE TABLE affinity_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_id UUID NOT NULL REFERENCES affinity_recommendations(id),
    client_id UUID NOT NULL,
    text TEXT NOT NULL CHECK(char_length(text) BETWEEN 1 AND 4000),
    state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN('pending','accepted','rejected','expired','blocked')),
    chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW()+INTERVAL '7 days',
    UNIQUE(from_user_id,client_id), CHECK(from_user_id<>to_user_id)
);
CREATE UNIQUE INDEX affinity_pending_pair ON affinity_requests(LEAST(from_user_id,to_user_id),GREATEST(from_user_id,to_user_id)) WHERE state='pending';
CREATE INDEX affinity_request_quota ON affinity_requests(from_user_id,created_at DESC);
CREATE INDEX affinity_request_inbox ON affinity_requests(to_user_id,created_at DESC);
CREATE TABLE affinity_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    UNIQUE(user_id,type,resource_id)
);
CREATE INDEX affinity_outbox_pending ON affinity_outbox(available_at) WHERE delivered_at IS NULL;

-- Event timestamps survive undo/deletion; a clock job evaluates elapsed time.
CREATE FUNCTION affinity_result_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_TABLE_NAME='likes' THEN
        INSERT INTO affinity_preferences(user_id,last_like_at) VALUES(NEW.to_user_id,NOW())
        ON CONFLICT(user_id) DO UPDATE SET last_like_at=NOW();
    ELSE
        INSERT INTO affinity_preferences(user_id,last_match_at) VALUES(NEW.user1_id,NOW()),(NEW.user2_id,NOW())
        ON CONFLICT(user_id) DO UPDATE SET last_match_at=NOW();
        UPDATE affinity_recommendations SET state='matched' WHERE (user_id=NEW.user1_id AND target_id=NEW.user2_id) OR (user_id=NEW.user2_id AND target_id=NEW.user1_id);
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER affinity_like_event AFTER INSERT ON likes FOR EACH ROW EXECUTE FUNCTION affinity_result_event();
CREATE TRIGGER affinity_match_event AFTER INSERT ON matches FOR EACH ROW EXECUTE FUNCTION affinity_result_event();
COMMIT;
