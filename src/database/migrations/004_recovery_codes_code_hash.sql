BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recovery_codes' AND column_name = 'code'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'recovery_codes' AND column_name = 'code_hash'
    ) THEN
        ALTER TABLE recovery_codes RENAME COLUMN code TO code_hash;
    END IF;
END $$;

ALTER TABLE recovery_codes ADD COLUMN IF NOT EXISTS code_hash TEXT;

COMMIT;
