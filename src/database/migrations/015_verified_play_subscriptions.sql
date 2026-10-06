BEGIN;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS provider_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS provider_state TEXT;
CREATE TABLE IF NOT EXISTS play_purchase_owners (
    purchase_token TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO play_purchase_owners(purchase_token,user_id)
SELECT purchase_token, MIN(user_id::text)::uuid FROM user_subscriptions
GROUP BY purchase_token HAVING COUNT(DISTINCT user_id)=1
ON CONFLICT DO NOTHING;
-- Unverified legacy records cannot authorize paid features.
UPDATE user_subscriptions SET status='expired' WHERE provider_verified=FALSE;
COMMIT;
