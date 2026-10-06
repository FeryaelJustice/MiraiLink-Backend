BEGIN;
ALTER TABLE affinity_preferences ADD COLUMN last_evaluated_at TIMESTAMPTZ;
CREATE INDEX affinity_evaluation_due ON affinity_preferences(last_evaluated_at);
ALTER TABLE play_purchase_owners ADD COLUMN superseded_by TEXT;
COMMIT;
