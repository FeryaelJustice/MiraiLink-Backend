import db from '../models/db.js';

export const getFeed = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = 10, offset = 0 } = req.query;

        // 1. Obtener usuarios candidatos
        const usersResult = await db.query(
            `SELECT * FROM users
            WHERE id != $1
                AND is_deleted = false
                AND id NOT IN (
                    SELECT to_user_id FROM likes WHERE from_user_id = $1
                    UNION
                    SELECT to_user_id FROM dislikes WHERE from_user_id = $1
                )
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );
        const users = usersResult.rows;
        const userIds = users.map(user => user.id);

        // 2. Obtener fotos
        const photosResult = await db.query(
            'SELECT id, user_id, url, position FROM user_photos WHERE user_id = ANY($1::uuid[]) ORDER BY position ASC',
            [userIds]
        );

        const photosByUser = {};
        for (const photo of photosResult.rows) {
            if (!photosByUser[photo.user_id]) {
                photosByUser[photo.user_id] = [];
            }
            photosByUser[photo.user_id].push({
                id: photo.id,
                user_id: photo.user_id,
                url: photo.url,
                position: photo.position
            });
        }

        // 3. Obtener animes
        const animeResult = await db.query(`
            SELECT uai.user_id, a.id, a.name, a.image_url
            FROM user_anime_interests uai
            JOIN animes a ON uai.anime_id = a.id
            WHERE uai.user_id = ANY($1::uuid[])`, [userIds]
        );

        const animesByUser = {};
        for (const row of animeResult.rows) {
            if (!animesByUser[row.user_id]) animesByUser[row.user_id] = [];
            animesByUser[row.user_id].push({
                id: row.id,
                name: row.name,
                image_url: row.image_url,
            });
        }

        // 4. Obtener games
        const gameResult = await db.query(`
            SELECT ugi.user_id, g.id, g.name, g.image_url
            FROM user_game_interests ugi
            JOIN games g ON ugi.game_id = g.id
            WHERE ugi.user_id = ANY($1::uuid[])`, [userIds]
        );

        const gamesByUser = {};
        for (const row of gameResult.rows) {
            if (!gamesByUser[row.user_id]) gamesByUser[row.user_id] = [];
            gamesByUser[row.user_id].push({
                id: row.id,
                name: row.name,
                image_url: row.image_url,
            });
        }

        // 5. Combinar todo
        const usersWithExtras = users.map(user => ({
            ...user,
            photos: photosByUser[user.id] || [],
            animes: animesByUser[user.id] || [],
            games: gamesByUser[user.id] || []
        }));

        res.json(usersWithExtras);
    } catch (err) {
        next(err);
    }
};

export const likeUser = async (req, res, next) => {
    try {
        const fromUserId = req.user.id;
        const { toUserId } = req.body;

        if (fromUserId === toUserId) {
            return res.status(400).json({ message: 'No puedes hacer like a ti mismo' });
        }

        await db.query(
            'INSERT INTO likes (from_user_id, to_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [fromUserId, toUserId]
        );

        // Check for match
        const reciprocal = await db.query(
            'SELECT * FROM likes WHERE from_user_id = $1 AND to_user_id = $2',
            [toUserId, fromUserId]
        );

        let isMatch = false;

        if (reciprocal.rows.length > 0) {
            const [user1, user2] = [fromUserId, toUserId].sort();
            await db.query(
                `INSERT INTO matches (user1_id, user2_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING`,
                [user1, user2]
            );
            isMatch = true;
        }

        res.status(200).json({ message: 'Liked', match: isMatch });
    } catch (err) {
        next(err);
    }
};

export const dislikeUser = async (req, res, next) => {
    try {
        const fromUserId = req.user.id;
        const { toUserId } = req.body;

        await db.query(
            `INSERT INTO dislikes (from_user_id, to_user_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING`,
            [fromUserId, toUserId]
        );

        res.status(200).json({ message: 'Disliked' });
    } catch (err) {
        next(err);
    }
};