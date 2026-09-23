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
