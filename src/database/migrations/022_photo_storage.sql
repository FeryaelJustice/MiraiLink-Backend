BEGIN;
CREATE TABLE IF NOT EXISTS photo_storage_objects (
    url TEXT PRIMARY KEY,
    provider TEXT NOT NULL CHECK (provider IN ('cloudinary', 'local')),
    cloud_name TEXT,
    asset_id TEXT,
    public_id TEXT,
    resource_type TEXT NOT NULL DEFAULT 'image',
    delivery_type TEXT NOT NULL DEFAULT 'upload',
    format TEXT,
    bytes BIGINT,
    sha256 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (provider <> 'cloudinary' OR (cloud_name IS NOT NULL AND public_id IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS photo_cleanup_jobs (
    url TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    error_code TEXT,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS photo_cleanup_due ON photo_cleanup_jobs(next_attempt_at);
COMMIT;
