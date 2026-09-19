import db from '../models/db.js';
import { PUBLIC_USER_SQL_COLUMNS, toPublicUsers } from '../dto/user.dto.js';

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
            `SELECT residence_country_code, residence_latitude, residence_longitude,
                    current_latitude, current_longitude,
                    search_radius_km, search_scope, search_target_country, search_match_live_location
             FROM users WHERE id = $1`,
            [req.user.id],
        );
        const currentUser = currentUserResult.rows[0];

        const originLat = currentUser?.current_latitude ?? currentUser?.residence_latitude;
        const originLng = currentUser?.current_longitude ?? currentUser?.residence_longitude;
        const userCountry = currentUser?.residence_country_code ?? 'ES';

        const scope = req.query.scope ?? currentUser?.search_scope ?? 'radius';
        const radiusKm = req.query.radius_km !== undefined
            ? Number(req.query.radius_km)
            : (currentUser?.search_radius_km ?? 40);
        const matchLiveLocation = req.query.match_live_location !== undefined
            ? (req.query.match_live_location === 'true' || req.query.match_live_location === true)
            : (currentUser?.search_match_live_location ?? false);
        const targetCountry = req.query.target_country ?? currentUser?.search_target_country;

        let distanceSql;
        let candidateLatSql;
        let candidateLngSql;

        if (matchLiveLocation) {
            candidateLatSql = 'COALESCE(u.current_latitude, u.residence_latitude)';
            candidateLngSql = 'COALESCE(u.current_longitude, u.residence_longitude)';
        } else {
            candidateLatSql = 'u.residence_latitude';
            candidateLngSql = 'u.residence_longitude';
        }

        if (originLat != null && originLng != null) {
            distanceSql = `
                ROUND((6371 * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(${originLat})) * cos(radians(${candidateLatSql})) * cos(radians(${candidateLngSql}) - radians(${originLng}))
                        + sin(radians(${originLat})) * sin(radians(${candidateLatSql}))
                    ))
                ))::numeric, 1)
            `;
        } else {
            distanceSql = 'NULL::numeric';
        }

        let scopeFilter = '';
        const params = [req.user.id, limit, offset];

        if (scope === 'radius' && originLat != null && originLng != null) {
            params.push(radiusKm);
            scopeFilter = `
                AND ${candidateLatSql} IS NOT NULL
                AND ${candidateLngSql} IS NOT NULL
                AND (6371 * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(${originLat})) * cos(radians(${candidateLatSql})) * cos(radians(${candidateLngSql}) - radians(${originLng}))
                        + sin(radians(${originLat})) * sin(radians(${candidateLatSql}))
                    ))
                )) <= $${params.length}
            `;
        } else if (scope === 'country') {
            params.push(userCountry);
            scopeFilter = `AND u.residence_country_code = $${params.length}`;
        } else if (scope === 'specific_country' && targetCountry) {
            params.push(targetCountry);
            scopeFilter = `AND u.residence_country_code = $${params.length}`;
        }

        const isTravelerSql = matchLiveLocation
            ? `CASE WHEN u.current_latitude IS NOT NULL AND u.residence_city IS NOT NULL THEN TRUE ELSE FALSE END`
            : `FALSE`;

        const queryText = `
            WITH ranked_candidates AS (
            SELECT ${PUBLIC_USER_SQL_COLUMNS},
                   u.created_at,
                   ${distanceSql} AS distance_km,
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
              ${scopeFilter}
              AND u.id NOT IN (
                  SELECT to_user_id FROM likes WHERE from_user_id = $1
                  UNION SELECT to_user_id FROM dislikes WHERE from_user_id = $1
              )
            )
            SELECT * FROM ranked_candidates
            ORDER BY
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
            db.query('SELECT i.user_id, a.id, a.name, a.image_url FROM user_anime_interests i JOIN animes a ON a.id = i.anime_id WHERE i.user_id = ANY($1::uuid[])', [userIds]),
            db.query('SELECT i.user_id, g.id, g.name, g.image_url FROM user_game_interests i JOIN games g ON g.id = i.game_id WHERE i.user_id = ANY($1::uuid[])', [userIds]),
        ]);
        const group = rows => Object.groupBy(rows, row => row.user_id);
        const photoMap = group(photos.rows);
        const animeMap = group(animes.rows);
        const gameMap = group(games.rows);
        return res.json(users.map(user => ({
            ...user,
            photos: photoMap[user.id] ?? [],
            animes: animeMap[user.id] ?? [],
            games: gameMap[user.id] ?? [],
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
