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
                    TO_CHAR(birthdate, 'YYYY-MM-DD') AS birthdate
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
                    TO_CHAR(birthdate, 'YYYY-MM-DD') AS birthdate
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
                updated_at = NOW() WHERE id = $5`,
            [req.body.nickname ?? null, req.body.bio ?? null, req.body.gender ?? null, req.body.birthdate ?? null, req.user.id],
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
