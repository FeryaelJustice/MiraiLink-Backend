import { getFcm } from '../config/firebaseAdmin.js';
import db from '../models/db.js';

export async function getUserFcmToken(userId) {
    const result = await db.query(
        `
        SELECT
            t.token AS fcm_token,
            u.username,
            u.nickname
        FROM users u
        LEFT JOIN push_tokens t ON u.id = t.user_id
        WHERE u.id = $1
        `,
        [userId],
    );

    if (result.rowCount === 0 || !result.rows[0].fcm_token) return null;

    return {
        token: result.rows[0].fcm_token,
        username: result.rows[0].username,
        nickname: result.rows[0].nickname,
    };
}

export async function sendPushToToken(token, { title, body, data = {} }) {
    if (!token) return;

    const message = {
        token,
        notification: { title, body },
        data: Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, String(value)]),
        ),
        android: { priority: 'high' },
    };

    try {
        const fcm = await getFcm();
        await fcm.send(message);
    } catch (error) {
        console.error('Error sending FCM notification:', error?.message);
    }
}

export async function sendChatMessageNotification({
    toUserId,
    fromUserId,
    chatId,
    text,
}) {
    const destination = await getUserFcmToken(toUserId);
    if (!destination?.token) return;

    const senderResult = await db.query(
        'SELECT username, nickname FROM users WHERE id = $1 AND is_deleted = false',
        [fromUserId],
    );
    const sender = senderResult.rows[0];
    const senderName = sender?.nickname || sender?.username || 'Nuevo mensaje';
    const body = text.length > 60 ? `${text.slice(0, 57)}...` : text;

    await sendPushToToken(destination.token, {
        title: `Mensaje de ${senderName}`,
        body,
        data: {
            type: 'chat_message',
            chatId,
            fromUserId,
        },
    });
}
