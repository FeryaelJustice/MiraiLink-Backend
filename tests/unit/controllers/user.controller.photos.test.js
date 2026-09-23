import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientQuery = vi.fn();
const clientRelease = vi.fn();
const mockClient = {
    query: clientQuery,
    release: clientRelease,
};

vi.mock('../../../src/models/db.js', () => ({
    default: {
        connect: vi.fn().mockResolvedValue(mockClient),
        query: vi.fn(),
    },
}));

vi.mock('../../../src/utils/photoStorage.js', () => ({
    stagePhoto: vi.fn().mockImplementation((userId, file) => Promise.resolve({
        filename: 'new-photo.jpg',
        url: `assets/img/profiles/${userId}/new-photo.jpg`,
    })),
    finalizePhoto: vi.fn().mockResolvedValue(undefined),
    removePhotoFile: vi.fn().mockResolvedValue(undefined),
    cleanupStagedPhoto: vi.fn().mockResolvedValue(undefined),
}));

const { updateProfile } = await import('../../../src/controllers/user.controller.js');
const userId = '00000000-0000-4000-8000-000000000001';

describe('updateProfile photo reordering and compacting', () => {
    beforeEach(() => {
        clientQuery.mockReset();
        clientRelease.mockReset();
        clientQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    });

    it('reorders existing photos and updates their positions in user_photos', async () => {
        // Mock existing photos in DB
        const currentPhotos = [
            { id: 'p1', user_id: userId, url: `assets/img/profiles/${userId}/photo1.jpg`, position: 1 },
            { id: 'p2', user_id: userId, url: `assets/img/profiles/${userId}/photo2.jpg`, position: 2 },
        ];

        // Mock queries within updateProfile:
        // 1. users UPDATE
        // 2. SELECT id, url, position FROM user_photos
        // 3. DELETE FROM user_photos
        // 4. INSERT photo2 at 1
        // 5. INSERT photo1 at 2
        // 6. COMMIT
        clientQuery.mockImplementation((sql, params) => {
            if (sql.includes('SELECT id, url, position FROM user_photos')) {
                return Promise.resolve({ rows: currentPhotos });
            }
            return Promise.resolve({ rows: [], rowCount: 1 });
        });

        const req = {
            user: { id: userId },
            body: {
                reorderedPositions: JSON.stringify([
                    { url: `http://localhost:3000/assets/img/profiles/${userId}/photo2.jpg`, position: 1 },
                    { url: `http://localhost:3000/assets/img/profiles/${userId}/photo1.jpg`, position: 2 },
                ]),
            },
            files: {},
        };
        const res = { json: vi.fn() };
        const next = vi.fn();

        await updateProfile(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({ message: 'Profile updated' });

        const deleteCalls = clientQuery.mock.calls.filter(([sql]) => sql.includes('DELETE FROM user_photos'));
        expect(deleteCalls.length).toBe(1);

        const insertCalls = clientQuery.mock.calls.filter(([sql]) => sql.includes('INSERT INTO user_photos'));
        expect(insertCalls.length).toBe(2);

        // First insert: photo2 at pos 1
        expect(insertCalls[0][1]).toEqual([userId, `assets/img/profiles/${userId}/photo2.jpg`, 1]);
        // Second insert: photo1 at pos 2
        expect(insertCalls[1][1]).toEqual([userId, `assets/img/profiles/${userId}/photo1.jpg`, 2]);
    });

    it('compacts photos when an uploaded photo has a non-contiguous index', async () => {
        const currentPhotos = [
            { id: 'p1', user_id: userId, url: `assets/img/profiles/${userId}/photo1.jpg`, position: 1 },
            { id: 'p2', user_id: userId, url: `assets/img/profiles/${userId}/photo2.jpg`, position: 2 },
        ];

        clientQuery.mockImplementation((sql) => {
            if (sql.includes('SELECT id, url, position FROM user_photos')) {
                return Promise.resolve({ rows: currentPhotos });
            }
            return Promise.resolve({ rows: [], rowCount: 1 });
        });

        // Photo uploaded at slot 4 (photo_3) while user only had 1 and 2
        const req = {
            user: { id: userId },
            body: {
                reorderedPositions: JSON.stringify([
                    { url: `assets/img/profiles/${userId}/photo1.jpg`, position: 1 },
                    { url: `assets/img/profiles/${userId}/photo2.jpg`, position: 2 },
                ]),
            },
            files: {
                photo_3: [{ buffer: Buffer.from('test'), detectedType: { extension: '.jpg' } }],
            },
        };
        const res = { json: vi.fn() };
        const next = vi.fn();

        await updateProfile(req, res, next);

        expect(next).not.toHaveBeenCalled();
        const insertCalls = clientQuery.mock.calls.filter(([sql]) => sql.includes('INSERT INTO user_photos'));
        expect(insertCalls.length).toBe(3);

        // Compacted to positions 1, 2, 3!
        expect(insertCalls[0][1]).toEqual([userId, `assets/img/profiles/${userId}/photo1.jpg`, 1]);
        expect(insertCalls[1][1]).toEqual([userId, `assets/img/profiles/${userId}/photo2.jpg`, 2]);
        expect(insertCalls[2][1]).toEqual([userId, `assets/img/profiles/${userId}/new-photo.jpg`, 3]);
    });

    it('handles swapping newly uploaded photo with existing photo', async () => {
        // User had 1 and 2, uploads new photo at slot 4, then reorders it to position 2 and photo 2 to position 3
        const currentPhotos = [
            { id: 'p1', user_id: userId, url: `assets/img/profiles/${userId}/photo1.jpg`, position: 1 },
            { id: 'p2', user_id: userId, url: `assets/img/profiles/${userId}/photo2.jpg`, position: 2 },
        ];

        clientQuery.mockImplementation((sql) => {
            if (sql.includes('SELECT id, url, position FROM user_photos')) {
                return Promise.resolve({ rows: currentPhotos });
            }
            return Promise.resolve({ rows: [], rowCount: 1 });
        });

        // New photo uploaded at position 2 (photo_1 in request), photo2 moved to pos 3
        const req = {
            user: { id: userId },
            body: {
                reorderedPositions: JSON.stringify([
                    { url: `assets/img/profiles/${userId}/photo1.jpg`, position: 1 },
                    { url: `assets/img/profiles/${userId}/photo2.jpg`, position: 3 },
                ]),
            },
            files: {
                photo_1: [{ buffer: Buffer.from('test'), detectedType: { extension: '.jpg' } }],
            },
        };
        const res = { json: vi.fn() };
        const next = vi.fn();

        await updateProfile(req, res, next);

        expect(next).not.toHaveBeenCalled();
        const insertCalls = clientQuery.mock.calls.filter(([sql]) => sql.includes('INSERT INTO user_photos'));
        expect(insertCalls.length).toBe(3);

        // Position 1: photo1
        expect(insertCalls[0][1]).toEqual([userId, `assets/img/profiles/${userId}/photo1.jpg`, 1]);
        // Position 2: new uploaded photo
        expect(insertCalls[1][1]).toEqual([userId, `assets/img/profiles/${userId}/new-photo.jpg`, 2]);
        // Position 3: photo2
        expect(insertCalls[2][1]).toEqual([userId, `assets/img/profiles/${userId}/photo2.jpg`, 3]);
    });
});
