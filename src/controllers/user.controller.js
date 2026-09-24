import { basename } from 'node:path';
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

function parseArrayOfIds(value, max = 100) {
    if (value === undefined || value === null) return null;
    let parsed = value;
    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value);
        } catch {
            parsed = value.split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    if (!Array.isArray(parsed) || parsed.length > max) throw new Error('Invalid array of IDs');
    const ids = parsed.map(item => (typeof item === 'object' ? item?.id : item)).filter(id => typeof id === 'string');
    return [...new Set(ids)];
}

function parsePrompts(value) {
    if (value === undefined || value === null) return null;
    let parsed = value;
    if (typeof value === 'string') {
        try {
            parsed = JSON.parse(value);
        } catch {
            throw new Error('Invalid prompts format');
        }
    }
    if (!Array.isArray(parsed) || parsed.length > 3) throw new Error('Maximum 3 prompts allowed');
    return parsed.filter(item => typeof item?.prompt_id === 'string' && typeof item?.answer === 'string' && item.answer.trim().length > 0 && item.answer.trim().length <= 300);
}

function localizedAttributeColumns(alias = 'u') {
    return `
        ${alias}.profession,
        ${alias}.religion_id, COALESCE(rel_req.label, rel_es.label) AS religion,
        ${alias}.zodiac_sign_id, COALESCE(zod_req.label, zod_es.label) AS zodiac_sign,
        ${alias}.political_stance_id, COALESCE(pol_req.label, pol_es.label) AS political_stance,
        ${alias}.smoking_habit_id, COALESCE(smo_req.label, smo_es.label) AS smoking_habit,
        ${alias}.drinking_habit_id, COALESCE(dri_req.label, dri_es.label) AS drinking_habit,
        ${alias}.sexual_orientation_id, COALESCE(sex_req.label, sex_es.label) AS sexual_orientation,
        ${alias}.education_level_id, COALESCE(edu_req.label, edu_es.label) AS education_level
    `;
}

function localizedAttributeJoins(alias = 'u', localePosition = 2) {
    return `
        LEFT JOIN supported_languages fallback_lang ON fallback_lang.code = 'es'
        LEFT JOIN supported_languages req_lang ON req_lang.code = $${localePosition}
        LEFT JOIN religion_translations rel_req ON rel_req.religion_id = ${alias}.religion_id AND rel_req.language_id = req_lang.id
        LEFT JOIN religion_translations rel_es ON rel_es.religion_id = ${alias}.religion_id AND rel_es.language_id = fallback_lang.id
        LEFT JOIN zodiac_sign_translations zod_req ON zod_req.sign_id = ${alias}.zodiac_sign_id AND zod_req.language_id = req_lang.id
        LEFT JOIN zodiac_sign_translations zod_es ON zod_es.sign_id = ${alias}.zodiac_sign_id AND zod_es.language_id = fallback_lang.id
        LEFT JOIN political_stance_translations pol_req ON pol_req.stance_id = ${alias}.political_stance_id AND pol_req.language_id = req_lang.id
        LEFT JOIN political_stance_translations pol_es ON pol_es.stance_id = ${alias}.political_stance_id AND pol_es.language_id = fallback_lang.id
        LEFT JOIN smoking_habit_translations smo_req ON smo_req.habit_id = ${alias}.smoking_habit_id AND smo_req.language_id = req_lang.id
        LEFT JOIN smoking_habit_translations smo_es ON smo_es.habit_id = ${alias}.smoking_habit_id AND smo_es.language_id = fallback_lang.id
        LEFT JOIN drinking_habit_translations dri_req ON dri_req.habit_id = ${alias}.drinking_habit_id AND dri_req.language_id = req_lang.id
        LEFT JOIN drinking_habit_translations dri_es ON dri_es.habit_id = ${alias}.drinking_habit_id AND dri_es.language_id = fallback_lang.id
        LEFT JOIN sexual_orientation_translations sex_req ON sex_req.orientation_id = ${alias}.sexual_orientation_id AND sex_req.language_id = req_lang.id
        LEFT JOIN sexual_orientation_translations sex_es ON sex_es.orientation_id = ${alias}.sexual_orientation_id AND sex_es.language_id = fallback_lang.id
        LEFT JOIN education_level_translations edu_req ON edu_req.level_id = ${alias}.education_level_id AND edu_req.language_id = req_lang.id
        LEFT JOIN education_level_translations edu_es ON edu_es.level_id = ${alias}.education_level_id AND edu_es.language_id = fallback_lang.id
    `;
}

async function profileExtras(userId, req) {
    const locale = resolveCatalogLanguage(req.get('accept-language'));
    const [animes, games, photos, goals, family, languages, prompts] = await Promise.all([
        db.query(localizedInterestSql('anime', 'i.user_id = $1', 2), [userId, locale]),
        db.query(localizedInterestSql('game', 'i.user_id = $1', 2), [userId, locale]),
        db.query('SELECT id, user_id, url, position FROM user_photos WHERE user_id = $1 ORDER BY position', [userId]),
        db.query(`
            SELECT g.id, g.code, COALESCE(t_req.label, t_es.label) AS label
            FROM user_relationship_goals urg
            JOIN relationship_goals g ON g.id = urg.goal_id
            JOIN supported_languages fallback_language ON fallback_language.code = 'es'
            LEFT JOIN supported_languages requested_language ON requested_language.code = $2
            LEFT JOIN relationship_goal_translations t_req ON t_req.goal_id = g.id AND t_req.language_id = requested_language.id
            LEFT JOIN relationship_goal_translations t_es ON t_es.goal_id = g.id AND t_es.language_id = fallback_language.id
            WHERE urg.user_id = $1
        `, [userId, locale]),
        db.query(`
            SELECT f.id, f.code, COALESCE(t_req.label, t_es.label) AS label
            FROM user_family_options ufo
            JOIN family_options f ON f.id = ufo.option_id
            JOIN supported_languages fallback_language ON fallback_language.code = 'es'
            LEFT JOIN supported_languages requested_language ON requested_language.code = $2
            LEFT JOIN family_option_translations t_req ON t_req.option_id = f.id AND t_req.language_id = requested_language.id
            LEFT JOIN family_option_translations t_es ON t_es.option_id = f.id AND t_es.language_id = fallback_language.id
            WHERE ufo.user_id = $1
        `, [userId, locale]),
        db.query(`
            SELECT sl.id, sl.code, COALESCE(t_req.label, t_es.label) AS label
            FROM user_spoken_languages usl
            JOIN spoken_languages sl ON sl.id = usl.language_id
            JOIN supported_languages fallback_language ON fallback_language.code = 'es'
            LEFT JOIN supported_languages requested_language ON requested_language.code = $2
            LEFT JOIN spoken_language_translations t_req ON t_req.language_item_id = sl.id AND t_req.language_id = requested_language.id
            LEFT JOIN spoken_language_translations t_es ON t_es.language_item_id = sl.id AND t_es.language_id = fallback_language.id
            WHERE usl.user_id = $1
        `, [userId, locale]),
        db.query(`
            SELECT upp.id, upp.prompt_id, upp.answer, p.code, COALESCE(t_req.question, t_es.question) AS question
            FROM user_profile_prompts upp
            JOIN profile_prompts p ON p.id = upp.prompt_id
            JOIN supported_languages fallback_language ON fallback_language.code = 'es'
            LEFT JOIN supported_languages requested_language ON requested_language.code = $2
            LEFT JOIN profile_prompt_translations t_req ON t_req.prompt_id = p.id AND t_req.language_id = requested_language.id
            LEFT JOIN profile_prompt_translations t_es ON t_es.prompt_id = p.id AND t_es.language_id = fallback_language.id
            WHERE upp.user_id = $1
            ORDER BY upp.created_at ASC
        `, [userId, locale]),
    ]);
    return {
        animes: animes.rows.map(row => toLocalizedCatalogItem(row, req)),
        games: games.rows.map(row => toLocalizedCatalogItem(row, req)),
        photos: photos.rows,
        relationship_goals: goals.rows,
        family_options: family.rows,
        spoken_languages: languages.rows,
        prompts: prompts.rows,
    };
}

export const getProfile = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const result = await db.query(
            `SELECT u.id, u.username, u.nickname, u.bio,
                    u.gender, TO_CHAR(u.birthdate, 'YYYY-MM-DD') AS birthdate,
                    ${localizedResidenceColumns('u')},
                    ${localizedAttributeColumns('u')},
                    u.residence_latitude, u.residence_longitude,
                    u.current_latitude, u.current_longitude, u.last_location_updated_at,
                    COALESCE(p.search_radius_km, 40) AS search_radius_km,
                    COALESCE(p.search_scope, 'radius_residence') AS search_scope,
                    p.search_target_country_id,
                    COALESCE(p.search_match_live_location, FALSE) AS search_match_live_location
             FROM users u
             LEFT JOIN user_search_preferences p ON p.user_id = u.id
             ${localizedResidenceJoins('u', 2)}
             ${localizedAttributeJoins('u', 2)}
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
            `SELECT u.id, u.username, u.nickname, u.bio, u.gender,
                    TO_CHAR(u.birthdate, 'YYYY-MM-DD') AS birthdate,
                    ${localizedResidenceColumns('u')},
                    ${localizedAttributeColumns('u')}
             FROM users u
             ${localizedResidenceJoins('u', 2)}
             ${localizedAttributeJoins('u', 2)}
             WHERE u.id = $1 AND u.is_deleted = FALSE`,
            [req.body.id, locale],
        );
        if (!result.rows[0]) return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        return res.json({ ...toPublicUser(result.rows[0]), ...await profileExtras(req.body.id, req) });
    } catch (error) {
        return next(error);
    }
};

export const getProfileByUsername = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const result = await db.query(
            `SELECT u.id, u.username, u.nickname, u.bio, u.gender,
                    TO_CHAR(u.birthdate, 'YYYY-MM-DD') AS birthdate,
                    ${localizedResidenceColumns('u')},
                    ${localizedAttributeColumns('u')}
             FROM users u
             ${localizedResidenceJoins('u', 2)}
             ${localizedAttributeJoins('u', 2)}
             WHERE LOWER(u.username) = LOWER($1) AND u.is_deleted = FALSE`,
            [req.params.username, locale],
        );
        if (!result.rows[0]) return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        const user = result.rows[0];
        const extras = await profileExtras(user.id, req);
        return res.json({ ...toPublicUser(user), ...extras });
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
        const hasProfession = Object.hasOwn(req.body, 'profession');
        const hasReligion = Object.hasOwn(req.body, 'religion_id');
        const hasZodiac = Object.hasOwn(req.body, 'zodiac_sign_id');
        const hasPolitical = Object.hasOwn(req.body, 'political_stance_id');
        const hasSmoking = Object.hasOwn(req.body, 'smoking_habit_id');
        const hasDrinking = Object.hasOwn(req.body, 'drinking_habit_id');
        const hasSexual = Object.hasOwn(req.body, 'sexual_orientation_id');
        const hasEducation = Object.hasOwn(req.body, 'education_level_id');

        const goalIds = parseArrayOfIds(req.body.relationship_goals);
        const familyIds = parseArrayOfIds(req.body.family_options);
        const languageIds = parseArrayOfIds(req.body.spoken_languages);
        const promptsList = parsePrompts(req.body.prompts);

        const cleanUuid = val => (typeof val === 'string' && val.trim().length > 0 ? val.trim() : null);

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
                profession = CASE WHEN $3::boolean THEN $4::varchar(100) ELSE profession END,
                religion_id = CASE WHEN $5::boolean THEN $6::uuid ELSE religion_id END,
                zodiac_sign_id = CASE WHEN $7::boolean THEN $8::uuid ELSE zodiac_sign_id END,
                political_stance_id = CASE WHEN $9::boolean THEN $10::uuid ELSE political_stance_id END,
                smoking_habit_id = CASE WHEN $11::boolean THEN $12::uuid ELSE smoking_habit_id END,
                drinking_habit_id = CASE WHEN $13::boolean THEN $14::uuid ELSE drinking_habit_id END,
                sexual_orientation_id = CASE WHEN $15::boolean THEN $16::uuid ELSE sexual_orientation_id END,
                education_level_id = CASE WHEN $17::boolean THEN $18::uuid ELSE education_level_id END,
                residence_country_id = CASE WHEN $19::boolean THEN $20::uuid ELSE residence_country_id END,
                residence_region_id = CASE WHEN $21::boolean THEN $22::uuid ELSE residence_region_id END,
                residence_city_id = CASE WHEN $23::boolean THEN $24::uuid ELSE residence_city_id END,
                residence_latitude = CASE WHEN $25::boolean THEN $26::double precision ELSE residence_latitude END,
                residence_longitude = CASE WHEN $25::boolean THEN $27::double precision ELSE residence_longitude END,
                updated_at = NOW() WHERE id = $28`,
            [
                req.body.nickname ?? null,
                req.body.bio ?? null,
                hasProfession,
                req.body.profession ?? null,
                hasReligion,
                cleanUuid(req.body.religion_id),
                hasZodiac,
                cleanUuid(req.body.zodiac_sign_id),
                hasPolitical,
                cleanUuid(req.body.political_stance_id),
                hasSmoking,
                cleanUuid(req.body.smoking_habit_id),
                hasDrinking,
                cleanUuid(req.body.drinking_habit_id),
                hasSexual,
                cleanUuid(req.body.sexual_orientation_id),
                hasEducation,
                cleanUuid(req.body.education_level_id),
                hasResidenceCountry,
                cleanUuid(req.body.residence_country_id),
                hasResidenceRegion,
                cleanUuid(req.body.residence_region_id),
                hasResidenceCity,
                cleanUuid(req.body.residence_city_id),
                hasResidenceLatitude,
                req.body.residence_latitude ?? null,
                req.body.residence_longitude ?? null,
                req.user.id,
            ],
        );
        if (goalIds) {
            await client.query('DELETE FROM user_relationship_goals WHERE user_id = $1', [req.user.id]);
            for (const id of goalIds) await client.query('INSERT INTO user_relationship_goals (user_id, goal_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, id]);
        }
        if (familyIds) {
            await client.query('DELETE FROM user_family_options WHERE user_id = $1', [req.user.id]);
            for (const id of familyIds) await client.query('INSERT INTO user_family_options (user_id, option_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, id]);
        }
        if (languageIds) {
            await client.query('DELETE FROM user_spoken_languages WHERE user_id = $1', [req.user.id]);
            for (const id of languageIds) await client.query('INSERT INTO user_spoken_languages (user_id, language_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, id]);
        }
        if (promptsList) {
            await client.query('DELETE FROM user_profile_prompts WHERE user_id = $1', [req.user.id]);
            for (const p of promptsList) {
                await client.query(
                    'INSERT INTO user_profile_prompts (user_id, prompt_id, answer) VALUES ($1, $2, $3) ON CONFLICT (user_id, prompt_id) DO UPDATE SET answer = EXCLUDED.answer',
                    [req.user.id, p.prompt_id, p.answer.trim()],
                );
            }
        }
        if (animeIds) {
            await client.query('DELETE FROM user_anime_interests WHERE user_id = $1', [req.user.id]);
            for (const id of animeIds) await client.query('INSERT INTO user_anime_interests (user_id, anime_id) VALUES ($1, $2)', [req.user.id, id]);
        }
        if (gameIds) {
            await client.query('DELETE FROM user_game_interests WHERE user_id = $1', [req.user.id]);
            for (const id of gameIds) await client.query('INSERT INTO user_game_interests (user_id, game_id) VALUES ($1, $2)', [req.user.id, id]);
        }
        let reordered = null;
        if (req.body.reorderedPositions) {
            try {
                reordered = typeof req.body.reorderedPositions === 'string'
                    ? JSON.parse(req.body.reorderedPositions)
                    : req.body.reorderedPositions;
            } catch {
                reordered = null;
            }
        }

        if (Array.isArray(reordered)) {
            const existingPhotosResult = await client.query(
                'SELECT id, url, position FROM user_photos WHERE user_id = $1',
                [req.user.id],
            );
            const currentPhotos = existingPhotosResult.rows;

            const targetPhotos = [];
            for (let position = 1; position <= 4; position += 1) {
                const stagedItem = staged.find(item => item.position === position);
                if (stagedItem) {
                    targetPhotos.push({ position, url: stagedItem.photo.url, isNew: true });
                } else {
                    const reorderedItem = reordered.find(item => Number(item?.position) === position);
                    if (reorderedItem?.url) {
                        const matched = currentPhotos.find(p =>
                            p.url === reorderedItem.url ||
                            reorderedItem.url.endsWith(p.url) ||
                            p.url.endsWith(reorderedItem.url) ||
                            basename(p.url) === basename(reorderedItem.url),
                        );
                        if (matched) {
                            targetPhotos.push({ position, url: matched.url, isNew: false });
                        }
                    }
                }
            }

            // Compact photos into contiguous positions 1..N based on assigned target positions
            targetPhotos.sort((a, b) => a.position - b.position);
            const keptUrls = new Set(targetPhotos.map(p => p.url));

            for (const current of currentPhotos) {
                if (!keptUrls.has(current.url)) {
                    oldUrls.push(current.url);
                }
            }

            await client.query('DELETE FROM user_photos WHERE user_id = $1', [req.user.id]);
            for (let i = 0; i < targetPhotos.length; i += 1) {
                const finalPosition = i + 1;
                await client.query(
                    'INSERT INTO user_photos (user_id, url, position) VALUES ($1, $2, $3)',
                    [req.user.id, targetPhotos[i].url, finalPosition],
                );
            }
        } else {
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
