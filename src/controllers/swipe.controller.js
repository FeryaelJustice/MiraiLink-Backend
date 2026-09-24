import db from '../models/db.js';
import { PUBLIC_USER_SQL_COLUMNS, toPublicUser, toPublicUsers } from '../dto/user.dto.js';
import { AppError } from '../errors/AppError.js';
import { localizedInterestSql, resolveCatalogLanguage, toLocalizedCatalogItem } from '../utils/catalogLocalization.js';
import { candidateCoordinateSql, resolveUserCoordinates } from '../utils/geoSearch.js';
import { localizedResidenceColumns, localizedResidenceJoins } from '../utils/geographyLocalization.js';

async function targetExists(userId) {
    const result = await db.query(
        'SELECT 1 FROM users WHERE id = $1 AND is_deleted = FALSE LIMIT 1',
        [userId],
    );
    return result.rowCount > 0;
}

export const getFeed = async (req, res, next) => {
    try {
        const { limit = 10, offset = 0 } = req.query;

        const currentUserResult = await db.query(
            `SELECT u.residence_country_id, u.residence_latitude, u.residence_longitude,
                    u.current_latitude, u.current_longitude, u.last_location_updated_at,
                    p.search_radius_km, p.search_scope, p.search_target_country_id, p.search_match_live_location
             FROM users u
             LEFT JOIN user_search_preferences p ON p.user_id = u.id
             WHERE u.id = $1`,
            [req.user.id],
        );
        const currentUser = currentUserResult.rows[0];

        const storedScope = currentUser?.search_scope ?? 'radius';
        const scope = req.query.scope ?? storedScope;
        const radiusKm = req.query.radius_km !== undefined
            ? Number(req.query.radius_km)
            : (currentUser?.search_radius_km ?? 40);
        const legacyMatchLiveLocation = currentUser?.search_match_live_location ?? false;
        const normalizedScope = scope === 'radius'
            ? (legacyMatchLiveLocation ? 'radius_active' : 'radius_residence')
            : scope;
        const useActiveLocation = normalizedScope === 'radius_active';
        const targetCountryId = req.query.target_country_id ?? currentUser?.search_target_country_id;
        const params = [req.user.id, limit, offset];
        const origin = resolveUserCoordinates(currentUser, useActiveLocation);
        const candidateCoordinates = candidateCoordinateSql(useActiveLocation);

        let distanceSql = 'NULL::numeric';
        if (origin) {
            params.push(origin.latitude, origin.longitude);
            const originLatParam = `$${params.length - 1}`;
            const originLngParam = `$${params.length}`;
            distanceSql = `ROUND((6371 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(${originLatParam})) * cos(radians(candidate_latitude))
                    * cos(radians(candidate_longitude) - radians(${originLngParam}))
                    + sin(radians(${originLatParam})) * sin(radians(candidate_latitude))
                ))
            ))::numeric, 1)`;
        }

        let scopeFilter = 'TRUE';
        let geographyKnownSql = 'TRUE';
        if (normalizedScope === 'radius_residence' || normalizedScope === 'radius_active') {
            if (!origin) {
                throw new AppError({
                    status: 422,
                    code: 'LOCATION_REQUIRED',
                    message: useActiveLocation
                        ? 'A fresh active location is required for active radius search'
                        : 'A residence location is required for residence radius search',
                });
            }
            params.push(radiusKm);
            scopeFilter = `(distance_km IS NULL OR distance_km <= $${params.length})`;
            geographyKnownSql = 'distance_km IS NOT NULL';
        } else if (normalizedScope === 'country') {
            if (!currentUser?.residence_country_id) {
                throw new AppError({
                    status: 422,
                    code: 'RESIDENCE_COUNTRY_REQUIRED',
                    message: 'A residence country is required for country search',
                });
            }
            params.push(currentUser.residence_country_id);
            scopeFilter = `(residence_country_id IS NULL OR residence_country_id = $${params.length})`;
            geographyKnownSql = 'residence_country_id IS NOT NULL';
        } else if (normalizedScope === 'specific_country') {
            if (!targetCountryId) {
                throw new AppError({
                    status: 422,
                    code: 'TARGET_COUNTRY_REQUIRED',
                    message: 'A target country is required for passport search',
                });
            }
            params.push(targetCountryId);
            scopeFilter = `(residence_country_id IS NULL OR residence_country_id = $${params.length})`;
            geographyKnownSql = 'residence_country_id IS NOT NULL';
        } else if (origin) {
            geographyKnownSql = 'distance_km IS NOT NULL';
        }

        // A user is a traveler only when their live position is meaningfully
        // away from their registered residence. The distance threshold avoids
        // treating normal GPS noise within the same city as travel.
        const isTravelerSql = `(
                u.current_latitude IS NOT NULL
                AND u.current_longitude IS NOT NULL
                AND u.residence_latitude IS NOT NULL
                AND u.residence_longitude IS NOT NULL
                AND u.last_location_updated_at >= NOW() - INTERVAL '24 hours'
                AND (6371 * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(u.residence_latitude)) * cos(radians(u.current_latitude)) * cos(radians(u.current_longitude) - radians(u.residence_longitude))
                        + sin(radians(u.residence_latitude)) * sin(radians(u.current_latitude))
                    ))
                )) > 10
            )`;

        const locale = resolveCatalogLanguage(req.get('accept-language'));
        params.push(locale);
        const residenceLocalePosition = params.length;
        const queryText = `
            WITH candidate_geo AS (
            SELECT ${PUBLIC_USER_SQL_COLUMNS},
                   u.created_at,
                   ${candidateCoordinates.latitude} AS candidate_latitude,
                   ${candidateCoordinates.longitude} AS candidate_longitude,
                   ${isTravelerSql} AS is_traveler,
                   COALESCE((
                       SELECT COUNT(*) FROM user_anime_interests ai
                       WHERE ai.user_id = u.id AND ai.anime_id IN (
                           SELECT anime_id FROM user_anime_interests WHERE user_id = $1
                       )
                   ), 0) +
                   COALESCE((
                       SELECT COUNT(*) FROM user_game_interests gi
                       WHERE gi.user_id = u.id AND gi.game_id IN (
                           SELECT game_id FROM user_game_interests WHERE user_id = $1
                       )
                   ), 0) AS common_interests
            FROM users u
            WHERE u.id != $1 AND u.is_deleted = FALSE
              AND u.id NOT IN (
                  SELECT to_user_id FROM likes WHERE from_user_id = $1
                  UNION SELECT to_user_id FROM dislikes WHERE from_user_id = $1
              )
            ), scored_candidates AS (
                SELECT *, ${distanceSql} AS distance_km
                FROM candidate_geo
            ), ranked_candidates AS (
                SELECT *, ${geographyKnownSql} AS geography_known
                FROM scored_candidates
                WHERE ${scopeFilter}
            )
            SELECT ranked_candidates.id, ranked_candidates.nickname, ranked_candidates.bio,
                   ranked_candidates.gender, ranked_candidates.birthdate,
                   ${localizedResidenceColumns('ranked_candidates')},
                   ranked_candidates.distance_km, ranked_candidates.is_traveler,
                   ranked_candidates.common_interests, ranked_candidates.created_at
            FROM ranked_candidates
            ${localizedResidenceJoins('ranked_candidates', residenceLocalePosition)}
            ORDER BY
                geography_known DESC,
                (common_interests * 15.0 +
                 CASE WHEN distance_km IS NOT NULL THEN 40.0 / (1.0 + distance_km / 10.0) ELSE 10.0 END +
                 random() * 10.0) DESC,
                created_at DESC
            LIMIT $2 OFFSET $3`;

        const usersResult = await db.query(queryText, params);
        const users = toPublicUsers(usersResult.rows);
        const userIds = users.map(user => user.id);
        if (userIds.length === 0) {
            return res.json([]);
        }
        const [photos, animes, games] = await Promise.all([
            db.query('SELECT id, user_id, url, position FROM user_photos WHERE user_id = ANY($1::uuid[]) ORDER BY position', [userIds]),
            db.query(localizedInterestSql('anime', 'i.user_id = ANY($1::uuid[])', 2, true), [userIds, locale]),
            db.query(localizedInterestSql('game', 'i.user_id = ANY($1::uuid[])', 2, true), [userIds, locale]),
        ]);
        const group = rows => Object.groupBy(rows, row => row.user_id);
        const photoMap = group(photos.rows);
        const animeMap = group(animes.rows);
        const gameMap = group(games.rows);
        return res.json(users.map(user => ({
            ...user,
            photos: photoMap[user.id] ?? [],
            animes: (animeMap[user.id] ?? []).map(row => toLocalizedCatalogItem(row, req)),
            games: (gameMap[user.id] ?? []).map(row => toLocalizedCatalogItem(row, req)),
        })));
    } catch (error) {
        return next(error);
    }
};

export const likeUser = async (req, res, next) => {
    try {
        const fromUserId = req.user.id;
        const { toUserId } = req.body;
        if (fromUserId === toUserId) {
            return res.status(400).json({ code: 'SELF_ACTION', message: 'Cannot like your own profile' });
        }
        if (!await targetExists(toUserId)) {
            return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        }
        await db.query('INSERT INTO likes (from_user_id, to_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [fromUserId, toUserId]);
        const reciprocal = await db.query('SELECT 1 FROM likes WHERE from_user_id = $1 AND to_user_id = $2', [toUserId, fromUserId]);
        if (reciprocal.rowCount > 0) {
            const [user1, user2] = [fromUserId, toUserId].sort();
            await db.query('INSERT INTO matches (user1_id, user2_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user1, user2]);
        }
        return res.json({ message: 'Liked', match: reciprocal.rowCount > 0 });
    } catch (error) {
        return next(error);
    }
};

export const dislikeUser = async (req, res, next) => {
    try {
        const fromUserId = req.user.id;
        const { toUserId } = req.body;
        if (fromUserId === toUserId) {
            return res.status(400).json({ code: 'SELF_ACTION', message: 'Cannot dislike your own profile' });
        }
        if (!await targetExists(toUserId)) {
            return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        }
        await db.query('INSERT INTO dislikes (from_user_id, to_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [fromUserId, toUserId]);
        return res.json({ message: 'Disliked' });
    } catch (error) {
        return next(error);
    }
};

export const getReceivedLikes = async (req, res, next) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const locale = resolveCatalogLanguage(req.get('accept-language'));

        const queryText = `
            SELECT l.id AS like_id, l.created_at AS liked_at,
                   u.id, u.username, u.nickname, u.bio, u.gender,
                   TO_CHAR(u.birthdate, 'YYYY-MM-DD') AS birthdate,
                   ${localizedResidenceColumns('u')}
            FROM likes l
            JOIN users u ON u.id = l.from_user_id
            ${localizedResidenceJoins('u', 4)}
            WHERE l.to_user_id = $1
              AND u.is_deleted = FALSE
              AND NOT EXISTS (
                  SELECT 1 FROM likes reciprocal
                  WHERE reciprocal.from_user_id = $1 AND reciprocal.to_user_id = l.from_user_id
              )
              AND NOT EXISTS (
                  SELECT 1 FROM dislikes d
                  WHERE d.from_user_id = $1 AND d.to_user_id = l.from_user_id
              )
            ORDER BY l.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(queryText, [req.user.id, limit, offset, locale]);
        const userIds = result.rows.map(row => row.id);
        if (userIds.length === 0) {
            return res.json([]);
        }

        const photosResult = await db.query(
            'SELECT id, user_id, url, position FROM user_photos WHERE user_id = ANY($1::uuid[]) ORDER BY position ASC',
            [userIds],
        );
        const photoMap = Object.groupBy(photosResult.rows, p => p.user_id);

        const likes = result.rows.map(row => ({
            likeId: row.like_id,
            likedAt: row.liked_at,
            user: {
                ...toPublicUser(row),
                photos: photoMap[row.id] ?? [],
            },
        }));

        return res.json(likes);
    } catch (error) {
        return next(error);
    }
};
