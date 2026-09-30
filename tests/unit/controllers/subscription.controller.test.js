import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
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
    };
}

describe('subscription.controller', () => {
    beforeEach(() => {
        query.mockReset();
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
                        status: 'active',
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
                        status: 'active',
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
        it('persists purchase and returns active premium status', async () => {
            const futureExpiresAt = new Date(Date.now() + 86400000 * 30).toISOString();
            query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'sub-new',
                        product_id: 'mirailink_premium',
                        base_plan_id: 'monthly-autorenew',
                        status: 'active',
                        auto_renewing: true,
                        expires_at: futureExpiresAt,
                    },
                ],
            });

            const req = mockRequest({
                body: {
                    purchaseToken: 'play_token_xyz',
                    productId: 'mirailink_premium',
                    basePlanId: 'monthly-autorenew',
                    orderId: 'GPA.9999-1111',
                },
            });
            const res = mockResponse();
            const next = vi.fn();

            await verifySubscription(req, res, next);

            expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_subscriptions'), [
                userId,
                'mirailink_premium',
                'monthly-autorenew',
                'play_token_xyz',
                'GPA.9999-1111',
                '30 days',
            ]);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                isPremium: true,
                plan: 'premium',
                status: 'active',
                productId: 'mirailink_premium',
                autoRenewing: true,
            }));
        });

        it('assigns 90 days interval for threee-month-autorenew basePlanId', async () => {
            query.mockResolvedValueOnce({
                rows: [
                    {
                        id: 'sub_2',
                        product_id: 'mirailink_premium',
                        base_plan_id: 'threee-month-autorenew',
                        status: 'active',
                        auto_renewing: true,
                        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                ],
            });

            const req = mockRequest({
                body: {
                    purchaseToken: 'token_3m',
                    productId: 'mirailink_premium',
                    basePlanId: 'threee-month-autorenew',
                    orderId: 'GPA.3333-3333',
                },
            });
            const res = mockResponse();
            const next = vi.fn();

            await verifySubscription(req, res, next);

            expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_subscriptions'), [
                userId,
                'mirailink_premium',
                'threee-month-autorenew',
                'token_3m',
                'GPA.3333-3333',
                '90 days',
            ]);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                isPremium: true,
                plan: 'premium',
                status: 'active',
                basePlanId: 'threee-month-autorenew',
            }));
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
