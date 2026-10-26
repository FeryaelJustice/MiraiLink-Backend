import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), release: vi.fn(), remove: vi.fn() }));
vi.mock('../../../src/models/db.js', () => ({ default: { connect: async () => ({ query: mocks.query, release: mocks.release }) } }));
vi.mock('../../../src/utils/photoStorage.js', () => ({ removePhotoFile: mocks.remove }));
import { drainPhotoCleanup, queuePhotoRemoval } from '../../../src/services/photo-cleanup.js';
beforeEach(() => {
    mocks.query.mockReset().mockImplementation(async sql => ({ rows: sql.startsWith('SELECT url') ? [{ url: 'photo-1' }] : [] }));
    mocks.remove.mockReset().mockResolvedValue(undefined);
    mocks.release.mockReset();
});
describe('durable photo cleanup', () => {
    it('keeps referenced resources and clears their obsolete cleanup request', async () => {
        const base = mocks.query.getMockImplementation();
        mocks.query.mockImplementation((sql, args) => sql.startsWith('SELECT 1') ? { rows: [{}] } : base(sql, args));
        expect(await drainPhotoCleanup()).toBe(0);
        expect(mocks.remove).not.toHaveBeenCalled();
        expect(mocks.query).toHaveBeenCalledWith('DELETE FROM photo_cleanup_jobs WHERE url=$1', ['photo-1']);
    });
    it('retries a failed deletion without removing the durable job', async () => {
        mocks.remove.mockRejectedValue(new Error('Provider offline'));
        expect(await drainPhotoCleanup()).toBe(0);
        expect(mocks.query.mock.calls.some(([sql]) => sql.startsWith('UPDATE photo_cleanup_jobs'))).toBe(true);
        expect(mocks.query.mock.calls.some(([sql]) => sql.startsWith('DELETE'))).toBe(false);
        expect(mocks.query).toHaveBeenCalledWith('COMMIT');
        expect(mocks.release).toHaveBeenCalledOnce();
    });
    it('uses the held database client for removal to avoid nested pool exhaustion', async () => {
        expect(await drainPhotoCleanup()).toBe(1);
        expect(mocks.remove).toHaveBeenCalledWith('photo-1', undefined, expect.objectContaining({ query: mocks.query }));
    });
    it('queues a shared URL only once in the caller transaction', async () => {
        await queuePhotoRemoval({ query: mocks.query }, ['photo-1', 'photo-1']);
        expect(mocks.query).toHaveBeenCalledOnce();
    });
});
