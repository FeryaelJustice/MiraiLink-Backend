import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
vi.mock('../../../src/models/db.js', () => ({ default: { query } }));

const { getFeed } = await import('../../../src/controllers/swipe.controller.js');
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
});
