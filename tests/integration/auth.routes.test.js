import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
vi.mock('../../src/models/db.js', () => ({ default: { query } }));
vi.mock('../../src/utils/mailer.js', () => ({ sendVerificationEmail: vi.fn() }));

const { login } = await import('../../src/controllers/auth.controller.js');

function responseDouble() {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
}

describe('authentication routes', () => {
    beforeEach(() => query.mockReset());

    it('returns a challenge instead of an access token when 2FA is enabled', async () => {
        const passwordHash = await bcrypt.hash('correct-password', 4);
        query.mockResolvedValueOnce({
            rowCount: 1,
            rows: [{
                id: '00000000-0000-4000-8000-000000000001',
                username: 'mirai',
                password_hash: passwordHash,
                is_deleted: false,
                two_fa_enabled: true,
            }],
        });
        const res = responseDouble();

        await login({ body: { username: 'mirai', password: 'correct-password' } }, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            requires2FA: true,
            challengeToken: expect.any(String),
        }));
        expect(res.json.mock.calls[0][0]).not.toHaveProperty('token');
    });
});
