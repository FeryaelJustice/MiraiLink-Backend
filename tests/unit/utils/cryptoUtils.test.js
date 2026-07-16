import { describe, expect, it } from 'vitest';
import { decrypt, encrypt } from '../../../src/utils/cryptoUtils.js';

describe('2FA secret encryption', () => {
    it('uses a random authenticated nonce for every encryption', () => {
        const first = encrypt('totp-secret');
        const second = encrypt('totp-secret');

        expect(first).toMatch(/^v2:[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
        expect(second).not.toBe(first);
        expect(decrypt(first)).toBe('totp-secret');
        expect(decrypt(second)).toBe('totp-secret');
    });

    it('rejects tampered ciphertext', () => {
        const encrypted = encrypt('totp-secret');
        const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('0') ? '1' : '0'}`;

        expect(() => decrypt(tampered)).toThrow();
    });
});
