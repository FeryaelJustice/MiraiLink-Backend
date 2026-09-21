import db from '../models/db.js';
import { sendChatMessageNotification } from '../services/notificationService.js';

async function withTransaction(work) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export const getChatsFromUser = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT c.id AS chat_id, c.type, c.name, c.created_by, c.created_at,
                    cm.joined_at, cm.role, m.id AS last_message_id,
                    m.text AS last_message_text, m.sender_id AS last_message_sender_id,
                    m.sent_at AS last_message_sent_at,
                    CASE WHEN c.type = 'private' THEN json_build_object(
                        'id', other_user.id,
                        'username', other_user.username,
                        'nickname', other_user.nickname,
                        'avatarUrl', other_user.avatar_url
                    ) ELSE NULL END AS destinatary,
                    (SELECT COUNT(*) FROM messages unread
                     WHERE unread.chat_id = c.id AND unread.sender_id != $1
                       AND unread.sent_at > cm.last_read_at) AS unread_count
             FROM chat_members cm JOIN chats c ON c.id = cm.chat_id
             LEFT JOIN LATERAL (
                SELECT u.id, u.username, u.nickname, photo.url AS avatar_url
                FROM chat_members other_member
                JOIN users u ON u.id = other_member.user_id AND u.is_deleted = FALSE
                LEFT JOIN LATERAL (
                    SELECT url FROM user_photos
                    WHERE user_id = u.id
                    ORDER BY position ASC
                    LIMIT 1
                ) photo ON TRUE
                WHERE other_member.chat_id = c.id AND other_member.user_id != $1
                LIMIT 1
             ) other_user ON c.type = 'private'
             LEFT JOIN LATERAL (
                 SELECT id, text, sender_id, sent_at FROM messages
                 WHERE chat_id = c.id ORDER BY sent_at DESC LIMIT 1
             ) m ON TRUE WHERE cm.user_id = $1 ORDER BY COALESCE(m.sent_at, c.created_at) DESC`,
            [req.user.id],
        );
        return res.json(result.rows);
    } catch (error) {
        return next(error);
    }
};

export const getMessages = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const { limit, before } = req.query;
        const result = before
            ? await db.query(
                `SELECT id, chat_id, sender_id, text, sent_at, is_read
                 FROM messages WHERE chat_id = $1 AND sent_at < $2
                 ORDER BY sent_at DESC LIMIT $3`,
                [chatId, before, limit],
            )
            : await db.query(
                `SELECT id, chat_id, sender_id, text, sent_at, is_read
                 FROM messages WHERE chat_id = $1 ORDER BY sent_at DESC LIMIT $2`,
                [chatId, limit],
            );
        return res.json(result.rows.reverse());
    } catch (error) {
        return next(error);
    }
};

export const createPrivateChat = async (req, res, next) => {
    try {
        if (req.user.id === req.body.otherUserId) {
            return res.status(400).json({ code: 'SELF_CHAT', message: 'Cannot create a chat with yourself' });
        }
        const chatId = await withTransaction(async client => {
            await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [[req.user.id, req.body.otherUserId].sort().join(':')]);
            const existing = await client.query(
                `SELECT c.id FROM chats c
                 JOIN chat_members a ON a.chat_id = c.id AND a.user_id = $1
                 JOIN chat_members b ON b.chat_id = c.id AND b.user_id = $2
                 WHERE c.type = 'private' LIMIT 1`,
                [req.user.id, req.body.otherUserId],
            );
            if (existing.rows[0]) return existing.rows[0].id;
            const target = await client.query('SELECT 1 FROM users WHERE id = $1 AND is_deleted = FALSE', [req.body.otherUserId]);
            if (target.rowCount === 0) throw Object.assign(new Error('User not found'), { status: 404 });
            const created = await client.query("INSERT INTO chats (type, created_by) VALUES ('private', $1) RETURNING id", [req.user.id]);
            await client.query("INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'admin'), ($1, $3, 'member')", [created.rows[0].id, req.user.id, req.body.otherUserId]);
            return created.rows[0].id;
        });
        return res.status(201).json({ chatId, message: 'Private chat ready' });
    } catch (error) {
        if (error.status === 404) return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        return next(error);
    }
};

export const createGroupChat = async (req, res, next) => {
    try {
        const uniqueUserIds = [...new Set(req.body.userIds)].filter(id => id !== req.user.id);
        const chatId = await withTransaction(async client => {
            const created = await client.query("INSERT INTO chats (type, name, created_by) VALUES ('group', $1, $2) RETURNING id", [req.body.name, req.user.id]);
            await client.query("INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'admin')", [created.rows[0].id, req.user.id]);
            for (const userId of uniqueUserIds) {
                await client.query("INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, 'member')", [created.rows[0].id, userId]);
            }
            return created.rows[0].id;
        });
        return res.status(201).json({ chatId, message: 'Group created' });
    } catch (error) {
        return next(error);
    }
};

export const getChatMembers = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT u.id, u.nickname, cm.role
             FROM chat_members cm JOIN users u ON u.id = cm.user_id
             WHERE cm.chat_id = $1 AND u.is_deleted = FALSE`,
            [req.params.chatId],
        );
        return res.json(result.rows);
    } catch (error) {
        return next(error);
    }
};

export const markChatAsRead = async (req, res, next) => {
    try {
        await db.query('UPDATE chat_members SET last_read_at = NOW() WHERE user_id = $1 AND chat_id = $2', [req.user.id, req.params.chatId]);
        return res.json({ success: true });
    } catch (error) {
        return next(error);
    }
};

export const sendMessage = async (req, res, next) => {
    try {
        if (req.user.id === req.body.toUserId) {
            return res.status(400).json({ code: 'SELF_CHAT', message: 'Cannot message yourself' });
        }
        const chatId = await withTransaction(async client => {
            await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [[req.user.id, req.body.toUserId].sort().join(':')]);
            const existing = await client.query(
                `SELECT c.id FROM chats c
                 JOIN chat_members a ON a.chat_id = c.id AND a.user_id = $1
                 JOIN chat_members b ON b.chat_id = c.id AND b.user_id = $2
                 WHERE c.type = 'private' LIMIT 1`,
                [req.user.id, req.body.toUserId],
            );
            let id = existing.rows[0]?.id;
            if (!id) {
                const created = await client.query("INSERT INTO chats (type, created_by) VALUES ('private', $1) RETURNING id", [req.user.id]);
                id = created.rows[0].id;
                await client.query('INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)', [id, req.user.id, req.body.toUserId]);
            }
            await client.query('INSERT INTO messages (chat_id, sender_id, text) VALUES ($1, $2, $3)', [id, req.user.id, req.body.text]);
            return id;
        });
        res.status(201).json({ message: 'Message sent', chatId });
        void sendChatMessageNotification({
            toUserId: req.body.toUserId,
            fromUserId: req.user.id,
            chatId,
            text: req.body.text,
        }).catch(error => console.error('Notification failed:', error.message));
    } catch (error) {
        return next(error);
    }
};

export const getChatHistory = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT m.id, m.text AS content, m.sent_at AS timestamp,
                    s.id AS sender_id,
                    s.nickname AS sender_nickname, s.gender AS sender_gender,
                    s.birthdate AS sender_birthdate,
                    r.id AS receiver_id,
                    r.nickname AS receiver_nickname, r.gender AS receiver_gender,
                    r.birthdate AS receiver_birthdate
             FROM chats c
             JOIN chat_members self ON self.chat_id = c.id AND self.user_id = $1
             JOIN chat_members other ON other.chat_id = c.id AND other.user_id = $2
             JOIN messages m ON m.chat_id = c.id
             JOIN users s ON s.id = m.sender_id AND s.is_deleted = FALSE
             JOIN users r ON r.id = CASE WHEN m.sender_id = $1 THEN $2::uuid ELSE $1::uuid END
             WHERE c.type = 'private' ORDER BY m.sent_at ASC`,
            [req.user.id, req.params.userId],
        );
        return res.json(result.rows.map(row => ({
            id: row.id,
            content: row.content,
            timestamp: new Date(row.timestamp).getTime(),
            sender: { id: row.sender_id, nickname: row.sender_nickname, gender: row.sender_gender, birthdate: row.sender_birthdate },
            receiver: { id: row.receiver_id, nickname: row.receiver_nickname, gender: row.receiver_gender, birthdate: row.receiver_birthdate },
        })));
    } catch (error) {
        return next(error);
    }
};
