import db from '../models/db.js';
import { fetchRawgGames } from './rawgService.js';
import { fetchTopAnimes } from './jikanService.js';

/**
 * Sincroniza de forma idempotente videojuegos y animes desde APIs externas hacia la base de datos PostgreSQL.
 *
 * @param {Object} [options]
 * @param {import('pg').Pool|import('pg').PoolClient} [options.pool=db] - Pool o cliente de conexion a base de datos.
 * @param {number} [options.rawgLimit=40] - Cantidad de juegos a recuperar.
 * @param {number} [options.jikanLimit=25] - Cantidad de animes a recuperar.
 * @returns {Promise<{gamesProcessed: number, animesProcessed: number, gamesAdded: number, animesAdded: number, gamesUpdated: number, animesUpdated: number}>}
 */
export async function syncCatalog({
    pool = db,
    rawgApiKey = process.env.RAWG_API_KEY,
    rawgLimit = 40,
    jikanLimit = 25,
} = {}) {
    console.log('🔄 Iniciando sincronizacion de catalogo (Juegos RAWG + Animes Jikan)...');

    const summary = {
        gamesProcessed: 0,
        animesProcessed: 0,
        gamesAdded: 0,
        animesAdded: 0,
        gamesUpdated: 0,
        animesUpdated: 0,
    };

    // Obtener idiomas soportados
    const languagesRes = await pool.query('SELECT id, code FROM supported_languages');
    const languages = languagesRes.rows;
    if (!languages.length) {
        console.warn('⚠️ No hay idiomas soportados configurados en la base de datos.');
        return summary;
    }

    // 1. Sincronizar Videojuegos desde RAWG
    try {
        const rawgGames = await fetchRawgGames({ apiKey: rawgApiKey, limit: rawgLimit });
        summary.gamesProcessed = rawgGames.length;

        for (const game of rawgGames) {
            const cleanName = game.name.slice(0, 100).trim();
            if (!cleanName) continue;

            const existing = await pool.query(
                `SELECT id, catalog_key, name, image_path
                 FROM games
                 WHERE catalog_key = $1 OR LOWER(TRIM(name)) = LOWER(TRIM($2))
                 LIMIT 1`,
                [game.catalog_key, cleanName],
            );

            if (existing.rows.length > 0) {
                const row = existing.rows[0];
                if ((!row.image_path || row.image_path.length === 0) && game.image_url) {
                    await pool.query(
                        'UPDATE games SET image_path = $1, image_url = COALESCE(image_url, $1) WHERE id = $2',
                        [game.image_url, row.id],
                    );
                    summary.gamesUpdated++;
                }
            } else {
                const insertRes = await pool.query(
                    `INSERT INTO games (name, description, image_url, catalog_key, image_path)
                     VALUES ($1, $2, $3, $4, $3)
                     ON CONFLICT (name) DO NOTHING
                     RETURNING id`,
                    [cleanName, game.biography || '', game.image_url, game.catalog_key],
                );

                if (insertRes.rows.length > 0) {
                    const gameId = insertRes.rows[0].id;
                    summary.gamesAdded++;

                    for (const lang of languages) {
                        await pool.query(
                            `INSERT INTO game_name_translations (game_id, language_id, name)
                             VALUES ($1, $2, $3)
                             ON CONFLICT (game_id, language_id) DO NOTHING`,
                            [gameId, lang.id, cleanName],
                        );
                        await pool.query(
                            `INSERT INTO game_biography_translations (game_id, language_id, biography)
                             VALUES ($1, $2, $3)
                             ON CONFLICT (game_id, language_id) DO NOTHING`,
                            [gameId, lang.id, game.biography || ''],
                        );
                    }
                }
            }
        }
        console.log(`🎮 Sincronizacion de juegos finalizada: ${summary.gamesAdded} anadidos, ${summary.gamesUpdated} actualizados.`);
    } catch (error) {
        console.error('❌ Error sincronizando juegos desde RAWG:', error.message);
    }

    // 2. Sincronizar Animes desde Jikan
    try {
        const topAnimes = await fetchTopAnimes({ limit: jikanLimit });
        summary.animesProcessed = topAnimes.length;

        for (const anime of topAnimes) {
            const cleanName = anime.name.slice(0, 100).trim();
            if (!cleanName) continue;

            const existing = await pool.query(
                `SELECT id, catalog_key, name, image_path
                 FROM animes
                 WHERE catalog_key = $1 OR LOWER(TRIM(name)) = LOWER(TRIM($2))
                 LIMIT 1`,
                [anime.catalog_key, cleanName],
            );

            if (existing.rows.length > 0) {
                const row = existing.rows[0];
                if ((!row.image_path || row.image_path.length === 0) && anime.image_url) {
                    await pool.query(
                        'UPDATE animes SET image_path = $1, image_url = COALESCE(image_url, $1) WHERE id = $2',
                        [anime.image_url, row.id],
                    );
                    summary.animesUpdated++;
                }
            } else {
                const insertRes = await pool.query(
                    `INSERT INTO animes (name, description, image_url, catalog_key, image_path)
                     VALUES ($1, $2, $3, $4, $3)
                     ON CONFLICT (name) DO NOTHING
                     RETURNING id`,
                    [cleanName, anime.biography || '', anime.image_url, anime.catalog_key],
                );

                if (insertRes.rows.length > 0) {
                    const animeId = insertRes.rows[0].id;
                    summary.animesAdded++;

                    for (const lang of languages) {
                        await pool.query(
                            `INSERT INTO anime_name_translations (anime_id, language_id, name)
                             VALUES ($1, $2, $3)
                             ON CONFLICT (anime_id, language_id) DO NOTHING`,
                            [animeId, lang.id, cleanName],
                        );
                        await pool.query(
                            `INSERT INTO anime_biography_translations (anime_id, language_id, biography)
                             VALUES ($1, $2, $3)
                             ON CONFLICT (anime_id, language_id) DO NOTHING`,
                            [animeId, lang.id, anime.biography || ''],
                        );
                    }
                }
            }
        }
        console.log(`✨ Sincronizacion de animes finalizada: ${summary.animesAdded} anadidos, ${summary.animesUpdated} actualizados.`);
    } catch (error) {
        console.error('❌ Error sincronizando animes desde Jikan:', error.message);
    }

    return summary;
}
