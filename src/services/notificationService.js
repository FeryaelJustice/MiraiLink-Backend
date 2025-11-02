import { fcm } from '../config/firebaseAdmin.js';
import db from '../models/db.js';

/**
 * Obtiene el FCM token de un usuario.
 */
export async function getUserFcmToken(userId) {
    // Usamos LEFT JOIN para vincular la tabla users con push_tokens.
    // Buscamos el token, y la información del usuario en una sola consulta.
    const result = await db.query(
        `
        SELECT
            t.token AS fcm_token,
            u.username,
            u.nickname
        FROM
            users u
        LEFT JOIN
            push_tokens t ON u.id = t.user_id
        WHERE
            u.id = $1
        `,
        [userId]
    );

    // Si el usuario no existe, o si existe pero no tiene token, rowCount será 0.
    if (result.rowCount === 0) return null;

    const row = result.rows[0];

    // Si row.fcm_token es NULL (porque el LEFT JOIN no encontró token), devolvemos null
    if (!row.fcm_token) {
        return null;
    }

    return {
        // Renombramos t.token a 'token' en el resultado final
        token: row.fcm_token,
        username: row.username,
        nickname: row.nickname,
    };
}

/**
 * Envía una notificación push "genérica"
 */
export async function sendPushToToken(token, { title, body, data = {} }) {
    if (!token) return;

    const message = {
        token,
        notification: {
            title,
            body,
        },
        data: {
            // siempre string
            ...Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
            ),
        },
        android: {
            priority: 'high',
        },
    };

    try {
        await fcm.send(message);
    } catch (err) {
        console.error('Error enviando notificación FCM:', err?.message);
    }
}

/**
 * Notificación específica de "nuevo mensaje de chat"
 */
export async function sendChatMessageNotification({
    toUserId,
    fromUserId,
    chatId,
    text,
}) {
    // 1. obtener token del destinatario
    const dest = await getUserFcmToken(toUserId);
    if (!dest?.token) return;

    // 2. obtener nombre del remitente (puedes pasarlo desde fuera si quieres)
    const sender = await getUserFcmToken(fromUserId); // lo usamos solo para nombre
    const senderName = sender?.nickname || sender?.username || 'Nuevo mensaje';

    // 3. construir título/cuerpo
    const title = `Mensaje de ${senderName}`;
    // si el texto es largo, lo recortas
    const body = text.length > 60 ? text.slice(0, 57) + '…' : text;

    // 4. mandar
    await sendPushToToken(dest.token, {
        title,
        body,
        data: {
            type: 'chat_message',
            chatId,
            fromUserId,
            // esto es útil en Android para abrir directamente el chat
        },
    });
}