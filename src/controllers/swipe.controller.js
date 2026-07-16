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
        const usersResult = await db.query(
            `SELECT ${PUBLIC_USER_SQL_COLUMNS}
             FROM users u
             WHERE u.id != $1 AND u.is_deleted = FALSE
               AND u.id NOT IN (
                   SELECT to_user_id FROM likes WHERE from_user_id = $1
                   UNION SELECT to_user_id FROM dislikes WHERE from_user_id = $1
               )
             ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`,
            [req.user.id, limit, offset],
        );
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
