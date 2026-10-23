import { describe, expect, it } from 'vitest';
import { parseEnv } from '../../../src/config/env.js';

const validEnv = {
    DB_URL: 'postgres://postgres:postgres@localhost:5432/mirailink',
    JWT_SECRET: 'a-secure-jwt-secret-with-at-least-32-characters',
    ORIGIN: 'https://app.mirailink.example,http://localhost:5173',
    SALT_ROUNDS: '12',
    SECRET_2FA_KEY: 'ab'.repeat(32),
    SECRET_2FA_IV: 'cd'.repeat(16),
};

describe('parseEnv', () => {
    it('normalizes a valid environment', () => {
        const config = parseEnv(validEnv);

        expect(config.port).toBe(3000);
        expect(config.trustProxy).toBe('loopback');
        expect(config.corsOrigins).toEqual([
            'https://app.mirailink.example',
            'http://localhost:5173',
        ]);
        expect(config.bcryptRounds).toBe(12);
        expect(config.uploadMaxBytes).toBe(5 * 1024 * 1024);
        expect(config.globalRateLimit).toEqual({
            max: 1000,
            windowMs: 15 * 60 * 1000,
        });
        expect(config.storage.driver).toBe('local');
    });

    it('accepts ORIGIN_REGEX and custom rate limits', () => {
        const config = parseEnv({
            ...validEnv,
            ORIGIN_REGEX: '^https:\\/\\/.*\\.mirailink\\.xyz$',
            GLOBAL_RATE_LIMIT_MAX: '500',
            GLOBAL_RATE_LIMIT_WINDOW_MS: '60000',
        });

        expect(config.originRegex).toBe('^https:\\/\\/.*\\.mirailink\\.xyz$');
        expect(config.globalRateLimit).toEqual({
            max: 500,
            windowMs: 60000,
        });
    });

    it('configures Cloudflare R2 when STORAGE_DRIVER is r2 with required fields', () => {
        const config = parseEnv({
            ...validEnv,
            STORAGE_DRIVER: 'r2',
            R2_ENDPOINT: 'https://account-id.r2.cloudflarestorage.com',
            R2_ACCESS_KEY_ID: 'access-key',
            R2_SECRET_ACCESS_KEY: 'secret-key',
            R2_BUCKET_NAME: 'mirailink-bucket',
            R2_PUBLIC_URL: 'https://pub-photos.r2.dev',
        });

        expect(config.storage).toEqual({
            driver: 'r2',
            r2Endpoint: 'https://account-id.r2.cloudflarestorage.com',
            r2AccessKeyId: 'access-key',
            r2SecretAccessKey: 'secret-key',
            r2BucketName: 'mirailink-bucket',
            r2PublicUrl: 'https://pub-photos.r2.dev',
        });
    });

    it('rejects STORAGE_DRIVER=r2 when required fields are missing', () => {
        expect(() => parseEnv({
            ...validEnv,
            STORAGE_DRIVER: 'r2',
            R2_BUCKET_NAME: 'mirailink-bucket',
        })).toThrow(/required when STORAGE_DRIVER is r2/);
    });

    it('rejects a short JWT secret', () => {
        expect(() => parseEnv({
            ...validEnv,
            JWT_SECRET: 'short',
        })).toThrow(/JWT_SECRET/);
    });

    it('rejects malformed 2FA key material', () => {
        expect(() => parseEnv({
            ...validEnv,
            SECRET_2FA_KEY: 'not-hex',
        })).toThrow(/SECRET_2FA_KEY/);
    });

    it('rejects invalid CORS origins', () => {
        expect(() => parseEnv({
            ...validEnv,
            ORIGIN: 'not-a-url',
        })).toThrow(/ORIGIN/);
    });
});
