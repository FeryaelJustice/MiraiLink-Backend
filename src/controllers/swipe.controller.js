import db from '../models/db.js';

export const getFeed = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = 10, offset = 0 } = req.query;

        // Obtener todos los usuarios
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

        // Obtener fotos para todos los usuarios
        const userIds = users.map(user => user.id);
        const photosResult = await db.query(
            'SELECT id, user_id, url, position FROM user_photos WHERE user_id = ANY($1::uuid[]) ORDER BY position ASC',
            [userIds]
        );

        // Agrupar las fotos por user_id
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

        // Combinar users con sus fotos
        const usersWithPhotos = users.map(user => ({
            ...user,
            photos: photosByUser[user.id] || []
        }));

        res.json(usersWithPhotos);
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