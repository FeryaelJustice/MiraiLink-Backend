import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();

vi.mock('../../src/models/db.js', () => ({
    default: { query },
}));

const { authenticateToken } = await import('../../src/middleware/auth.middleware.js');

function responseDouble() {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
}

describe('authenticateToken', () => {
    beforeEach(() => {
        query.mockReset();
    });

    it('keeps a blacklisted token revoked across repeated requests', async () => {
        query.mockResolvedValue({ rows: [{ exists: true }], rowCount: 1 });
        const middleware = authenticateToken(true);

        for (let attempt = 0; attempt < 2; attempt += 1) {
            const req = { headers: { authorization: 'Bearer revoked-token' } };
            const res = responseDouble();
            const next = vi.fn();

            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                code: 'TOKEN_REVOKED',
                message: 'Token has been invalidated',
            });
            expect(next).not.toHaveBeenCalled();
        }

        expect(query).toHaveBeenCalledTimes(2);
        expect(query.mock.calls.every(([sql]) => !sql.includes('DELETE'))).toBe(true);
    });

    it('never serializes the JWT verification error', async () => {
        query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        const req = { headers: { authorization: 'Bearer malformed' } };
        const res = responseDouble();

        await authenticateToken(true)(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
        });
    });
});
