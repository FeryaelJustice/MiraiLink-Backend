import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    deleteFromR2,
    extractR2Key,
    getR2Client,
    isR2Url,
    setR2Client,
    uploadToR2,
} from '../../../src/services/r2StorageService.js';

describe('r2StorageService', () => {
    const originalEnv = { ...process.env };
    let mockSend;

    beforeEach(() => {
        mockSend = vi.fn().mockResolvedValue({});
        setR2Client({ send: mockSend });
        process.env.R2_ENDPOINT = 'https://account-id.r2.cloudflarestorage.com';
        process.env.R2_ACCESS_KEY_ID = 'test-access-key';
        process.env.R2_SECRET_ACCESS_KEY = 'test-secret-key';
        process.env.R2_BUCKET_NAME = 'mirailink-photos';
        process.env.R2_PUBLIC_URL = 'https://pub-photos.r2.dev';
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        setR2Client(null);
    });

    describe('isR2Url', () => {
        it('returns true for urls starting with R2_PUBLIC_URL', () => {
            expect(isR2Url('https://pub-photos.r2.dev/profiles/user-1/photo.jpg')).toBe(true);
        });

        it('returns true for general external http/https urls', () => {
            expect(isR2Url('https://custom-cdn.example.com/profiles/user-1/photo.jpg')).toBe(true);
        });

        it('returns false for local asset paths and local asset full urls', () => {
            expect(isR2Url('assets/img/profiles/user-1/photo.jpg')).toBe(false);
            expect(isR2Url('/assets/img/profiles/user-1/photo.jpg')).toBe(false);
            expect(isR2Url('http://localhost:3000/assets/img/profiles/user-1/photo.jpg')).toBe(false);
        });

        it('returns false for null, undefined or empty strings', () => {
            expect(isR2Url(null)).toBe(false);
            expect(isR2Url(undefined)).toBe(false);
            expect(isR2Url('')).toBe(false);
        });
    });

    describe('extractR2Key', () => {
        it('extracts key matching R2_PUBLIC_URL prefix', () => {
            const key = extractR2Key('https://pub-photos.r2.dev/profiles/user-1/123-photo.jpg');
            expect(key).toBe('profiles/user-1/123-photo.jpg');
        });

        it('extracts key from generic url pathname', () => {
            const key = extractR2Key('https://cdn.example.com/profiles/user-1/123-photo.jpg');
            expect(key).toBe('profiles/user-1/123-photo.jpg');
        });

        it('normalizes relative keys by removing leading slashes', () => {
            expect(extractR2Key('/profiles/user-1/photo.jpg')).toBe('profiles/user-1/photo.jpg');
            expect(extractR2Key('profiles/user-1/photo.jpg')).toBe('profiles/user-1/photo.jpg');
        });

        it('returns null for empty or invalid inputs', () => {
            expect(extractR2Key('')).toBe(null);
            expect(extractR2Key(null)).toBe(null);
        });
    });

    describe('uploadToR2', () => {
        it('sends PutObjectCommand and returns formatted public url', async () => {
            const file = {
                buffer: Buffer.from('fake-image-bytes'),
                mimetype: 'image/jpeg',
                detectedType: { mime: 'image/jpeg', extension: '.jpg' },
            };

            const url = await uploadToR2('user-123', file, 'profiles/user-123/custom-photo.jpg');

            expect(mockSend).toHaveBeenCalledTimes(1);
            const command = mockSend.mock.calls[0][0];
            expect(command.input).toEqual({
                Bucket: 'mirailink-photos',
                Key: 'profiles/user-123/custom-photo.jpg',
                Body: file.buffer,
                ContentType: 'image/jpeg',
            });
            expect(url).toBe('https://pub-photos.r2.dev/profiles/user-123/custom-photo.jpg');
        });
    });

    describe('deleteFromR2', () => {
        it('sends DeleteObjectCommand with extracted key', async () => {
            await deleteFromR2('https://pub-photos.r2.dev/profiles/user-123/old-photo.jpg');

            expect(mockSend).toHaveBeenCalledTimes(1);
            const command = mockSend.mock.calls[0][0];
            expect(command.input).toEqual({
                Bucket: 'mirailink-photos',
                Key: 'profiles/user-123/old-photo.jpg',
            });
        });

        it('does not send command when key cannot be extracted', async () => {
            await deleteFromR2('');
            expect(mockSend).not.toHaveBeenCalled();
        });
    });

    describe('getR2Client initialization', () => {
        it('creates a singleton client instance when none is set', () => {
            setR2Client(null);
            const client = getR2Client();
            expect(client).toBeDefined();
            expect(getR2Client()).toBe(client);
        });
    });
});
