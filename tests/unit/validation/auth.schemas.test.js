import { describe, it, expect } from 'vitest';
import { registerSchema, passwordResetSchema } from '../../../src/validation/auth.schemas.js';

describe('auth.schemas password validation', () => {
    it('accepts valid password with at least 8 characters and non-trivial pattern', () => {
        const validData = {
            username: 'alice',
            email: 'alice@example.com',
            password: 'MySecretPassword1!',
        };
        const result = registerSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it('rejects passwords shorter than 8 characters', () => {
        const shortData = {
            username: 'alice',
            email: 'alice@example.com',
            password: 'Short1!',
        };
        const result = registerSchema.safeParse(shortData);
        expect(result.success).toBe(false);
    });

    it('rejects trivial sequential patterns like 12345678 or repeated characters', () => {
        const sequentialData = {
            username: 'alice',
            email: 'alice@example.com',
            password: '12345678',
        };
        const repeatedData = {
            username: 'alice',
            email: 'alice@example.com',
            password: 'aaaaaaaa',
        };
        expect(registerSchema.safeParse(sequentialData).success).toBe(false);
        expect(registerSchema.safeParse(repeatedData).success).toBe(false);
    });

    it('validates passwordResetSchema newPassword', () => {
        const validReset = {
            email: 'alice@example.com',
            token: '123456',
            newPassword: 'NewSecurePassword123!',
        };
        expect(passwordResetSchema.safeParse(validReset).success).toBe(true);

        const trivialReset = {
            email: 'alice@example.com',
            token: '123456',
            newPassword: '12345678',
        };
        expect(passwordResetSchema.safeParse(trivialReset).success).toBe(false);
    });

    it('rejects passwords containing suspicious SQL injection patterns', () => {
        const sqlInjectionData = {
            username: 'alice',
            email: 'alice@example.com',
            password: 'MyPassword123;drop table users',
        };
        const semicolonData = {
            username: 'alice',
            email: 'alice@example.com',
            password: 'MyPassword123;',
        };
        expect(registerSchema.safeParse(sqlInjectionData).success).toBe(false);
        expect(registerSchema.safeParse(semicolonData).success).toBe(false);
    });
});
