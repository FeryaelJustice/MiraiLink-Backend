BEGIN;
ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS cancellation_intent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS revision UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS acknowledgement_pending BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS acknowledgement_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS acknowledgement_next_attempt_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS acknowledgement_error_code TEXT,
    ADD COLUMN IF NOT EXISTS verification_next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscription_purchase_token ON user_subscriptions(purchase_token);
CREATE INDEX IF NOT EXISTS subscription_verification_due ON user_subscriptions(verification_next_attempt_at);
CREATE INDEX IF NOT EXISTS subscription_ack_due ON user_subscriptions(acknowledgement_next_attempt_at) WHERE acknowledgement_pending;
COMMIT;
