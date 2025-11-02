// src/controllers/messageController.js
import db from '../models/db.js';
import { sendNewChatMessageNotification } from '../services/notificationService.js';

export const createMessage = async (req, res, next) => {
    const senderId = req.user.id;                 // viene del middleware auth
    const { conversationId, content } = req.body; // content = texto del mensaje

    try {
        // 1. Guardar mensaje en BBDD
        const insertMsg = await db.query(
            `
            INSERT INTO messages (conversation_id, sender_id, content)
            VALUES ($1, $2, $3)
            RETURNING id, conversation_id, sender_id, content, created_at
            `,
            [conversationId, senderId, content]
        );

        const message = insertMsg.rows[0];

        // 2. Obtener participantes de la conversación (excepto el emisor)
        const participantsRes = await db.query(
            `
            SELECT user_id
            FROM conversation_participants
            WHERE conversation_id = $1
                AND user_id <> $2
            `,
            [conversationId, senderId]
        );

        const receiverIds = participantsRes.rows.map(r => r.user_id);
        if (!receiverIds.length) {
            return res.status(201).json({ message: 'Mensaje enviado', data: message });
        }

        // 3. Obtener tokens de esos usuarios
        const devicesRes = await db.query(
            `
            SELECT user_id, fcm_token
            FROM user_devices
            WHERE user_id = ANY($1) AND is_active = TRUE
            `,
            [receiverIds]
        );

        const tokens = devicesRes.rows.map(r => r.fcm_token).filter(Boolean);

        // 4. (Opcional PRO) Calcular no leídos totales del receptor
        // Aquí lo simplifico: 1 nuevo
        const totalUnread = 1;

        // 5. Mandar push
        if (tokens.length) {
            await sendNewChatMessageNotification({
                tokens,
                senderName: req.user.username || req.user.email || 'Nuevo mensaje',
                preview: content?.slice(0, 80),
                conversationId,
                totalUnread,
            });
        }

        // 6. Responder al cliente
        res.status(201).json({
            message: 'Mensaje enviado',
            data: message,
        });
    } catch (err) {
        next(err);
    }
};
