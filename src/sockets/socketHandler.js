import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from '../models/db.js';

const connectedUsers = new Map();

export function setupSocketIO(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.ORIGIN,
            methods: ['GET', 'POST'],
            credentials: true,
        }
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Token requerido'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id;
            next();
        } catch (err) {
            next(new Error('Token inválido'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        connectedUsers.set(userId, socket);

        console.log(`Usuario conectado: ${userId}`);

        socket.on('send_message', async ({ matchId, text }) => {
            try {
                const sentAt = new Date();

                await db.query(
                    'INSERT INTO messages (match_id, sender_id, text, sent_at) VALUES ($1, $2, $3, $4)',
                    [matchId, userId, text, sentAt]
                );

                const result = await db.query(
                    'SELECT user1_id, user2_id FROM matches WHERE id = $1',
                    [matchId]
                );

                const match = result.rows[0];
                const recipientId = match.user1_id === userId ? match.user2_id : match.user1_id;
                const recipientSocket = connectedUsers.get(recipientId);

                if (recipientSocket) {
                    recipientSocket.emit('receive_message', {
                        from: userId,
                        text,
                        matchId,
                        sentAt
                    });
                }
            } catch (err) {
                console.error('Error enviando mensaje:', err);
            }
        });

        socket.on('disconnect', () => {
            connectedUsers.delete(userId);
            console.log(`Usuario desconectado: ${userId}`);
        });
    });
}
