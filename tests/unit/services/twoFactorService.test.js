import { describe, expect, it, vi } from 'vitest';
import { hashRecoveryCodes, useRecoveryCode } from '../../../src/services/twoFactorService.js';

describe('twoFactorService recovery codes', () => {
    it('hashes recovery codes before persistence', async () => {
        const entries = await hashRecoveryCodes(['code-one', 'code-two']);
        expect(entries).toHaveLength(2);
        expect(entries.every(entry => entry.startsWith('$2'))).toBe(true);
        expect(entries).not.toContain('code-one');
    });

    it('marks only the matching unused hash as consumed', async () => {
        const [hash] = await hashRecoveryCodes(['one-time-code']);
        const query = vi.fn()
            .mockResolvedValueOnce({ rows: [{ id: 'recovery-1', code_hash: hash }] })
            .mockResolvedValueOnce({ rowCount: 1 });

        await expect(useRecoveryCode({ query }, 'user-1', 'one-time-code')).resolves.toBe(true);
        expect(query.mock.calls[1][0]).toContain('used = TRUE');
        expect(query.mock.calls[1][1]).toEqual(['recovery-1']);
    });
});
