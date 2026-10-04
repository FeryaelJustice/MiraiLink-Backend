import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
const clientQuery = vi.fn();
const clientRelease = vi.fn();
const mockClient = {
    query: clientQuery,
    release: clientRelease,
};
const connect = vi.fn().mockResolvedValue(mockClient);
vi.mock('../../../src/models/db.js', () => ({ default: { query, connect } }));

const { getFeed, likeUser, getUndoQuota, undoSwipe } = await import('../../../src/controllers/swipe.controller.js');
const userId = '00000000-0000-4000-8000-000000000001';

function request(queryParams = {}) {
    return {
        user: { id: userId },
        query: { limit: 10, offset: 0, ...queryParams },
        get: vi.fn().mockReturnValue('es'),
    };
}

function response() {
    return { json: vi.fn() };
}

const baseUser = {
    residence_country_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    residence_latitude: 43.6047,
    residence_longitude: 1.4442,
    current_latitude: 39.5696,
    current_longitude: 2.6502,
    last_location_updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    search_radius_km: 100,
    search_scope: 'radius',
    search_target_country_id: null,
    search_match_live_location: false,
};

describe('getFeed geographic contract', () => {
    beforeEach(() => query.mockReset());

    it('uses residence for both sides and parameterizes radius search', async () => {
        query.mockResolvedValueOnce({ rows: [baseUser] }).mockResolvedValueOnce({ rows: [] });
        const res = response();
        const next = vi.fn();

        await getFeed(request(), res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith([]);
        const [sql, params] = query.mock.calls[1];
        expect(sql).toContain('u.residence_latitude AS candidate_latitude');
        expect(sql).toContain('distance_km <= $6');
        expect(sql).not.toContain('43.6047');
        expect(params).toEqual([userId, 10, 0, 43.6047, 1.4442, 100, 'es']);
    });

    it('uses a fresh active location symmetrically when requested', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...baseUser, search_match_live_location: true }] }).mockResolvedValueOnce({ rows: [] });

        await getFeed(request(), response(), vi.fn());

        const [sql, params] = query.mock.calls[1];
        expect(sql).toContain("u.last_location_updated_at >= NOW() - INTERVAL '24 hours'");
        expect(params.slice(3, 5)).toEqual([39.5696, 2.6502]);
    });

    it('returns LOCATION_REQUIRED instead of silently widening radius search', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...baseUser, residence_latitude: null, residence_longitude: null, current_latitude: null, current_longitude: null }] });
        const next = vi.fn();

        await getFeed(request(), response(), next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 422, code: 'LOCATION_REQUIRED' }));
        expect(query).toHaveBeenCalledTimes(1);
    });

    it('filters country by residence and does not use radius', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...baseUser, search_scope: 'country' }] }).mockResolvedValueOnce({ rows: [] });

        await getFeed(request(), response(), vi.fn());

        const [sql, params] = query.mock.calls[1];
        expect(sql).toContain('residence_country_id IS NULL OR residence_country_id = $6');
        expect(sql).not.toContain('distance_km <=');
        expect(params.at(-2)).toBe(baseUser.residence_country_id);
    });

    it('returns RESIDENCE_COUNTRY_REQUIRED when country search has no residence country', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...baseUser, residence_country_id: null, search_scope: 'country' }] });
        const next = vi.fn();

        await getFeed(request(), response(), next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 422, code: 'RESIDENCE_COUNTRY_REQUIRED' }));
    });

    it('filters passport by target residence country and ignores radius', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...baseUser, search_scope: 'specific_country', search_target_country_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }] }).mockResolvedValueOnce({ rows: [] });

        await getFeed(request(), response(), vi.fn());

        const [sql, params] = query.mock.calls[1];
        expect(sql).toContain('residence_country_id IS NULL OR residence_country_id = $6');
        expect(params.at(-2)).toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
        expect(params).not.toContain(100);
    });

    it('defaults to all for free user regardless of their gender', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...baseUser, gender: 'male', subscription_product_id: null }] }).mockResolvedValueOnce({ rows: [] });

        await getFeed(request(), response(), vi.fn());

        const [sql, params] = query.mock.calls[1];
        expect(sql).not.toContain('u.gender =');
        expect(params).not.toContain('female');
        expect(params).not.toContain('male');
    });

    it('ignores free user query param requesting male/female and stays on all', async () => {
        query.mockResolvedValueOnce({ rows: [{ ...baseUser, gender: 'male', subscription_product_id: null }] }).mockResolvedValueOnce({ rows: [] });

        await getFeed(request({ query: { gender: 'female' } }), response(), vi.fn());

        const [sql, params] = query.mock.calls[1];
        expect(sql).not.toContain('u.gender =');
        expect(params).not.toContain('female');
    });

    it('allows Plus subscriber to filter by female candidates', async () => {
        query.mockResolvedValueOnce({
            rows: [{
                ...baseUser,
                gender: 'male',
                subscription_product_id: 'mirailink_plus',
                subscription_status: 'active',
                subscription_expires_at: new Date(Date.now() + 86400000).toISOString(),
                search_gender: 'female',
            }],
        }).mockResolvedValueOnce({ rows: [] });

        await getFeed(request(), response(), vi.fn());

        const [sql, params] = query.mock.calls[1];
        expect(sql).toContain('u.gender =');
        expect(params).toContain('female');
    });

    it('allows Plus subscriber to filter by all candidates', async () => {
        query.mockResolvedValueOnce({
            rows: [{
                ...baseUser,
                gender: 'male',
                subscription_product_id: 'mirailink_plus',
                subscription_status: 'active',
                subscription_expires_at: new Date(Date.now() + 86400000).toISOString(),
                search_gender: 'all',
            }],
        }).mockResolvedValueOnce({ rows: [] });

        await getFeed(request(), response(), vi.fn());

        const [sql] = query.mock.calls[1];
        expect(sql).not.toContain('u.gender =');
    });
});

describe('likeUser daily limit contract', () => {
    const targetUserId = '00000000-0000-4000-8000-000000000002';

    beforeEach(() => query.mockReset());

    it('blocks free user when reaching daily likes limit', async () => {
        // targetExists -> true
        query.mockResolvedValueOnce({ rowCount: 1 });
        // user_subscriptions -> none
        query.mockResolvedValueOnce({ rows: [] });
        // daily likes count -> 50
        query.mockResolvedValueOnce({ rows: [{ count: 50 }] });

        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await likeUser({ user: { id: userId }, body: { toUserId: targetUserId } }, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            code: 'DAILY_LIKES_LIMIT_REACHED',
            limit: 50,
        }));
    });

    it('allows free user when below daily limit', async () => {
        // targetExists -> true
        query.mockResolvedValueOnce({ rowCount: 1 });
        // user_subscriptions -> none
        query.mockResolvedValueOnce({ rows: [] });
        // daily likes count -> 10
        query.mockResolvedValueOnce({ rows: [{ count: 10 }] });
        // INSERT INTO likes
        query.mockResolvedValueOnce({ rowCount: 1 });
        // check reciprocal
        query.mockResolvedValueOnce({ rowCount: 0 });

        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await likeUser({ user: { id: userId }, body: { toUserId: targetUserId } }, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith({ message: 'Liked', match: false });
    });

    it('bypasses daily limit when user has active plus or premium subscription', async () => {
        // targetExists -> true
        query.mockResolvedValueOnce({ rowCount: 1 });
        // user_subscriptions -> active plus
        query.mockResolvedValueOnce({
            rows: [{ product_id: 'mirailink_plus', status: 'active', expires_at: new Date(Date.now() + 86400000).toISOString() }],
        });
        // INSERT INTO likes
        query.mockResolvedValueOnce({ rowCount: 1 });
        // check reciprocal
        query.mockResolvedValueOnce({ rowCount: 0 });

        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await likeUser({ user: { id: userId }, body: { toUserId: targetUserId } }, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith({ message: 'Liked', match: false });
    });
});

describe('getUndoQuota', () => {
    beforeEach(() => {
        query.mockReset();
    });

    it('returns 1 max undo for free user with remaining quota', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [{ count: 0, oldest_undo: null }] });
        query.mockResolvedValueOnce({ rowCount: 1 });

        const res = { json: vi.fn() };
        await getUndoQuota({ user: { id: userId } }, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            tier: 'free',
            maxUndos: 1,
            usedUndos: 0,
            remainingUndos: 1,
            canUndo: true,
            hasUndoableSwipe: true,
        }));
    });

    it('returns 3 max undos for plus user and calculates remaining', async () => {
        query.mockResolvedValueOnce({
            rows: [{ product_id: 'mirailink_plus', status: 'active', expires_at: new Date(Date.now() + 86400000).toISOString() }],
        });
        query.mockResolvedValueOnce({ rows: [{ count: 1, oldest_undo: '2026-10-04T00:00:00Z' }] });
        query.mockResolvedValueOnce({ rowCount: 1 });

        const res = { json: vi.fn() };
        await getUndoQuota({ user: { id: userId } }, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            tier: 'plus',
            maxUndos: 3,
            usedUndos: 1,
            remainingUndos: 2,
            canUndo: true,
        }));
    });

    it('returns 6 max undos for premium user and 0 remaining when limit reached', async () => {
        query.mockResolvedValueOnce({
            rows: [{ product_id: 'mirailink_premium', status: 'active', expires_at: new Date(Date.now() + 86400000).toISOString() }],
        });
        query.mockResolvedValueOnce({ rows: [{ count: 6, oldest_undo: '2026-10-04T00:00:00Z' }] });
        query.mockResolvedValueOnce({ rowCount: 1 });

        const res = { json: vi.fn() };
        await getUndoQuota({ user: { id: userId } }, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            tier: 'premium',
            maxUndos: 6,
            usedUndos: 6,
            remainingUndos: 0,
            canUndo: false,
        }));
    });
});

describe('undoSwipe', () => {
    const targetUserId = '00000000-0000-4000-8000-000000000002';

    beforeEach(() => {
        query.mockReset();
        clientQuery.mockReset();
        clientRelease.mockReset();
    });

    it('rejects with 403 when daily limit is reached for free user', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [{ count: 1, oldest_undo: '2026-10-04T00:00:00Z' }] });

        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await undoSwipe({ user: { id: userId }, body: {} }, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            code: 'DAILY_UNDO_LIMIT_REACHED',
            limit: 1,
            remaining: 0,
        }));
    });

    it('reverts the most recent like and removes match when quota is available', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [{ count: 0, oldest_undo: null }] });
        query.mockResolvedValueOnce({ rows: [{ action: 'like', to_user_id: targetUserId }], rowCount: 1 });
        query.mockResolvedValueOnce({ rows: [{ id: targetUserId, username: 'testuser' }] });
        // profileExtras 7 queries
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [] });

        // remainingCheck
        query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });

        clientQuery.mockResolvedValue({ rowCount: 1 });

        const res = { json: vi.fn() };
        await undoSwipe({ user: { id: userId }, body: {}, get: vi.fn().mockReturnValue('es') }, res, vi.fn());

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Swipe reverted successfully',
            actionUndone: 'like',
            quota: expect.objectContaining({
                tier: 'free',
                maxUndos: 1,
                usedUndos: 1,
                remainingUndos: 0,
                hasUndoableSwipe: true,
                canUndo: false,
            }),
        }));
        expect(clientQuery).toHaveBeenCalledWith('BEGIN');
        expect(clientQuery).toHaveBeenCalledWith('COMMIT');
    });

    it('returns 404 when no swipe exists to undo', async () => {
        query.mockResolvedValueOnce({ rows: [] });
        query.mockResolvedValueOnce({ rows: [{ count: 0, oldest_undo: null }] });
        query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
        await undoSwipe({ user: { id: userId }, body: {} }, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            code: 'NO_SWIPE_TO_UNDO',
        }));
    });
});
