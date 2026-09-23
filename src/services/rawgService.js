const RAWG_BASE_URL = 'https://api.rawg.io/api';

/**
 * Consulta la API de RAWG para obtener videojuegos populares con sus portadas y metadatos.
 *
 * @param {Object} options
 * @param {string} [options.apiKey] - Clave de API de RAWG.
 * @param {number} [options.limit=40] - Cantidad de juegos a recuperar (max 40).
 * @param {number} [options.page=1] - Pagina a recuperar.
 * @returns {Promise<Array<{name: string, slug: string, image_url: string|null, catalog_key: string, biography: string}>>}
 */
export async function fetchRawgGames({ apiKey = process.env.RAWG_API_KEY, limit = 40, page = 1 } = {}) {
    if (!apiKey) {
        console.warn('⚠️ RAWG_API_KEY no configurada. Omitiendo sincronizacion de RAWG.');
        return [];
    }

    const clampedLimit = Math.min(Math.max(Number(limit) || 20, 1), 40);
    const url = new URL(`${RAWG_BASE_URL}/games`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('page_size', String(clampedLimit));
    url.searchParams.set('page', String(page));
    url.searchParams.set('ordering', '-added');

    try {
        const response = await fetch(url.toString(), {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'MiraiLink-CatalogSync/1.0',
            },
        });

        if (!response.ok) {
            console.error(`❌ Error en respuesta de RAWG API: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        const results = Array.isArray(data?.results) ? data.results : [];

        return results.map(game => {
            const slug = String(game.slug ?? game.id);
            return {
                name: String(game.name ?? '').trim(),
                slug,
                image_url: game.background_image ?? null,
                catalog_key: `rawg:${game.id}`,
                biography: '',
            };
        }).filter(item => item.name.length > 0);
    } catch (error) {
        console.error('❌ Error al consultar RAWG API:', error.message);
        return [];
    }
}
