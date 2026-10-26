import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { runMigrations } from '../../src/database/migrator.js';
import { preparePhotoMigration, applyPhotoMigration } from '../../src/services/photo-migration.js';
import { photoDigest, recordPhoto } from '../../src/utils/photoStorage.js';

const testUrl = process.env.PHOTO_DATABASE_TEST_URL;
const suite = testUrl ? describe : describe.skip;
suite('photo storage on disposable PostgreSQL', () => {
    const schema = `photo_test_${randomUUID().replaceAll('-', '')}`;
    let admin;
    let pool;
    let root;
    const userId = randomUUID();
    const photoId = randomUUID();
    const image = Buffer.from([0xff, 0xd8, 0xff, 0x11]);
    const cloud = { url: 'https://res.cloudinary.com/fixture/image/upload/v1/legacy.jpg', provider: 'cloudinary', cloud_name: 'fixture',
        asset_id: 'asset-fixture', public_id: 'legacy', sha256: photoDigest(image), resource_type: 'image', delivery_type: 'upload', bytes: image.length };
    beforeAll(async () => {
        if (!['127.0.0.1', 'localhost'].includes(new URL(testUrl).hostname)) throw new Error('Use a disposable local PostgreSQL only');
        admin = new pg.Pool({ connectionString: testUrl });
        await admin.query(`CREATE SCHEMA ${schema}`);
        pool = new pg.Pool({ connectionString: testUrl, options: `-c search_path=${schema},public` });
        await pool.query(await fs.readFile('src/database/db.sql', 'utf8'));
        await pool.query(await fs.readFile('src/database/db_inserts.sql', 'utf8'));
        await runMigrations(pool);
        await pool.query('INSERT INTO users(id,username,auth_provider,birthdate) VALUES ($1,$2,$3,$4)', [userId, 'storage-fixture', 'email', '1990-01-01']);
        await pool.query('INSERT INTO user_photos(id,user_id,url,position) VALUES ($1,$2,$3,1)', [photoId, userId, cloud.url]);
        await recordPhoto(cloud, pool);
        root = await fs.mkdtemp(join(tmpdir(), 'mirailink-db-photos-'));
        vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'fixture');
        vi.stubGlobal('fetch', vi.fn(async () => new Response(image)));
    }, 30_000);
    afterAll(async () => {
        vi.unstubAllGlobals(); vi.unstubAllEnvs();
        if (root) await fs.rm(root, { force: true, recursive: true });
        if (pool) await pool.end();
        if (admin) { await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await admin.end(); }
    });
    it('applies all migrations on the initialized schema without losing catalog inserts', async () => {
        expect(Number((await pool.query('SELECT COUNT(*) FROM games')).rows[0].count)).toBeGreaterThan(0);
        expect((await pool.query("SELECT filename FROM schema_migrations WHERE filename='022_photo_storage.sql'")).rowCount).toBe(1);
        await runMigrations(pool);
        expect((await pool.query('SELECT id FROM users WHERE id=$1', [userId])).rowCount).toBe(1);
    });
    it('exports, switches references and rolls back while preserving photo IDs and positions', async () => {
        const { manifest, errors } = await preparePhotoMigration(pool, { target: 'local', root, manifestPath: join(root, 'manifest.json'), dryRun: false });
        expect(errors).toBe(0);
        await applyPhotoMigration(pool, manifest);
        expect((await pool.query('SELECT id,url,position FROM user_photos WHERE id=$1', [photoId])).rows[0])
            .toEqual({ id: photoId, url: manifest.entries[0].photo.url, position: 1 });
        await applyPhotoMigration(pool, manifest, { rollback: true });
        expect((await pool.query('SELECT url FROM user_photos WHERE id=$1', [photoId])).rows[0].url).toBe(cloud.url);
    });
});
