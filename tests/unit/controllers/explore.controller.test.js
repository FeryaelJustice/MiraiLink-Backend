import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
vi.mock('../../../src/models/db.js', () => ({ default: { query } }));

const {
    getCategories,
    getCategoryFeed,
    getCategorySettings,
    updateCategorySettings,
} = await import('../../../src/controllers/explore.controller.js');

const userId = '00000000-0000-4000-8000-000000000001';
const categoryId = '11111111-1111-4111-8111-111111111111';

function mockRequest({ params = {}, queryParams = {}, body = {} } = {}) {
    return {
        user: { id: userId },
        params,
        query: queryParams,
        body,
        get: vi.fn().mockReturnValue('es'),
    };
}

function mockResponse() {
    return {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
    };
}

describe('explore.controller', () => {
    beforeEach(() => {
        query.mockReset();
    });

    it('getCategories returns grouped sections and recommendations', async () => {
        // 1. currentUser query
        query.mockResolvedValueOnce({
            rows: [{ id: userId, residence_latitude: 40.0, residence_longitude: -3.0, search_radius_km: 40 }],
        });
        // 2. categories query
        query.mockResolvedValueOnce({
            rows: [
                {
                    id: categoryId,
                    code: 'anime_marathon',
                    section_group: 'otaku',
                    icon_key: 'tv',
                    filter_type: 'anime',
                    filter_value: null,
                    sort_order: 1,
                    title: 'Maraton de series',
                    description: 'Encuentra gente',
                    user_radius_km: 40,
                },
            ],
        });
        // 3. active_count query
        query.mockResolvedValueOnce({ rows: [{ total: 12 }] });

        const req = mockRequest();
        const res = mockResponse();
        const next = vi.fn();

        await getCategories(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledTimes(1);
        const data = res.json.mock.calls[0][0];
        expect(data.recommendations).toHaveLength(1);
        expect(data.sections).toHaveLength(1);
        expect(data.sections[0].group).toBe('otaku');
        expect(data.sections[0].categories[0].activeCount).toBe(12);
    });

    it('getCategorySettings returns category preferences', async () => {
        // 1. category check
        query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: categoryId, code: 'anime_marathon' }] });
        // 2. preferences check
        query.mockResolvedValueOnce({ rows: [{ radius_km: 60 }] });

        const req = mockRequest({ params: { categoryId } });
        const res = mockResponse();
        const next = vi.fn();

        await getCategorySettings(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            categoryId,
            radius_km: 60,
        });
    });

    it('updateCategorySettings updates radius idempotently', async () => {
        // 1. category check
        query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: categoryId, code: 'anime_marathon' }] });
        // 2. upsert query
        query.mockResolvedValueOnce({ rowCount: 1 });

        const req = mockRequest({ params: { categoryId }, body: { radius_km: 120 } });
        const res = mockResponse();
        const next = vi.fn();

        await updateCategorySettings(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith({
            categoryId,
            radius_km: 120,
        });
        expect(query.mock.calls[1][0]).toContain('ON CONFLICT (user_id, category_id)');
        expect(query.mock.calls[1][0]).toContain('DO UPDATE SET radius_km = EXCLUDED.radius_km');
    });

    it('getCategoryFeed returns candidate profiles matching category', async () => {
        // 1. check category
        query.mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: categoryId, code: 'anime_marathon', filter_type: 'anime', filter_value: null, title: 'Maraton' }],
        });
        // 2. category preferences
        query.mockResolvedValueOnce({ rows: [{ radius_km: 50 }] });
        // 3. user info
        query.mockResolvedValueOnce({ rows: [{ id: userId, residence_latitude: 40.0, residence_longitude: -3.0 }] });
        // 4. ranked candidates query
        query.mockResolvedValueOnce({ rows: [] });

        const req = mockRequest({ params: { categoryId } });
        const res = mockResponse();
        const next = vi.fn();

        await getCategoryFeed(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith([]);
    });

    it('getCategoryFeed enriches candidates with catalog and prompt data', async () => {
        const candidateId = '22222222-2222-4222-8222-222222222222';
        // 1. check category
        query.mockResolvedValueOnce({
            rowCount: 1,
            rows: [{ id: categoryId, code: 'anime_marathon', filter_type: 'anime', filter_value: null, title: 'Maraton' }],
        });
        // 2. category preferences
        query.mockResolvedValueOnce({ rows: [{ radius_km: 50 }] });
        // 3. user info
        query.mockResolvedValueOnce({ rows: [{ id: userId, residence_latitude: 40.0, residence_longitude: -3.0 }] });
        // 4. ranked candidates query
        query.mockResolvedValueOnce({
            rows: [{
                id: candidateId,
                username: 'candidate_user',
                nickname: 'Candidate',
                distance_km: 12.5,
                common_interests: 3,
                created_at: new Date().toISOString(),
            }],
        });
        // 5. photos
        query.mockResolvedValueOnce({ rows: [{ id: 'p1', user_id: candidateId, url: 'https://example.com/p1.jpg', position: 0 }] });
        // 6. animes
        query.mockResolvedValueOnce({ rows: [{ user_id: candidateId, id: 'a1', title: 'Naruto', image_url: '/media/anime.jpg' }] });
        // 7. games
        query.mockResolvedValueOnce({ rows: [{ user_id: candidateId, id: 'g1', title: 'Zelda', image_url: '/media/game.jpg' }] });
        // 8. goals
        query.mockResolvedValueOnce({ rows: [{ user_id: candidateId, id: 'rg1', code: 'long_term', label: 'Relacion seria' }] });
        // 9. family
        query.mockResolvedValueOnce({ rows: [{ user_id: candidateId, id: 'fo1', code: 'wants_kids', label: 'Quiere hijos' }] });
        // 10. languages
        query.mockResolvedValueOnce({ rows: [{ user_id: candidateId, id: 'sl1', code: 'es', label: 'Espanol' }] });
        // 11. prompts
        query.mockResolvedValueOnce({ rows: [{ user_id: candidateId, id: 'pr1', prompt_id: 'p1', answer: 'Mi respuesta', code: 'fav_moment', question: 'Momento favorito' }] });

        const req = mockRequest({ params: { categoryId } });
        const res = mockResponse();
        const next = vi.fn();

        await getCategoryFeed(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledTimes(1);
        const data = res.json.mock.calls[0][0];
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe(candidateId);
        expect(data[0].photos).toHaveLength(1);
        expect(data[0].animes).toHaveLength(1);
        expect(data[0].games).toHaveLength(1);
        expect(data[0].relationship_goals).toHaveLength(1);
        expect(data[0].family_options).toHaveLength(1);
        expect(data[0].spoken_languages).toHaveLength(1);
        expect(data[0].prompts).toHaveLength(1);
    });
});

