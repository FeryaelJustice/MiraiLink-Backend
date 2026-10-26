import bcrypt from 'bcrypt';
import { describe, expect, it, vi } from 'vitest';
import { consumeEmailChallenge, storeEmailChallenge } from '../../../src/services/twoFactorEmailService.js';

describe('2FA email confirmations', () => {
    it.each([
        { ready: true, valid: false, attempts: 0 },
        { ready: false, valid: true, attempts: 0 },
        { ready: true, valid: true, attempts: 5 },
    ])('rejects an unavailable challenge %j without mutation', async row => {
        const client = { query: vi.fn().mockResolvedValue({ rows: [row] }) };
        expect(await consumeEmailChallenge(client, 'u', 'enable', '123456')).toBe(false);
        expect(client.query).toHaveBeenCalledTimes(1);
    });
    it('rejects a challenge for a different user or purpose', async () => {
        const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
        expect(await consumeEmailChallenge(client, 'other', 'disable', '123456')).toBe(false);
        expect(client.query.mock.calls[0][1]).toEqual(['other', 'disable']);
    });
    it.each([['000000', true], ['123456', false]])('counts a failed email or authenticator proof', async (code, totp) => {
        const hash = await bcrypt.hash('123456', 4);
        const client = { query: vi.fn().mockResolvedValueOnce({ rows: [{ ready: true, valid: true, attempts: 4, token_hash: hash }] }).mockResolvedValue({}) };
        expect(await consumeEmailChallenge(client, 'u', 'enable', code, totp)).toBe(false);
        expect(client.query.mock.calls[1][0]).toContain('attempts + 1');
    });
    it('consumes a matching code under a row lock', async () => {
        const hash = await bcrypt.hash('123456', 4);
        const client = { query: vi.fn().mockResolvedValueOnce({ rows: [{ ready: true, valid: true, attempts: 0, token_hash: hash }] }).mockResolvedValue({}) };
        expect(await consumeEmailChallenge(client, 'u', 'disable', '123456')).toBe(true);
        expect(client.query.mock.calls[0][0]).toContain('FOR UPDATE');
        expect(client.query.mock.calls[1][0]).toContain('DELETE');
    });
    it('stores only a hash with five minute validity and resets previous challenge', async () => {
        const client = { query: vi.fn()
            .mockResolvedValueOnce({ rows: [{ id: 'u', email: 'user@example.com', is_verified: true }] })
            .mockResolvedValueOnce({ rows: [{ enabled: false }] })
            .mockResolvedValue({}) };
        const result = await storeEmailChallenge(client, 'u', 'enable');
        expect(result.code).toMatch(/^\d{6}$/);
        expect(result.hash).not.toBe(result.code);
        expect(await bcrypt.compare(result.code, result.hash)).toBe(true);
        expect(client.query.mock.calls[2][0]).toContain("INTERVAL '5 minutes'");
        expect(client.query.mock.calls[2][0]).toContain('ON CONFLICT');
        expect(client.query.mock.calls[2][1]).toEqual(['u', 'enable', result.hash]);
    });
    it('rejects unverified accounts', async () => {
        const client = { query: vi.fn().mockResolvedValue({ rows: [{ is_verified: false }] }) };
        await expect(storeEmailChallenge(client, 'u', 'disable')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
});
