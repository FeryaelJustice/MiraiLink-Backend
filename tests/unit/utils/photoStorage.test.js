import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { query, uploadStream, destroy } = vi.hoisted(() => ({ query: vi.fn(), uploadStream: vi.fn(), destroy: vi.fn() }));
vi.mock('../../../src/models/db.js', () => ({ default: { query } }));
vi.mock('cloudinary', () => ({ v2: { uploader: { upload_stream: uploadStream, destroy } } }));
import { stagePhoto, finalizePhoto, cleanupStagedPhoto, removePhotoFile, localPhotoPath } from '../../../src/utils/photoStorage.js';
import { photoStorageConfig } from '../../../src/config/photoStorage.js';

const image = Buffer.from([0xff, 0xd8, 0xff, 0x11]);
let root;
beforeEach(async () => {
    root = await fs.mkdtemp(join(tmpdir(), 'mirailink-photo-'));
    vi.stubEnv('PHOTO_STORAGE_PROVIDER', 'local');
    query.mockReset().mockResolvedValue({ rows: [] });
    uploadStream.mockReset();
    destroy.mockReset().mockResolvedValue({ result: 'ok' });
});
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

function cloudEnv() {
    vi.stubEnv('PHOTO_STORAGE_PROVIDER', 'cloudinary');
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'fixture');
    vi.stubEnv('CLOUDINARY_API_KEY', 'fixture-key');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'fixture-secret');
}

describe('photo storage providers', () => {
    it('preserves local upload, promotion and deletion in an injected directory', async () => {
        const staged = await stagePhoto('user-1', { buffer: image }, root);
        expect(await fs.readFile(staged.stagingPath)).toEqual(image);
        await finalizePhoto(staged);
        expect(await fs.readFile(staged.finalPath)).toEqual(image);
        await removePhotoFile(staged.url, root);
        await expect(fs.stat(staged.finalPath)).rejects.toMatchObject({ code: 'ENOENT' });
        expect(query).not.toHaveBeenCalled();
    });
    it('cleans unconfirmed local files and preserves shared fallback avatars', async () => {
        const staged = await stagePhoto('user-1', { buffer: image }, root);
        await cleanupStagedPhoto(staged);
        await fs.writeFile(join(root, 'Goku.webp'), image);
        await removePhotoFile('assets/img/profiles/Goku.webp', root);
        expect(await fs.readFile(join(root, 'Goku.webp'))).toEqual(image);
    });
    it.each(['assets/img/profiles/../outside.jpg', 'assets/img/profiles/user/../../outside.jpg', 'https://evil.test/photo.jpg', 'assets/img/profiles/user\\photo.jpg'])('rejects unsafe local reference %s', url => {
        expect(() => localPhotoPath(url, root)).toThrow();
    });
    it('defaults to cloudinary and requires credentials without falling back', () => {
        expect(() => photoStorageConfig({})).toThrow('Missing CLOUDINARY_CLOUD_NAME');
        expect(() => photoStorageConfig({ PHOTO_STORAGE_PROVIDER: 'other' })).toThrow();
    });
    it('persists the planned remote ID before uploading and returns the public URL', async () => {
        cloudEnv();
        uploadStream.mockImplementation((options, callback) => {
            expect(query.mock.calls.some(([sql]) => sql.includes('photo_cleanup_jobs'))).toBe(true);
            return new Writable({ write(chunk, encoding, done) { done(); }, final(done) {
                callback(null, { secure_url: `https://res.cloudinary.com/fixture/image/upload/v1/${options.public_id}.jpg`,
                    public_id: options.public_id, asset_id: 'asset-1', format: 'jpg' });
                done();
            } });
        });
        const photo = await stagePhoto('user-1', { buffer: image }, root);
        expect(photo.url).toMatch(/^https:\/\/res.cloudinary.com\/fixture\//);
        expect(photo.sha256).toHaveLength(64);
        expect(await fs.readdir(root)).toEqual([]);
        expect(uploadStream.mock.calls[0][0]).toMatchObject({ overwrite: false, resource_type: 'image', type: 'upload' });
        await finalizePhoto(photo);
    });
    it('reports sanitized remote failure with no local file created', async () => {
        cloudEnv();
        uploadStream.mockImplementation((options, callback) => {
            const stream = new Writable({ write(chunk, encoding, done) { done(); }, final(done) { callback(new Error('secret from provider')); done(); } });
            return stream;
        });
        await expect(stagePhoto('user-1', { buffer: image }, root)).rejects.toMatchObject({ code: 'PHOTO_STORAGE_UNAVAILABLE', status: 503 });
        expect(await fs.readdir(root)).toEqual([]);
    });
    it('does not upload if recovery bookkeeping fails', async () => {
        cloudEnv();
        query.mockRejectedValueOnce(new Error('DB unavailable'));
        await expect(stagePhoto('user-1', { buffer: image }, root)).rejects.toThrow();
        expect(uploadStream).not.toHaveBeenCalled();
    });
    it('deletes a remote photo by stored public ID and protects shared references', async () => {
        cloudEnv();
        const photo = { url: 'https://res.cloudinary.com/fixture/image/upload/v1/profile.jpg', cloud_name: 'fixture', provider: 'cloudinary', public_id: 'profiles/stored-id', resource_type: 'image', delivery_type: 'upload' };
        query.mockResolvedValueOnce({ rows: [photo] }).mockResolvedValueOnce({ rows: [{ id: 'referenced' }] });
        await removePhotoFile(photo.url);
        expect(destroy).not.toHaveBeenCalled();
        query.mockResolvedValueOnce({ rows: [photo] }).mockResolvedValueOnce({ rows: [] });
        await removePhotoFile(photo.url);
        expect(destroy).toHaveBeenCalledWith('profiles/stored-id', expect.objectContaining({ invalidate: true }));
    });
    it('rejects invalid image buffers before contacting any provider', async () => {
        cloudEnv();
        await expect(stagePhoto('user-1', { buffer: Buffer.from('invalid') }, root)).rejects.toMatchObject({ status: 415 });
        expect(uploadStream).not.toHaveBeenCalled();
    });
});
