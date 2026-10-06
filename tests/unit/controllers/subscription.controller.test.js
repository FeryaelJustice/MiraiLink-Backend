import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
const verifyAndSavePurchase = vi.fn();
vi.mock('../../../src/services/play-billing.js', () => ({ verifyAndSavePurchase }));
vi.mock('../../../src/models/db.js', () => ({ default: { query } }));

const {
    cancelSubscriptionIntent,
    getSubscriptionStatus,
    verifySubscription,
} = await import('../../../src/controllers/subscription.controller.js');

const userId = '00000000-0000-4000-8000-000000000001';

function mockRequest({ body = {} } = {}) {
    return {
        user: { id: userId },
        body,
    };
}

function mockResponse() {
    return {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
    };
}

describe('subscription.controller', () => {
    beforeEach(() => {
        query.mockReset();
        verifyAndSavePurchase.mockReset();
    });

    describe('getSubscriptionStatus', () => {
        it('returns free plan when user has no subscription record', async () => {
            query.mockResolvedValueOnce({ rows: [] });

            const req = mockRequest();
            const res = mockResponse();
            const next = vi.fn();

            await getSubscriptionStatus(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                isPremium: false,
                plan: 'free',
                status: 'free',
                autoRenewing: false,
            }));
            expect(next).not.toHaveBeenCalled();
        });

        it('returns premium plan when user has an active non-expired subscription', async () => {
            const futureDate = new Date(Date.now() + 86400000 * 20).toISOString();
            query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'sub-1',
                        product_id: 'mirailink_premium',
                        base_plan_id: 'monthly-autorenew',
                        status: 'active', provider_verified: true,
                        auto_renewing: true,
                        expires_at: futureDate,
                        created_at: new Date().toISOString(),
                    },
                ],
            });

            const req = mockRequest();
            const res = mockResponse();
            const next = vi.fn();

            await getSubscriptionStatus(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                isPremium: true,
                plan: 'premium',
                status: 'active',
                productId: 'mirailink_premium',
                basePlanId: 'monthly-autorenew',
                autoRenewing: true,
            }));
        });

        it('returns free plan when subscription status is active but expires_at is in the past', async () => {
            const pastDate = new Date(Date.now() - 86400000).toISOString();
            query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'sub-2',
                        product_id: 'mirailink_premium',
                        base_plan_id: 'monthly-autorenew',
                        status: 'active', provider_verified: true,
                        auto_renewing: false,
                        expires_at: pastDate,
                        created_at: new Date().toISOString(),
                    },
                ],
            });

            const req = mockRequest();
            const res = mockResponse();
            const next = vi.fn();

            await getSubscriptionStatus(req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                isPremium: false,
                plan: 'free',
            }));
        });
    });

    describe('verifySubscription', () => {
        it('returns verified provider status and propagates rejection', async () => {
            verifyAndSavePurchase.mockResolvedValueOnce({ provider_verified: true, product_id: 'mirailink_plus', status: 'active', expires_at: new Date(Date.now()+86400000).toISOString() });
            const res=mockResponse(); const next=vi.fn();
            await verifySubscription(mockRequest({body:{purchaseToken:'token',productId:'mirailink_plus'}}),res,next);
            expect(verifyAndSavePurchase).toHaveBeenCalledWith(userId,'token','mirailink_plus');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({isPlus:true,isPremium:false}));
            verifyAndSavePurchase.mockRejectedValueOnce(new Error('invalid'));
            await verifySubscription(mockRequest(),res,next);
            expect(next).toHaveBeenCalledOnce();
        });
    });

    describe('cancelSubscriptionIntent', () => {
        it('marks auto_renewing false and returns Google Play Store link', async () => {
            query.mockResolvedValueOnce({
                rows: [{ product_id: 'mirailink_premium' }],
            });

            const req = mockRequest();
            const res = mockResponse();
            const next = vi.fn();

            await cancelSubscriptionIntent(req, res, next);

            expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE user_subscriptions'), [userId]);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Cancellation intent registered',
                playStoreUrl: expect.stringContaining('https://play.google.com/store/account/subscriptions'),
            }));
        });
    });
});
