import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), stage: vi.fn(), finalize: vi.fn(), cleanup: vi.fn(), queue: vi.fn(), drain: vi.fn() }));
vi.mock('../../../src/models/db.js', () => ({ default: { connect: async () => ({ query: mocks.query, release: mocks.release }) } }));
vi.mock('../../../src/utils/photoStorage.js', () => ({ stagePhoto: mocks.stage, finalizePhoto: mocks.finalize, cleanupStagedPhoto: mocks.cleanup }));
vi.mock('../../../src/services/photo-cleanup.js', () => ({ queuePhotoRemoval: mocks.queue, tryPhotoCleanup: mocks.drain }));
import { uploadPhoto, deletePhoto } from '../../../src/controllers/photo.controller.js';
const url = 'https://res.cloudinary.com/fixture/image/upload/new.jpg';
beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset().mockResolvedValue(undefined);
    mocks.stage.mockResolvedValue({ url, provider: 'cloudinary' });
    mocks.query.mockImplementation(async sql => ({ rows: sql.startsWith('SELECT position') ? [{ position: 1 }, { position: 2 }]
        : sql.startsWith('DELETE FROM') ? [{ url: 'assets/img/profiles/user/old.jpg', position: 1 }] : [] }));
});
afterEach(() => vi.restoreAllMocks());
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });

describe('photo controller storage transactions', () => {
    it('saves a cloud URL and queues the old photo before commit', async () => {
        const res = response(); const next = vi.fn();
        await uploadPhoto({ user: { id: 'user' }, file: {}, body: { position: 1 } }, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(mocks.query).toHaveBeenCalledWith('INSERT INTO user_photos (user_id, url, position) VALUES ($1, $2, $3)', ['user', url, 1]);
        expect(mocks.queue).toHaveBeenCalled();
        expect(mocks.queue.mock.invocationCallOrder[0]).toBeLessThan(mocks.query.mock.invocationCallOrder[mocks.query.mock.calls.findIndex(([sql]) => sql === 'COMMIT')]);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(mocks.cleanup).not.toHaveBeenCalled();
    });
    it('compensates an uploaded photo when SQL commit fails', async () => {
        const base = mocks.query.getMockImplementation();
        mocks.query.mockImplementation((sql, args) => sql === 'COMMIT' ? Promise.reject(new Error('DB failure')) : base(sql, args));
        const next = vi.fn();
        await uploadPhoto({ user: { id: 'user' }, file: {}, body: { position: 1 } }, response(), next);
        expect(next).toHaveBeenCalled();
        expect(mocks.cleanup).toHaveBeenCalledWith({ url, provider: 'cloudinary' }, expect.anything());
    });
    it('never compensates a committed upload after a post-commit error', async () => {
        const next = vi.fn();
        const res = response(); res.json.mockImplementation(() => { throw new Error('Client disconnected'); });
        await uploadPhoto({ user: { id: 'user' }, file: {}, body: { position: 1 } }, res, next);
        expect(mocks.cleanup).not.toHaveBeenCalled();
        expect(mocks.query).not.toHaveBeenCalledWith('ROLLBACK');
    });
    it('leaves existing references intact if the cloud provider is unavailable', async () => {
        mocks.stage.mockRejectedValue(new Error('Storage unavailable'));
        await uploadPhoto({ user: { id: 'user' }, file: {}, body: {} }, response(), vi.fn());
        expect(mocks.query.mock.calls.some(([sql]) => sql.startsWith('DELETE'))).toBe(false);
    });
    it('queues deletion before committing the removed reference', async () => {
        const res = response();
        await deletePhoto({ user: { id: 'user' }, params: { photoId: 'photo' } }, res, vi.fn());
        expect(mocks.queue).toHaveBeenCalledWith(expect.anything(), ['assets/img/profiles/user/old.jpg']);
        expect(res.json).toHaveBeenCalledWith({ message: 'Photo deleted' });
    });
});
