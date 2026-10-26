import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { upload } = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('../../../src/services/cloudinary-photos.js', () => ({ uploadCloudPhoto: upload, destroyCloudPhoto: vi.fn() }));
import { downloadPhoto, externalRoot, confinedPath, preparePhotoMigration, applyPhotoMigration, loadManifest } from '../../../src/services/photo-migration.js';
import { photoDigest } from '../../../src/utils/photoStorage.js';

const image = Buffer.from([0xff, 0xd8, 0xff, 0x11]);
const id = '00000000-0000-4000-8000-000000000001';
const photo = { url: 'https://res.cloudinary.com/fixture/image/upload/v1/owned.jpg', provider: 'cloudinary',
    cloud_name: 'fixture', resource_type: 'image', delivery_type: 'upload', public_id: 'owned', sha256: photoDigest(image) };
let root;
beforeEach(async () => { root = await fs.mkdtemp(join(tmpdir(), 'mirailink-migrate-')); vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'fixture'); });
afterEach(async () => { await fs.rm(root, { force: true, recursive: true }); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function database(rows) {
    const query = vi.fn(async sql => ({ rows: sql.includes('LEFT JOIN photo_storage_objects') ? rows : [] }));
    const client = { query, release: vi.fn() };
    return { query, connect: async () => client, client };
}

describe('photo migration safeguards', () => {
    it('imports shared legacy photos once and preserves all row identities in the manifest', async () => {
        vi.stubEnv('PHOTO_STORAGE_PROVIDER', 'cloudinary');
        vi.stubEnv('CLOUDINARY_API_KEY', 'fixture'); vi.stubEnv('CLOUDINARY_API_SECRET', 'fixture');
        await fs.writeFile(join(root, 'Goku.webp'), image);
        const second = '00000000-0000-4000-8000-000000000002';
        const oldUrl = 'assets/img/profiles/Goku.webp';
        const pool = database([{ id, user_id: id, url: oldUrl, position: 1 }, { id: second, user_id: second, url: oldUrl, position: 1 }]);
        upload.mockReset().mockImplementation(async (buffer, user, prepare) => {
            await prepare({ ...photo, url: photo.url, public_id: 'owned' });
            return { ...photo, asset_id: 'fixture', plannedUrl: photo.url };
        });
        vi.stubGlobal('fetch', vi.fn(async () => new Response(image)));
        const manifestPath = join(root, 'to-cloud.json');
        const result = await preparePhotoMigration(pool, { target: 'cloudinary', root, manifestPath, dryRun: false });
        expect(result).toMatchObject({ photos: 1, rows: 2, errors: 0 });
        expect(upload).toHaveBeenCalledTimes(1);
        expect(result.manifest.entries[0].rows.map(row => row.id)).toEqual([id, second]);
        await preparePhotoMigration(pool, { target: 'cloudinary', root, manifestPath, dryRun: false });
        expect(upload).toHaveBeenCalledTimes(1);
        expect(await fs.readFile(join(root, 'Goku.webp'))).toEqual(image);
    });
    it('accepts zero photos without touching the source tree or any database rows', async () => {
        const pool = database([]);
        const result = await preparePhotoMigration(pool, { target: 'cloudinary', root, manifestPath: join(root, 'manifest.json') });
        expect(result).toMatchObject({ errors: 0, photos: 0, rows: 0 });
        expect(await fs.readdir(root)).toEqual([]);
        expect(pool.query).toHaveBeenCalledTimes(1);
    });
    it('reports a missing legacy file without changing references', async () => {
        const pool = database([{ id, user_id: id, url: `assets/img/profiles/${id}/missing.jpg`, position: 1 }]);
        const result = await preparePhotoMigration(pool, { target: 'cloudinary', root, manifestPath: join(root, 'manifest.json'), dryRun: false });
        expect(result.errors).toBe(1);
        const manifest = await loadManifest(join(root, 'manifest.json'));
        expect(manifest.entries[0].error).toBe('PHOTO_MIGRATION_SOURCE_OR_TRANSFER_FAILED');
        await expect(applyPhotoMigration(pool, manifest)).rejects.toThrow('incomplete');
        expect(pool.query.mock.calls.every(([sql]) => !sql.startsWith('UPDATE'))).toBe(true);
    });
    it('exports, verifies, resumes and applies a public cloud photo to local storage', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(image)));
        const pool = database([{ ...photo, id, user_id: id, position: 1 }]);
        const manifestPath = join(root, 'manifest.json');
        const first = await preparePhotoMigration(pool, { target: 'local', root, manifestPath, dryRun: false });
        expect(first.errors).toBe(0);
        const files = await fs.readdir(join(root, 'migrated'));
        expect(files).toHaveLength(1);
        expect(await fs.readFile(join(root, 'migrated', files[0]))).toEqual(image);
        const resumed = await preparePhotoMigration(pool, { target: 'local', root, manifestPath, dryRun: false });
        expect(resumed.errors).toBe(0);
        expect(await fs.readdir(join(root, 'migrated'))).toEqual(files);
        const base = pool.query.getMockImplementation();
        pool.query.mockImplementation(async (sql, args) => sql.startsWith('SELECT url,user_id')
            ? { rows: [{ url: photo.url, user_id: id }] } : base(sql, args));
        await applyPhotoMigration(pool, resumed.manifest);
        expect(pool.query).toHaveBeenCalledWith('UPDATE user_photos SET url=$1 WHERE id=$2 AND url=$3', [resumed.manifest.entries[0].photo.url, id, photo.url]);
        expect(pool.query).toHaveBeenCalledWith('COMMIT');
    });
    it('rejects a modified exported file before starting a reference transaction', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(image)));
        const pool = database([{ ...photo, id, user_id: id, position: 1 }]);
        const { manifest } = await preparePhotoMigration(pool, { target: 'local', root, manifestPath: join(root, 'manifest.json'), dryRun: false });
        await fs.writeFile(join(root, 'migrated', (await fs.readdir(join(root, 'migrated')))[0]), Buffer.from([0xff, 0xd8, 0xff, 0x22]));
        await expect(applyPhotoMigration(pool, manifest)).rejects.toThrow('integrity');
        expect(pool.query).not.toHaveBeenCalledWith('BEGIN');
    });
    it('refuses a stale manifest and rolls back the whole reference change', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(image)));
        const pool = database([{ ...photo, id, user_id: id, position: 1 }]);
        const { manifest } = await preparePhotoMigration(pool, { target: 'local', root, manifestPath: join(root, 'manifest.json'), dryRun: false });
        await expect(applyPhotoMigration(pool, manifest)).rejects.toThrow('references changed');
        expect(pool.query).toHaveBeenCalledWith('ROLLBACK');
    });
    it('rejects protected source trees and paths escaping the external root', async () => {
        await expect(externalRoot(resolve('src/assets'))).rejects.toThrow('Protected');
        await expect(externalRoot(resolve('.'))).rejects.toThrow('Protected');
        await expect(confinedPath(root, resolve(root, '..', 'escaped'))).rejects.toThrow('escapes');
    });
    it.each(['http://res.cloudinary.com/fixture/image/upload/x.jpg', 'https://evil.test/x.jpg', 'https://res.cloudinary.com/other/image/upload/x.jpg', 'https://res.cloudinary.com/fixture/image/upload/x.jpg?redirect=evil'])('rejects arbitrary URL %s', async url => {
        const fetcher = vi.fn();
        await expect(downloadPhoto({ ...photo, url }, fetcher)).rejects.toThrow('Untrusted');
        expect(fetcher).not.toHaveBeenCalled();
    });
    it('bounds streamed downloads even without Content-Length', async () => {
        vi.stubEnv('UPLOAD_MAX_BYTES', '3');
        await expect(downloadPhoto(photo, async () => new Response(image))).rejects.toThrow('exceeds');
    });
});
