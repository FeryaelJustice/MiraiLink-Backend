BEGIN;

CREATE OR REPLACE FUNCTION notify_user_subscription_change()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    target_user_id := COALESCE(NEW.user_id, OLD.user_id);
    IF target_user_id IS NOT NULL THEN
        PERFORM pg_notify('subscription_changed', target_user_id::text);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_subscriptions_changed ON user_subscriptions;

CREATE TRIGGER trigger_user_subscriptions_changed
AFTER INSERT OR UPDATE OR DELETE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION notify_user_subscription_change();

COMMIT;
