import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
    cleanupStagedPhoto,
    finalizePhoto,
    getStorageDriver,
    removePhotoFile,
    stagePhoto,
} from '../../../src/utils/photoStorage.js';
import * as r2Service from '../../../src/services/r2StorageService.js';

describe('photoStorage', () => {
    const originalEnv = { ...process.env };
    let tempRoot;

    beforeEach(async () => {
        tempRoot = await mkdtemp(join(tmpdir(), 'mirailink-storage-test-'));
        delete process.env.STORAGE_DRIVER;
        delete process.env.R2_BUCKET_NAME;
        delete process.env.R2_ENDPOINT;
        delete process.env.R2_PUBLIC_URL;
    });

    afterEach(async () => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
        if (tempRoot) {
            await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
        }
    });

    describe('getStorageDriver', () => {
        it('defaults to local when no environment variables are configured', () => {
            expect(getStorageDriver()).toBe('local');
        });

        it('returns r2 when STORAGE_DRIVER is explicitly set to r2', () => {
            process.env.STORAGE_DRIVER = 'r2';
            expect(getStorageDriver()).toBe('r2');
        });

        it('infers r2 when bucket and endpoint are configured without explicit STORAGE_DRIVER', () => {
            process.env.R2_BUCKET_NAME = 'test-bucket';
            process.env.R2_ENDPOINT = 'https://account.r2.cloudflarestorage.com';
            expect(getStorageDriver()).toBe('r2');
        });

        it('prefers explicit STORAGE_DRIVER=local even if R2 variables exist', () => {
            process.env.STORAGE_DRIVER = 'local';
            process.env.R2_BUCKET_NAME = 'test-bucket';
            process.env.R2_ENDPOINT = 'https://account.r2.cloudflarestorage.com';
            expect(getStorageDriver()).toBe('local');
        });
    });

    describe('local storage workflow', () => {
        const fakeFile = {
            buffer: Buffer.from('local-image-data'),
            mimetype: 'image/jpeg',
            detectedType: { mime: 'image/jpeg', extension: '.jpg' },
        };

        it('stages, finalizes, and cleans up local photo files', async () => {
            const userId = '00000000-0000-0000-0000-000000000001';
            const staged = await stagePhoto(userId, fakeFile, tempRoot);

            expect(staged.driver).toBe('local');
            expect(staged.url).toContain(userId);
            const stagingContent = await readFile(staged.stagingPath);
            expect(stagingContent.toString()).toBe('local-image-data');

            await finalizePhoto(staged);
            const finalContent = await readFile(staged.finalPath);
            expect(finalContent.toString()).toBe('local-image-data');

            await removePhotoFile(staged.url, tempRoot);
            await expect(readFile(staged.finalPath)).rejects.toThrow();
        });

        it('cleans up staging file on failure', async () => {
            const userId = '00000000-0000-0000-0000-000000000002';
            const staged = await stagePhoto(userId, fakeFile, tempRoot);

            await cleanupStagedPhoto(staged);
            await expect(readFile(staged.stagingPath)).rejects.toThrow();
        });
    });

    describe('R2 storage workflow', () => {
        const fakeFile = {
            buffer: Buffer.from('r2-image-data'),
            mimetype: 'image/png',
            detectedType: { mime: 'image/png', extension: '.png' },
        };

        beforeEach(() => {
            process.env.STORAGE_DRIVER = 'r2';
            process.env.R2_PUBLIC_URL = 'https://pub-photos.r2.dev';
        });

        it('delegates stagePhoto to uploadToR2 and returns driver r2 metadata', async () => {
            vi.spyOn(r2Service, 'uploadToR2').mockResolvedValue('https://pub-photos.r2.dev/profiles/user-99/test.png');

            const staged = await stagePhoto('user-99', fakeFile, tempRoot);

            expect(staged.driver).toBe('r2');
            expect(staged.url).toBe('https://pub-photos.r2.dev/profiles/user-99/test.png');
            expect(staged.key).toContain('profiles/user-99/');
            expect(r2Service.uploadToR2).toHaveBeenCalledTimes(1);

            // finalizePhoto is a no-op for R2
            await expect(finalizePhoto(staged)).resolves.not.toThrow();
        });

        it('delegates removePhotoFile to deleteFromR2 for remote urls', async () => {
            const deleteSpy = vi.spyOn(r2Service, 'deleteFromR2').mockResolvedValue();

            await removePhotoFile('https://pub-photos.r2.dev/profiles/user-99/test.png', tempRoot);

            expect(deleteSpy).toHaveBeenCalledWith('https://pub-photos.r2.dev/profiles/user-99/test.png');
        });

        it('delegates cleanupStagedPhoto to deleteFromR2 using staged.key', async () => {
            const deleteSpy = vi.spyOn(r2Service, 'deleteFromR2').mockResolvedValue();

            const staged = {
                driver: 'r2',
                key: 'profiles/user-99/staged-photo.png',
                url: 'https://pub-photos.r2.dev/profiles/user-99/staged-photo.png',
            };

            await cleanupStagedPhoto(staged);

            expect(deleteSpy).toHaveBeenCalledWith('profiles/user-99/staged-photo.png');
        });
    });
});
