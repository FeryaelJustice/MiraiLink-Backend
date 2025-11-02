import db from '../models/db.js';
import { v4 as uuidv4 } from 'uuid';
import { sendChatMessageNotification } from '../services/notificationService.js';

export const getChatsFromUser = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const chatsQuery = `
        SELECT
            c.id AS chat_id,
            c.type,
            c.name,
            c.created_by,
            c.created_at,
            cm.joined_at,
            cm.role,
            m.id AS last_message_id,
            m.text AS last_message_text,
            m.sender_id AS last_message_sender_id,
            m.sent_at AS last_message_sent_at,
            (
                SELECT COUNT(*) FROM messages m2
                WHERE m2.chat_id = c.id
                    AND m2.sender_id != $1
                    AND m2.sent_at > cm.last_read_at
            ) AS unread_count
        FROM chat_members cm
        JOIN chats c ON cm.chat_id = c.id
        LEFT JOIN LATERAL (
            SELECT * FROM messages
            WHERE messages.chat_id = c.id
            ORDER BY messages.sent_at DESC
            LIMIT 1
        ) m ON true
        WHERE cm.user_id = $1;
        `;
        const chatResult = await db.query(chatsQuery, [userId]);
        const chatSummaries = chatResult.rows;

        // Extraer solo los IDs de los chats privados
        const privateChatIds = chatSummaries
            .filter(chat => chat.type === 'private')
            .map(chat => chat.chat_id);

        let destinataryMap = {};
        if (privateChatIds.length > 0) {
            const placeholders = privateChatIds.map((_, i) => `$${i + 2}`).join(', ');
            const destinataryQuery = `
            SELECT cm.chat_id, u.id AS user_id, u.username, u.nickname, p.url AS avatar_url
            FROM chat_members cm
            JOIN users u ON u.id = cm.user_id AND u.is_deleted = false
            LEFT JOIN LATERAL (
                SELECT url
                FROM user_photos
                WHERE user_id = u.id AND position = 1
                ORDER BY id
                LIMIT 1
            ) p ON true
            WHERE cm.chat_id IN (${placeholders}) AND cm.user_id != $1;
            `;
            const values = [userId, ...privateChatIds];
            const destinataryResult = await db.query(destinataryQuery, values);

            // Agrupar por chat_id
            destinataryMap = Object.fromEntries(
                destinataryResult.rows.map(row => [
                    row.chat_id,
                    {
                        id: row.user_id,
                        username: row.username,
                        nickname: row.nickname,
                        avatarUrl: row.avatar_url
                    }
                ])
            );
        }

        const fullResult = chatSummaries.map(chat => ({
            ...chat,
            destinatary: destinataryMap[chat.chat_id] || null
        })).filter(chat => destinataryMap[chat.chat_id]);

        res.status(200).json(fullResult);
    } catch (error) {
        next(error);
    }
}

export const getMessages = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const { limit = 50, before } = req.query;

        const result = await db.query(`
            SELECT * FROM messages
            WHERE chat_id = $1 ${before ? 'AND created_at < $2' : ''}
            ORDER BY created_at DESC
            LIMIT $3
        `, before ? [chatId, before, limit] : [chatId, limit]);

        res.status(200).json(result.rows.reverse()); // del más antiguo al más nuevo
    } catch (err) {
        next(err);
    }
};

export const createPrivateChat = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { otherUserId } = req.body;

        if (userId === otherUserId) {
            return res.status(400).json({ message: 'No puedes chatear contigo mismo' });
        }

        // Verificar si ya existe un chat privado entre ambos
        const existing = await db.query(`
        SELECT c.id FROM chats c
        JOIN chat_members cm ON c.id = cm.chat_id
        WHERE c.type = 'private'
        AND cm.user_id = ANY($1::uuid[])
        GROUP BY c.id
        HAVING COUNT(*) = 2
        `, [[userId, otherUserId]]);

        if (existing.rows.length > 0) {
            return res.status(400).json({ chatId: existing.rows[0].id, message: 'Chat ya existente' });
        }

        if (!userId || !otherUserId) {
            return res.status(400).json({ message: 'Faltan IDs de usuario' });
        }

        // Crear nuevo chat
        const result = await db.query(`
            INSERT INTO chats (type, created_by)
            VALUES ('private', $1)
            RETURNING id
        `, [userId]);

        const chatId = result.rows[0].id;

        // Insertar ambos usuarios como miembros
        await db.query(`
            INSERT INTO chat_members (chat_id, user_id, role)
            VALUES
            ($1, $2, 'admin'),
            ($1, $3, 'member')
        `, [chatId, userId, otherUserId]);

        res.status(201).json({ chatId, message: 'Chat privado creado' });
    } catch (err) {
        next(err);
    }
};

export const createGroupChat = async (req, res, next) => {
    try {
        const { name, userIds } = req.body;
        const createdBy = req.user.id;

        const totalMembers = [...userIds, createdBy].sort(); // todos los miembros

        // Buscar si ya existe un grupo con mismo nombre y mismos usuarios
        const existing = await db.query(`
            SELECT c.id FROM chats c
            WHERE c.type = 'group' AND c.name = $1
        `, [name]);

        for (const row of existing.rows) {
            const membersRes = await db.query(`
                SELECT user_id FROM chat_members
                WHERE chat_id = $1
                ORDER BY user_id
            `, [row.id]);

            const existingMembers = membersRes.rows.map(r => r.user_id).sort();

            if (JSON.stringify(existingMembers) === JSON.stringify(totalMembers)) {
                return res.status(200).json({ chatId: row.id, message: 'Grupo ya existente' });
            }
        }

        // Si no existe, crearlo
        const result = await db.query(`
            INSERT INTO chats (type, name, created_by)
            VALUES ('group', $1, $2)
            RETURNING id
        `, [name, createdBy]);

        const chatId = result.rows[0].id;

        await db.query(`
            INSERT INTO chat_members (chat_id, user_id, role)
            VALUES ($1, $2, 'admin')`, [chatId, createdBy]);

        for (const uid of userIds) {
            await db.query(`
                INSERT INTO chat_members (chat_id, user_id)
                VALUES ($1, $2)`, [chatId, uid]);
        }

        res.status(201).json({ chatId, message: 'Grupo creado' });
    } catch (err) {
        next(err);
    }
};

export const getChatMembers = async (req, res, next) => {
    try {
        const { chatId } = req.params;

        const result = await db.query(`
            SELECT u.id, u.username, u.nickname, cm.role
            FROM chat_members cm
            JOIN users u ON u.id = cm.user_id
            WHERE cm.chat_id = $1
        `, [chatId]);

        res.status(200).json(result.rows);
    } catch (err) {
        next(err);
    }
};

export const markChatAsRead = async (req, res, next) => {
    const userId = req.user.id;
    const chatId = req.params.chatId;

    try {
        await db.query(
            `UPDATE chat_members SET last_read_at = now() WHERE user_id = $1 AND chat_id = $2`,
            [userId, chatId]
        );
        res.status(200).json({ success: true });
    } catch (err) {
        next(err);
    }
};

export const sendMessage = async (req, res, next) => {
    const userId = req.user.id;
    const { toUserId, text } = req.body;

    try {
        // Verifica si ya existe un chat privado entre ambos
        const chatCheckQuery = `
            SELECT c.id FROM chats c
            JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = $1
            JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = $2
            WHERE c.type = 'private';
        `;
        const existing = await db.query(chatCheckQuery, [userId, toUserId]);

        let chatId;
        if (existing.rows.length > 0) {
            chatId = existing.rows[0].id;
        } else {
            // Crear nuevo chat privado
            chatId = uuidv4();
            await db.query('INSERT INTO chats (id, type, created_by) VALUES ($1, $2, $3)', [chatId, 'private', userId]);
            await db.query('INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2), ($1, $3)', [chatId, userId, toUserId]);
        }

        // Guardar mensaje
        await db.query(
            'INSERT INTO messages (chat_id, sender_id, text) VALUES ($1, $2, $3)',
            [chatId, userId, text]
        );

        // Responder al cliente RÁPIDO
        res.status(201).json({ message: 'Mensaje enviado', chatId });

        // Lanzar notificación al destinatario
        // no await para no retrasar la respuesta
        sendChatMessageNotification({
            toUserId,
            fromUserId: userId,
            chatId,
            text,
        }).catch((err) =>
            console.error('Error enviando notificación de chat:', err?.message)
        );
    } catch (err) {
        next(err);
    }
};

export const getChatHistory = async (req, res, next) => {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    try {
        const chatQuery = `
            SELECT c.id FROM chats c
            JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = $1
            JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = $2
            WHERE c.type = 'private';
        `;
        const chatRes = await db.query(chatQuery, [userId, otherUserId]);
        if (chatRes.rows.length === 0) {
            return res.status(200).json([]);
        }

        const chatId = chatRes.rows[0].id;

        const messagesQuery = `
        SELECT
            m.id,
            m.text AS content,
            m.sent_at AS timestamp,

            -- Sender
            s.id AS sender_id,
            s.username AS sender_username,
            s.nickname AS sender_nickname,
            s.email AS sender_email,
            s.gender AS sender_gender,
            s.birthdate AS sender_birthdate,
            p1.url AS sender_avatar_url,

            -- Receiver (computed as the other chat member)
            r.id AS receiver_id,
            r.username AS receiver_username,
            r.nickname AS receiver_nickname,
            r.email AS receiver_email,
            r.gender AS receiver_gender,
            r.birthdate AS receiver_birthdate,
            p2.url AS receiver_avatar_url

        FROM messages m

        JOIN users s ON s.id = m.sender_id AND s.is_deleted = false
        LEFT JOIN user_photos p1 ON p1.user_id = s.id AND p1.position = 1

        -- Subquery para obtener el receiver (el otro user_id del chat)
        JOIN LATERAL (
            SELECT u.*
            FROM chat_members cm
            JOIN users u ON u.id = cm.user_id AND u.is_deleted = false
            WHERE cm.chat_id = m.chat_id AND cm.user_id != m.sender_id
            LIMIT 1
        ) r ON true
        LEFT JOIN user_photos p2 ON p2.user_id = r.id AND p2.position = 1

        WHERE m.chat_id = $1
        ORDER BY m.sent_at ASC
        `;

        const { rows } = await db.query(messagesQuery, [chatId]);

        const formattedMessages = rows.map(row => ({
            id: row.id,
            content: row.content,
            timestamp: new Date(row.timestamp).getTime(),
            sender: formatUserDto({
                id: row.sender_id,
                username: row.sender_username,
                nickname: row.sender_nickname,
                email: row.sender_email,
                gender: row.sender_gender,
                birthdate: row.sender_birthdate,
                avatar_url: row.sender_avatar_url
            }),
            receiver: formatUserDto({
                id: row.receiver_id,
                username: row.receiver_username,
                nickname: row.receiver_nickname,
                email: row.receiver_email,
                gender: row.receiver_gender,
                birthdate: row.receiver_birthdate,
                avatar_url: row.receiver_avatar_url
            }),
        }));

        // const ids = formattedMessages.map(m => m.id);
        // const hasDuplicates = new Set(ids).size !== ids.length;
        // console.log("Duplicados?", hasDuplicates);

        res.status(200).json(formattedMessages);
    } catch (err) {
        next(err);
    }
};

function formatUserDto(user) {
    return {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        gender: user.gender,
        birthdate: user.birthdate,
        profile_photo: user.avatar_url || null
    };
}