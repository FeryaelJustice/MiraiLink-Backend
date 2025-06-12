import db from '../models/db.js';

export const getMatches = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const baseResult = await db.query(
            `SELECT u.* FROM matches m
            JOIN users u ON (
                (u.id = m.user1_id AND m.user2_id = $1)
                OR
                (u.id = m.user2_id AND m.user1_id = $1)
            )
            WHERE u.id != $1 AND u.is_deleted = false`,
            [userId]
        );

        const users = await Promise.all(
            baseResult.rows.map(async (user) => {
                const [photosRes, animesRes, gamesRes] = await Promise.all([
                    db.query(`SELECT * FROM user_photos WHERE user_id = $1 ORDER BY position ASC`, [user.id]),
                    db.query(`SELECT a.id, a.name, a.image_url FROM user_anime_interests uai JOIN animes a ON uai.anime_id = a.id WHERE uai.user_id = $1`, [user.id]),
                    db.query(`SELECT g.id, g.name, g.image_url FROM user_game_interests ugi JOIN games g ON ugi.game_id = g.id WHERE ugi.user_id = $1`, [user.id]),
                ]);

                return {
                    ...user,
                    photos: photosRes.rows,
                    animes: animesRes.rows,
                    games: gamesRes.rows,
                };
            })
        );
        res.json(users);
    } catch (err) {
        next(err);
    }
};

export const getUnseenMatches = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
        SELECT id, user1_id, user2_id
        FROM matches
        WHERE
        (user1_id = $1 AND seen_by_user1 = false)
        OR
        (user2_id = $1 AND seen_by_user2 = false)
        `, [userId]);

        res.json(result.rows);
    } catch (err) {
        next(err);
    }
};

export const markMatchesSeen = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { matchIds } = req.body; // lista de match IDs

        for (const matchId of matchIds) {
            await db.query(`
            UPDATE matches SET
            seen_by_user1 = CASE WHEN user1_id = $1 THEN true ELSE seen_by_user1 END,
            seen_by_user2 = CASE WHEN user2_id = $1 THEN true ELSE seen_by_user2 END
            WHERE id = $2
        `, [userId, matchId]);
        }

        res.status(200).json({ message: 'Marked as seen' });
    } catch (err) {
        next(err);
    }
};
