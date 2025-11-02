import { fcm } from '../config/firebaseAdmin.js';

/**
 * Obtiene el FCM token de un usuario. Aquí asumimos que lo guardas en la tabla users.
 * Campo recomendado: users.fcm_token
 */
export async function getUserFcmToken(userId) {
    const result = await db.query(
        'SELECT fcm_token, username, nickname FROM users WHERE id = $1',
        [userId]
    );
    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    return {
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
        await fcm.messaging().send(message);
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