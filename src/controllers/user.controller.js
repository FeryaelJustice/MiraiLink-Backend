import db from '../models/db.js';
import { decodeTokenExpiry } from '../services/tokenService.js';
import { localizedInterestSql, resolveCatalogLanguage, toLocalizedCatalogItem } from '../utils/catalogLocalization.js';
import { toPublicUser } from '../dto/user.dto.js';
import { localizedResidenceColumns, localizedResidenceJoins } from '../utils/geographyLocalization.js';
import {
    cleanupStagedPhoto,
    finalizePhoto,
    removePhotoFile,
    stagePhoto,
} from '../utils/photoStorage.js';

function parseInterestIds(value) {
    if (value === undefined) return null;
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > 100 || parsed.some(item => typeof item?.id !== 'string')) throw new Error('Invalid interests');
    const ids = parsed.map(item => item.id);
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate interests');
    return ids;
}

async function profileExtras(userId, req) {
    const locale = resolveCatalogLanguage(req.get('accept-language'));
    const [animes, games, photos] = await Promise.all([
        db.query(localizedInterestSql('anime', 'i.user_id = $1', 2), [userId, locale]),
        db.query(localizedInterestSql('game', 'i.user_id = $1', 2), [userId, locale]),
        db.query('SELECT id, user_id, url, position FROM user_photos WHERE user_id = $1 ORDER BY position', [userId]),
    ]);
    return { animes: animes.rows.map(row => toLocalizedCatalogItem(row, req)), games: games.rows.map(row => toLocalizedCatalogItem(row, req)), photos: photos.rows };
}

export const getProfile = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const result = await db.query(
            `SELECT u.id, u.username, u.nickname, u.bio,
                    u.gender, TO_CHAR(u.birthdate, 'YYYY-MM-DD') AS birthdate,
                    ${localizedResidenceColumns('u')},
                    u.residence_latitude, u.residence_longitude,
                    u.current_latitude, u.current_longitude, u.last_location_updated_at,
                    COALESCE(p.search_radius_km, 40) AS search_radius_km,
                    COALESCE(p.search_scope, 'radius_residence') AS search_scope,
                    p.search_target_country_id,
                    COALESCE(p.search_match_live_location, FALSE) AS search_match_live_location
             FROM users u
             LEFT JOIN user_search_preferences p ON p.user_id = u.id
             ${localizedResidenceJoins('u', 2)}
             WHERE u.id = $1 AND u.is_deleted = FALSE`,
            [req.user.id, locale],
        );
        if (!result.rows[0]) return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        return res.json({ ...result.rows[0], ...await profileExtras(req.user.id, req) });
    } catch (error) {
        return next(error);
    }
};

export const getProfileFromId = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const result = await db.query(
            `SELECT u.id, u.nickname, u.bio, u.gender,
                    TO_CHAR(u.birthdate, 'YYYY-MM-DD') AS birthdate,
                    ${localizedResidenceColumns('u')}
             FROM users u
             ${localizedResidenceJoins('u', 2)}
             WHERE u.id = $1 AND u.is_deleted = FALSE`,
            [req.body.id, locale],
        );
        if (!result.rows[0]) return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        return res.json({ ...toPublicUser(result.rows[0]), ...await profileExtras(req.body.id, req) });
    } catch (error) {
        return next(error);
    }
};

export const getProfiles = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const result = await db.query(
            `SELECT u.id, u.nickname, u.bio, u.gender,
                    TO_CHAR(u.birthdate, 'YYYY-MM-DD') AS birthdate,
                    ${localizedResidenceColumns('u')}
             FROM users u
             ${localizedResidenceJoins('u', 4)}
             WHERE u.is_deleted = FALSE AND u.id != $1
             ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`,
            [req.user.id, req.query.limit, req.query.offset, locale],
        );
        const profiles = await Promise.all(result.rows.map(async user => ({
            ...toPublicUser(user),
            ...await profileExtras(user.id, req),
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
        const hasResidenceCountry = Object.hasOwn(req.body, 'residence_country_id');
        const hasResidenceRegion = Object.hasOwn(req.body, 'residence_region_id');
        const hasResidenceCity = Object.hasOwn(req.body, 'residence_city_id');
        const hasResidenceLatitude = Object.hasOwn(req.body, 'residence_latitude');
        const hasResidenceLongitude = Object.hasOwn(req.body, 'residence_longitude');
        if (hasResidenceLatitude !== hasResidenceLongitude) {
            return res.status(422).json({ code: 'RESIDENCE_COORDINATES_REQUIRED', message: 'Residence latitude and longitude must be updated together' });
        }
        if (hasResidenceCountry || hasResidenceRegion || hasResidenceCity) {
            const residenceIds = [req.body.residence_country_id, req.body.residence_region_id, req.body.residence_city_id];
            const clearingResidence = residenceIds.every(value => value === null);
            const settingResidence = residenceIds.every(value => typeof value === 'string');
            if (!clearingResidence && !settingResidence) {
                return res.status(422).json({ code: 'RESIDENCE_HIERARCHY_REQUIRED', message: 'Country, region and city must be updated together' });
            }
            if (settingResidence) {
                const hierarchy = await client.query(
                    `SELECT latitude, longitude FROM cities
                     WHERE id = $1 AND region_id = $2 AND country_id = $3`,
                    [req.body.residence_city_id, req.body.residence_region_id, req.body.residence_country_id],
                );
                if (!hierarchy.rows[0]) {
                    return res.status(422).json({ code: 'INVALID_RESIDENCE_HIERARCHY', message: 'Residence references do not form a valid hierarchy' });
                }
                if (hasResidenceLatitude && req.body.residence_latitude !== null) {
                    const { latitude, longitude } = hierarchy.rows[0];
                    const latitudeDelta = Math.abs(Number(req.body.residence_latitude) - Number(latitude));
                    const longitudeDelta = Math.abs(Number(req.body.residence_longitude) - Number(longitude));
                    if (latitudeDelta > 0.5 || longitudeDelta > 0.5) {
                        return res.status(422).json({ code: 'RESIDENCE_COORDINATES_MISMATCH', message: 'Residence coordinates do not match the selected city' });
                    }
                }
            }
        }
        for (const [field, list] of Object.entries(req.files ?? {})) {
            const position = Number(field.split('_')[1]) + 1;
            staged.push({ position, photo: await stagePhoto(req.user.id, list[0]) });
        }
        await client.query('BEGIN');
        const validateInterestIds = async (ids, table) => {
            if (!ids) return;
            const result = await client.query(`SELECT id FROM ${table} WHERE id = ANY($1::uuid[])`, [ids]);
            if (result.rowCount !== ids.length) throw new Error('Unknown interests');
        };
        await validateInterestIds(animeIds, 'animes');
        await validateInterestIds(gameIds, 'games');
        await client.query(
            `UPDATE users SET
                nickname = COALESCE($1, nickname), bio = COALESCE($2, bio),
                gender = COALESCE(NULLIF($3, ''), gender),
                birthdate = CASE WHEN $4::text IS NULL THEN birthdate WHEN $4 = '' THEN NULL ELSE $4::date END,
                residence_country_id = CASE WHEN $5::boolean THEN $6::uuid ELSE residence_country_id END,
                residence_region_id = CASE WHEN $7::boolean THEN $8::uuid ELSE residence_region_id END,
                residence_city_id = CASE WHEN $9::boolean THEN $10::uuid ELSE residence_city_id END,
                residence_latitude = CASE WHEN $11::boolean THEN $12::double precision ELSE residence_latitude END,
                residence_longitude = CASE WHEN $11::boolean THEN $13::double precision ELSE residence_longitude END,
                updated_at = NOW() WHERE id = $14`,
            [
                req.body.nickname ?? null,
                req.body.bio ?? null,
                req.body.gender ?? null,
                req.body.birthdate ?? null,
                hasResidenceCountry,
                req.body.residence_country_id ?? null,
                hasResidenceRegion,
                req.body.residence_region_id ?? null,
                hasResidenceCity,
                req.body.residence_city_id ?? null,
                hasResidenceLatitude,
                req.body.residence_latitude ?? null,
                req.body.residence_longitude ?? null,
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
            search_scope = 'radius_residence',
            search_target_country_id = null,
            search_match_live_location = false,
        } = req.body;

        await db.query(
            `INSERT INTO user_search_preferences (
                user_id, search_radius_km, search_scope, search_target_country_id, search_match_live_location, updated_at
             ) VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (user_id) DO UPDATE SET
                search_radius_km = EXCLUDED.search_radius_km,
                search_scope = EXCLUDED.search_scope,
                search_target_country_id = EXCLUDED.search_target_country_id,
                search_match_live_location = EXCLUDED.search_match_live_location,
                updated_at = NOW()`,
            [req.user.id, search_radius_km, search_scope, search_target_country_id, search_match_live_location],
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
