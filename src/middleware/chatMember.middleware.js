import defaultDb from '../models/db.js';

export function requireChatMember({ db = defaultDb } = {}) {
    return async (req, res, next) => {
        try {
            const result = await db.query(
                `SELECT 1 FROM chat_members
                 WHERE chat_id = $1 AND user_id = $2
                 LIMIT 1`,
                [req.params.chatId, req.user.id],
            );
            if (result.rowCount === 0 || result.rows.length === 0) {
                return res.status(404).json({
                    code: 'CHAT_NOT_FOUND',
                    message: 'Chat not found',
                });
            }
            return next();
        } catch (error) {
            return next(error);
        }
    };
}
