import db from '../models/db.js';
import { PUBLIC_USER_SQL_COLUMNS, toPublicUsers } from '../dto/user.dto.js';

export const getMatches = async (req, res, next) => {
    try {
        const base = await db.query(
            `SELECT ${PUBLIC_USER_SQL_COLUMNS}
             FROM matches m JOIN users u ON
               (u.id = m.user1_id AND m.user2_id = $1)
               OR (u.id = m.user2_id AND m.user1_id = $1)
             WHERE u.id != $1 AND u.is_deleted = FALSE`,
            [req.user.id],
        );
        const users = toPublicUsers(base.rows);
        const enriched = await Promise.all(users.map(async user => {
            const [photos, animes, games] = await Promise.all([
                db.query('SELECT id, user_id, url, position FROM user_photos WHERE user_id = $1 ORDER BY position', [user.id]),
                db.query('SELECT a.id, a.name, a.image_url FROM user_anime_interests i JOIN animes a ON a.id = i.anime_id WHERE i.user_id = $1', [user.id]),
                db.query('SELECT g.id, g.name, g.image_url FROM user_game_interests i JOIN games g ON g.id = i.game_id WHERE i.user_id = $1', [user.id]),
            ]);
            return { ...user, photos: photos.rows, animes: animes.rows, games: games.rows };
        }));
        return res.json(enriched);
    } catch (error) {
        return next(error);
    }
};

export const getUnseenMatches = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, user1_id, user2_id FROM matches
             WHERE (user1_id = $1 AND seen_by_user1 = FALSE)
                OR (user2_id = $1 AND seen_by_user2 = FALSE)`,
            [req.user.id],
        );
        return res.json(result.rows);
    } catch (error) {
        return next(error);
    }
};

export const markMatchesSeen = async (req, res, next) => {
    try {
        await db.query(
            `UPDATE matches SET
                seen_by_user1 = CASE WHEN user1_id = $1 THEN TRUE ELSE seen_by_user1 END,
                seen_by_user2 = CASE WHEN user2_id = $1 THEN TRUE ELSE seen_by_user2 END
             WHERE id = ANY($2::uuid[]) AND (user1_id = $1 OR user2_id = $1)`,
            [req.user.id, req.body.matchIds],
        );
        return res.json({ message: 'Marked as seen' });
    } catch (error) {
        return next(error);
    }
};
