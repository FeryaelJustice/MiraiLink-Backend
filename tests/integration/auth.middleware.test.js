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

    it('sets subscription headers and req.user.subscription when authenticated', async () => {
        const jwt = (await import('jsonwebtoken')).default;
        const validToken = jwt.sign({ id: 'user-123', purpose: 'access' }, process.env.JWT_SECRET || 'test-secret', { algorithm: 'HS256' });

        process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

        // 1. blacklist check -> not blacklisted
        query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        // 2. user & subscription check -> active premium
        query.mockResolvedValueOnce({
            rows: [{
                is_verified: true,
                is_deleted: false,
                subscription_product_id: 'mirailink_premium',
                subscription_status: 'active',
                subscription_expires_at: new Date(Date.now() + 86400000).toISOString(),
            }],
            rowCount: 1,
        });

        const req = { headers: { authorization: `Bearer ${validToken}` } };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            setHeader: vi.fn(),
        };
        const next = vi.fn();

        await authenticateToken()(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.setHeader).toHaveBeenCalledWith('X-Subscription-Plan', 'premium');
        expect(req.user.subscription).toEqual({
            isPremium: true,
            isPlus: true,
            plan: 'premium',
        });
    });
});

