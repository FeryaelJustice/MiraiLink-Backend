BEGIN;

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL,
    base_plan_id VARCHAR(100) NOT NULL DEFAULT 'monthly-autorenew',
    purchase_token TEXT NOT NULL,
    order_id VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- active, canceled, expired, in_grace_period
    auto_renewing BOOLEAN NOT NULL DEFAULT TRUE,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_subscription UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

COMMIT;
