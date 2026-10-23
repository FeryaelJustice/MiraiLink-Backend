import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { query, verify } = vi.hoisted(() => ({ query: vi.fn(), verify: vi.fn() }));
vi.mock('../../src/models/db.js', () => ({ default: { query } }));
vi.mock('../../src/services/play-billing.js', () => ({ verifyAndSavePurchase: verify, googlePlayNotification: vi.fn() }));
const { createApp } = await import('../../src/app.js');
const { AppError } = await import('../../src/errors/AppError.js');
const app = createApp({ enableRateLimits: false, uploadRoot: process.env.TEMP });
const user = '00000000-0000-4000-8000-000000000001';
const bearer = () => 'Bearer ' + jwt.sign({ id: user, purpose: 'access' }, process.env.JWT_SECRET);
const subscription = (product = 'mirailink_premium') => ({
    product_id: product, base_plan_id: 'monthly-autorenew', provider_verified: true,
    status: 'active', expires_at: new Date(Date.now() + 86400000).toISOString(),
    provider_state: 'SUBSCRIPTION_STATE_CANCELED', auto_renewing: false,
    acknowledgement_pending: false, purchase_token: 'PRIVATE',
});
beforeEach(() => {
    query.mockReset();
    verify.mockReset();
    query.mockImplementation(async sql => {
        if (sql.includes('token_blacklist')) return { rows: [], rowCount: 0 };
        if (sql.includes('FROM users u')) return { rows: [{ is_verified: true, is_deleted: false }], rowCount: 1 };
        return { rows: [subscription()], rowCount: 1 };
    });
});

describe('subscription HTTP contract', () => {
    it('requires authentication', async () => {
        const res = await request(app).get('/api/subscription/status');
        expect(res.status).toBe(401);
    });
    it('returns original Google state separately from current Premium access, including Plus', async () => {
        const res = await request(app).get('/api/subscription/status').set('Authorization', bearer());
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ isPremium: true, isPlus: true, hasAccess: true, status: 'active', providerState: 'SUBSCRIPTION_STATE_CANCELED' });
        expect(res.headers['x-subscription-plan']).toBe('premium');
        expect(JSON.stringify(res.body)).not.toContain('PRIVATE');
    });
    it('returns a free status when there is no purchase', async () => {
        const base = query.getMockImplementation();
        query.mockImplementation(sql => sql.includes('FROM user_subscriptions WHERE') ? { rows: [] } : base(sql));
        const res = await request(app).get('/api/subscription/status').set('Authorization', bearer());
        expect(res.body).toMatchObject({ status: 'free', hasAccess: false, providerState: null, acknowledgementPending: false });
        expect(res.headers['x-subscription-plan']).toBe('free');
    });
    it('reports a saved subscription awaiting confirmation', async () => {
        verify.mockResolvedValue({ ...subscription(), acknowledgement_pending: true });
        const res = await request(app).post('/api/subscription/verify').set('Authorization', bearer())
            .send({ productId: 'mirailink_premium', purchaseToken: 'purchase' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ plan: 'premium', acknowledgementPending: true });
        expect(res.body).not.toHaveProperty('verifiedPurchase');
    });
    it('rejects malformed requests before purchase verification', async () => {
        const res = await request(app).post('/api/subscription/verify').set('Authorization', bearer()).send({ purchaseToken: '' });
        expect(res.status).toBe(400);
        expect(verify).not.toHaveBeenCalled();
    });
    it('preserves normalized verification errors', async () => {
        verify.mockRejectedValue(new AppError({ status: 403, code: 'PURCHASE_ALREADY_BOUND', message: 'Purchase belongs to another account' }));
        const res = await request(app).post('/api/subscription/verify').set('Authorization', bearer()).send({ productId: 'mirailink_plus', purchaseToken: 'purchase' });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('PURCHASE_ALREADY_BOUND');
    });
    it('returns the provider management link and records only intent', async () => {
        const res = await request(app).post('/api/subscription/cancel-intent').set('Authorization', bearer()).send({});
        expect(res.status).toBe(200);
        expect(res.body.playStoreUrl).toContain('sku=mirailink_premium');
        const sql = query.mock.calls.find(([sql]) => sql.includes('cancellation_intent_at'))[0];
        expect(sql).not.toMatch(/SET\s+auto_renewing/);
    });
});
