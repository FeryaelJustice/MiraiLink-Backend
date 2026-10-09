BEGIN;
-- Affinity interest and a Discovery vote may coexist for the same pair.
ALTER TABLE likes DROP CONSTRAINT likes_from_user_id_to_user_id_key;
ALTER TABLE likes ADD CONSTRAINT likes_pair_origin_key UNIQUE(from_user_id,to_user_id,origin);
COMMIT;
