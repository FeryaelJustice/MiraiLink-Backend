import db from '../models/db.js';
import { PUBLIC_USER_SQL_COLUMNS, toPublicUsers } from '../dto/user.dto.js';
import { localizedInterestSql, resolveCatalogLanguage, toLocalizedCatalogItem } from '../utils/catalogLocalization.js';

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
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const enriched = await Promise.all(users.map(async user => {
            const [photos, animes, games] = await Promise.all([
                db.query('SELECT id, user_id, url, position FROM user_photos WHERE user_id = $1 ORDER BY position', [user.id]),
                db.query(localizedInterestSql('anime', 'i.user_id = $1', 2), [user.id, locale]),
                db.query(localizedInterestSql('game', 'i.user_id = $1', 2), [user.id, locale]),
            ]);
            return { ...user, photos: photos.rows, animes: animes.rows.map(row => toLocalizedCatalogItem(row, req)), games: games.rows.map(row => toLocalizedCatalogItem(row, req)) };
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
