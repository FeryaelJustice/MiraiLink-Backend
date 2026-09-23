const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

/**
 * Consulta la API de Jikan v4 (MyAnimeList) para obtener animes populares con sus portadas y sinopsis.
 *
 * @param {Object} options
 * @param {number} [options.limit=25] - Cantidad de animes a recuperar (max 25 por pagina en Jikan).
 * @param {number} [options.page=1] - Pagina a recuperar.
 * @returns {Promise<Array<{name: string, english_name: string|null, image_url: string|null, catalog_key: string, biography: string}>>}
 */
export async function fetchTopAnimes({ limit = 25, page = 1 } = {}) {
    const clampedLimit = Math.min(Math.max(Number(limit) || 25, 1), 25);
    const url = new URL(`${JIKAN_BASE_URL}/top/anime`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(clampedLimit));
    url.searchParams.set('filter', 'bypopularity');

    try {
        const response = await fetch(url.toString(), {
            headers: {
                Accept: 'application/json',
                'User-Agent': 'MiraiLink-CatalogSync/1.0',
            },
        });

        if (!response.ok) {
            console.error(`❌ Error en respuesta de Jikan API: ${response.status} ${response.statusText}`);
            return [];
        }

        const data = await response.json();
        const results = Array.isArray(data?.data) ? data.data : [];

        return results.map(anime => {
            const malId = anime.mal_id;
            const primaryTitle = String(anime.title ?? '').trim();
            const englishTitle = anime.title_english ? String(anime.title_english).trim() : null;
            const chosenName = englishTitle || primaryTitle;
            const imageUrl =
                anime.images?.webp?.large_image_url ??
                anime.images?.jpg?.large_image_url ??
                anime.images?.webp?.image_url ??
                anime.images?.jpg?.image_url ??
                null;

            return {
                name: chosenName,
                english_name: englishTitle,
                image_url: imageUrl,
                catalog_key: `mal:${malId}`,
                biography: String(anime.synopsis ?? '').slice(0, 500),
            };
        }).filter(item => item.name.length > 0);
    } catch (error) {
        console.error('❌ Error al consultar Jikan API:', error.message);
        return [];
    }
}
