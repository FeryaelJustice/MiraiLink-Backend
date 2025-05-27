import express from 'express';
import {
    getChatsFromUser,
    getMessages,
    createPrivateChat,
    createGroupChat,
    getChatMembers,
    markMessagesRead,
} from '../controllers/chat.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticateToken(), getChatsFromUser);
router.get('/:chatId/messages', authenticateToken(), getMessages);
router.get('/:chatId/members', authenticateToken(), getChatMembers);
router.post('/private', authenticateToken(), createPrivateChat);
router.post('/group', authenticateToken(), createGroupChat);
router.post('/:chatId/mark-read', authenticateToken(), markMessagesRead);

export default router;
