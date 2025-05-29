import express from 'express';
import {
    getChatsFromUser,
    getMessages,
    createPrivateChat,
    createGroupChat,
    getChatMembers,
    markMessagesRead,
    sendMessage,
    getChatHistory
} from '../controllers/chat.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Chat related routes
router.get('/', authenticateToken(), getChatsFromUser);
router.get('/:chatId/messages', authenticateToken(), getMessages);
router.get('/:chatId/members', authenticateToken(), getChatMembers);
router.post('/private', authenticateToken(), createPrivateChat);
router.post('/group', authenticateToken(), createGroupChat);
router.post('/:chatId/mark-read', authenticateToken(), markMessagesRead);

// Routes for sending messages and getting chat history from a chat
router.post('/send', authenticateToken(), sendMessage);
router.get('/history/:userId', authenticateToken(), getChatHistory);

export default router;
