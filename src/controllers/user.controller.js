import db from '../models/db.js';
import { decodeTokenExpiry } from '../services/tokenService.js';
import {
    cleanupStagedPhoto,
    finalizePhoto,
    removePhotoFile,
    stagePhoto,
} from '../utils/photoStorage.js';

function parseInterestIds(value) {
    if (value === undefined) return null;
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > 100) throw new Error('Invalid interests');
    return parsed.map(item => item.id);
}

async function profileExtras(userId) {
    const [animes, games, photos] = await Promise.all([
        db.query('SELECT a.id, a.name, a.image_url FROM animes a JOIN user_anime_interests i ON i.anime_id = a.id WHERE i.user_id = $1', [userId]),
        db.query('SELECT g.id, g.name, g.image_url FROM games g JOIN user_game_interests i ON i.game_id = g.id WHERE i.user_id = $1', [userId]),
        db.query('SELECT id, user_id, url, position FROM user_photos WHERE user_id = $1 ORDER BY position', [userId]),
    ]);
    return { animes: animes.rows, games: games.rows, photos: photos.rows };
}

export const getProfile = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.username, u.nickname, u.email, u.phone_number, u.bio,
                    u.gender, TO_CHAR(u.birthdate, 'YYYY-MM-DD') AS birthdate,
                    u.residence_city, u.residence_region, u.residence_country_code,
                    u.residence_latitude, u.residence_longitude,
                    u.current_latitude, u.current_longitude, u.last_location_updated_at,
                    COALESCE(u.search_radius_km, 40) AS search_radius_km,
                    COALESCE(u.search_scope, 'radius') AS search_scope,
                    u.search_target_country,
                    COALESCE(u.search_match_live_location, FALSE) AS search_match_live_location,
                    u.is_verified, COALESCE(f.enabled, FALSE) AS two_fa_enabled,
                    u.created_at, u.updated_at
             FROM users u LEFT JOIN user_2fa f ON f.user_id = u.id
             WHERE u.id = $1 AND u.is_deleted = FALSE`,
            [req.user.id],
        );
        if (!result.rows[0]) return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        return res.json({ ...result.rows[0], ...await profileExtras(req.user.id) });
    } catch (error) {
        return next(error);
    }
};

export const getProfileFromId = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, username, nickname, bio, gender,
                    TO_CHAR(birthdate, 'YYYY-MM-DD') AS birthdate,
                    residence_city, residence_region, residence_country_code
             FROM users WHERE id = $1 AND is_deleted = FALSE`,
            [req.body.id],
        );
        if (!result.rows[0]) return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        return res.json({ ...result.rows[0], ...await profileExtras(req.body.id) });
    } catch (error) {
        return next(error);
    }
};

export const getProfiles = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, username, nickname, bio, gender,
                    TO_CHAR(birthdate, 'YYYY-MM-DD') AS birthdate,
                    latitude, longitude, location_name
             FROM users WHERE is_deleted = FALSE AND id != $1
             ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
            [req.user.id, req.query.limit, req.query.offset],
        );
        const profiles = await Promise.all(result.rows.map(async user => ({
            ...user,
            ...await profileExtras(user.id),
        })));
        return res.json(profiles);
    } catch (error) {
        return next(error);
    }
};

export const deleteAccount = async (req, res, next) => {
    try {
        const result = await db.query(
            'UPDATE users SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 AND is_deleted = FALSE RETURNING id',
            [req.user.id],
        );
        if (result.rowCount === 0) return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        await db.query(
            'INSERT INTO token_blacklist (token, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.token, decodeTokenExpiry(req.token)],
        );
        return res.json({ message: 'Account deleted' });
    } catch (error) {
        return next(error);
    }
};

export const updateProfile = async (req, res, next) => {
    const client = await db.connect();
    const staged = [];
    const oldUrls = [];
    try {
        const animeIds = parseInterestIds(req.body.animes);
        const gameIds = parseInterestIds(req.body.games);
        for (const [field, list] of Object.entries(req.files ?? {})) {
            const position = Number(field.split('_')[1]) + 1;
            staged.push({ position, photo: await stagePhoto(req.user.id, list[0]) });
        }
        await client.query('BEGIN');
        await client.query(
            `UPDATE users SET
                nickname = COALESCE($1, nickname), bio = COALESCE($2, bio),
                gender = COALESCE(NULLIF($3, ''), gender),
                birthdate = CASE WHEN $4::text IS NULL THEN birthdate WHEN $4 = '' THEN NULL ELSE $4::date END,
                residence_city = CASE WHEN $5::text IS NULL THEN residence_city ELSE $5::varchar END,
                residence_region = CASE WHEN $6::text IS NULL THEN residence_region ELSE $6::varchar END,
                residence_country_code = CASE WHEN $7::text IS NULL THEN residence_country_code ELSE $7::varchar END,
                residence_latitude = CASE WHEN $8::text IS NULL THEN residence_latitude ELSE $8::double precision END,
                residence_longitude = CASE WHEN $9::text IS NULL THEN residence_longitude ELSE $9::double precision END,
                updated_at = NOW() WHERE id = $10`,
            [
                req.body.nickname ?? null,
                req.body.bio ?? null,
                req.body.gender ?? null,
                req.body.birthdate ?? null,
                req.body.residence_city !== undefined ? req.body.residence_city : null,
                req.body.residence_region !== undefined ? req.body.residence_region : null,
                req.body.residence_country_code !== undefined ? req.body.residence_country_code : null,
                req.body.residence_latitude !== undefined ? req.body.residence_latitude : null,
                req.body.residence_longitude !== undefined ? req.body.residence_longitude : null,
                req.user.id,
            ],
        );
        if (animeIds) {
            await client.query('DELETE FROM user_anime_interests WHERE user_id = $1', [req.user.id]);
            for (const id of animeIds) await client.query('INSERT INTO user_anime_interests (user_id, anime_id) VALUES ($1, $2)', [req.user.id, id]);
        }
        if (gameIds) {
            await client.query('DELETE FROM user_game_interests WHERE user_id = $1', [req.user.id]);
            for (const id of gameIds) await client.query('INSERT INTO user_game_interests (user_id, game_id) VALUES ($1, $2)', [req.user.id, id]);
        }
        for (let position = 1; position <= 4; position += 1) {
            const field = `photo_${position - 1}`;
            const replacement = staged.find(item => item.position === position);
            if (replacement || (Object.hasOwn(req.body, field) && !req.files?.[field])) {
                const previous = await client.query('DELETE FROM user_photos WHERE user_id = $1 AND position = $2 RETURNING url', [req.user.id, position]);
                if (previous.rows[0]) oldUrls.push(previous.rows[0].url);
            }
            if (replacement) {
                await client.query('INSERT INTO user_photos (user_id, url, position) VALUES ($1, $2, $3)', [req.user.id, replacement.photo.url, position]);
            }
        }
        for (const item of staged) await finalizePhoto(item.photo);
        await client.query('COMMIT');
        await Promise.all(oldUrls.map(removePhotoFile));
        return res.json({ message: 'Profile updated' });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        await Promise.all(staged.map(item => cleanupStagedPhoto(item.photo)));
        return next(error);
    } finally {
        client.release();
    }
};

export const deleteUserPhoto = async (req, res, next) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const deleted = await client.query(
            'DELETE FROM user_photos WHERE user_id = $1 AND position = $2 RETURNING url',
            [req.user.id, req.params.position],
        );
        if (!deleted.rows[0]) {
            await client.query('ROLLBACK');
            return res.status(404).json({ code: 'PHOTO_NOT_FOUND', message: 'Photo not found' });
        }
        await client.query('UPDATE user_photos SET position = position - 1 WHERE user_id = $1 AND position > $2', [req.user.id, req.params.position]);
        await client.query('COMMIT');
        await removePhotoFile(deleted.rows[0].url);
        return res.json({ message: 'Photo deleted' });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        return next(error);
    } finally {
        client.release();
    }
};

export const saveFCMToken = async (req, res, next) => {
    try {
        await db.query(
            `INSERT INTO push_tokens (user_id, token, platform, created_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (user_id) DO UPDATE SET token = EXCLUDED.token,
             platform = EXCLUDED.platform, created_at = NOW()`,
            [req.user.id, req.body.fcm, req.body.platform],
        );
        return res.json({ message: 'FCM token saved' });
    } catch (error) {
        return next(error);
    }
};

export const updateSearchSettings = async (req, res, next) => {
    try {
        const {
            search_radius_km = 40,
            search_scope = 'radius',
            search_target_country = null,
            search_match_live_location = false,
        } = req.body;

        await db.query(
            `UPDATE users SET
                search_radius_km = $1,
                search_scope = $2,
                search_target_country = $3,
                search_match_live_location = $4,
                updated_at = NOW()
             WHERE id = $5`,
            [search_radius_km, search_scope, search_target_country, search_match_live_location, req.user.id],
        );
        return res.json({ message: 'Search settings updated' });
    } catch (error) {
        return next(error);
    }
};

export const locationPing = async (req, res, next) => {
    const client = await db.connect();
    try {
        const { latitude, longitude, city = null, country_code = null } = req.body;
        await client.query('BEGIN');

        await client.query(
            `UPDATE users SET
                current_latitude = $1,
                current_longitude = $2,
                last_location_updated_at = NOW()
             WHERE id = $3`,
            [latitude, longitude, req.user.id],
        );

        const lastEntry = await client.query(
            `SELECT latitude, longitude, recorded_at
             FROM user_location_history
             WHERE user_id = $1
             ORDER BY recorded_at DESC LIMIT 1`,
            [req.user.id],
        );

        let shouldInsert = true;
        if (lastEntry.rows[0]) {
            const { latitude: lastLat, longitude: lastLng, recorded_at: lastTime } = lastEntry.rows[0];
            const dLat = (latitude - lastLat) * Math.PI / 180;
            const dLon = (longitude - lastLng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 +
                      Math.cos(lastLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
                      Math.sin(dLon / 2) ** 2;
            const distKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const hoursSince = (Date.now() - new Date(lastTime).getTime()) / (1000 * 60 * 60);

            if (distKm < 5.0 && hoursSince < 24.0) {
                shouldInsert = false;
            }
        }

        if (shouldInsert) {
            await client.query(
                `INSERT INTO user_location_history (user_id, latitude, longitude, city, country_code, recorded_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [req.user.id, latitude, longitude, city, country_code],
            );

            // Regla de poda: mantener maximo los ultimos 50 puntos
            await client.query(
                `DELETE FROM user_location_history
                 WHERE user_id = $1
                   AND id NOT IN (
                       SELECT id FROM user_location_history
                       WHERE user_id = $1
                       ORDER BY recorded_at DESC
                       LIMIT 50
                   )`,
                [req.user.id],
            );
        }

        await client.query('COMMIT');
        return res.json({ message: 'Location updated', recorded: shouldInsert });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        return next(error);
    } finally {
        client.release();
    }
};

export const getLocationHistory = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, latitude, longitude, city, country_code, recorded_at
             FROM user_location_history
             WHERE user_id = $1
             ORDER BY recorded_at DESC
             LIMIT 50`,
            [req.user.id],
        );
        return res.json(result.rows);
    } catch (error) {
        return next(error);
    }
};
