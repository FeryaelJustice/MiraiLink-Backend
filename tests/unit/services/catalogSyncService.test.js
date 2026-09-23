import { describe, expect, it, vi } from 'vitest';
import { fetchRawgGames } from '../../../src/services/rawgService.js';
import { fetchTopAnimes } from '../../../src/services/jikanService.js';
import { syncCatalog } from '../../../src/services/catalogSyncService.js';

describe('rawgService', () => {
    it('returns empty array when API key is missing', async () => {
        const games = await fetchRawgGames({ apiKey: '' });
        expect(games).toEqual([]);
    });

    it('clamps limit to maximum 40', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ results: [] }),
        });
        vi.stubGlobal('fetch', mockFetch);

        await fetchRawgGames({ apiKey: 'test-key', limit: 100 });
        expect(mockFetch).toHaveBeenCalled();
        const calledUrl = mockFetch.mock.calls[0][0];
        expect(calledUrl).toContain('page_size=40');

        vi.unstubAllGlobals();
    });
});

describe('jikanService', () => {
    it('maps top anime results properly', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: [
                    {
                        mal_id: 1,
                        title: 'Cowboy Bebop',
                        title_english: 'Cowboy Bebop',
                        images: {
                            webp: { large_image_url: 'https://cdn.myanimelist.net/images/anime/4/19644l.webp' },
                        },
                        synopsis: 'Space bounty hunters travel through cosmos.',
                    },
                ],
            }),
        });
        vi.stubGlobal('fetch', mockFetch);

        const animes = await fetchTopAnimes({ limit: 10 });
        expect(animes).toHaveLength(1);
        expect(animes[0]).toEqual({
            name: 'Cowboy Bebop',
            english_name: 'Cowboy Bebop',
            image_url: 'https://cdn.myanimelist.net/images/anime/4/19644l.webp',
            catalog_key: 'mal:1',
            biography: 'Space bounty hunters travel through cosmos.',
        });

        vi.unstubAllGlobals();
    });
});

describe('catalogSyncService', () => {
    it('returns empty summary when no supported languages exist', async () => {
        const mockPool = {
            query: vi.fn().mockResolvedValue({ rows: [] }),
        };

        const summary = await syncCatalog({ pool: mockPool });
        expect(summary.gamesAdded).toBe(0);
        expect(summary.animesAdded).toBe(0);
    });

    it('inserts new game and anime with translations and updates existing items with missing images', async () => {
        const queries = [];
        const mockPool = {
            query: vi.fn().mockImplementation(async (sql, params) => {
                queries.push({ sql, params });

                if (sql.includes('SELECT id, code FROM supported_languages')) {
                    return { rows: [{ id: 'lang-es', code: 'es' }, { id: 'lang-en', code: 'en' }] };
                }

                // Check existing game -> not found
                if (sql.includes('FROM games') && sql.includes('WHERE catalog_key = $1')) {
                    return { rows: [] };
                }

                // Insert game
                if (sql.includes('INSERT INTO games')) {
                    return { rows: [{ id: 'game-uuid-1' }] };
                }

                // Check existing anime -> not found
                if (sql.includes('FROM animes') && sql.includes('WHERE catalog_key = $1')) {
                    return { rows: [] };
                }

                // Insert anime
                if (sql.includes('INSERT INTO animes')) {
                    return { rows: [{ id: 'anime-uuid-1' }] };
                }

                return { rows: [] };
            }),
        };

        const mockFetch = vi.fn().mockImplementation(async (url) => {
            if (url.includes('api.rawg.io')) {
                return {
                    ok: true,
                    json: async () => ({
                        results: [
                            {
                                id: 100,
                                slug: 'portal-2',
                                name: 'Portal 2',
                                background_image: 'https://media.rawg.io/media/games/portal-2.jpg',
                            },
                        ],
                    }),
                };
            }
            if (url.includes('api.jikan.moe')) {
                return {
                    ok: true,
                    json: async () => ({
                        data: [
                            {
                                mal_id: 5114,
                                title: 'Fullmetal Alchemist: Brotherhood',
                                title_english: 'Fullmetal Alchemist: Brotherhood',
                                images: {
                                    webp: { large_image_url: 'https://cdn.myanimelist.net/fma.webp' },
                                },
                                synopsis: 'Alchemists Edward and Alphonse Elric...',
                            },
                        ],
                    }),
                };
            }
            return { ok: false, status: 404 };
        });
        vi.stubGlobal('fetch', mockFetch);

        const summary = await syncCatalog({
            pool: mockPool,
            rawgApiKey: 'test-rawg-key',
            rawgLimit: 1,
            jikanLimit: 1,
        });

        expect(summary.gamesAdded).toBe(1);
        expect(summary.animesAdded).toBe(1);

        // Verify translation queries occurred for both languages
        const translationQueries = queries.filter(q =>
            q.sql.includes('INSERT INTO game_name_translations') ||
            q.sql.includes('INSERT INTO anime_name_translations')
        );
        expect(translationQueries.length).toBe(4); // 2 languages * 2 entities

        vi.unstubAllGlobals();
    });
});
