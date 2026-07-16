import express from 'express';
import {
    createGroupChat,
    createPrivateChat,
    getChatHistory,
    getChatMembers,
    getChatsFromUser,
    getMessages,
    markChatAsRead,
    sendMessage,
} from '../controllers/chat.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireChatMember } from '../middleware/chatMember.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { chatIdParams, userIdParams } from '../validation/common.schemas.js';
import {
    groupChatSchema,
    messagesQuerySchema,
    privateChatSchema,
    sendMessageSchema,
} from '../validation/chat.schemas.js';

const router = express.Router();
const memberOnly = requireChatMember();

router.use(authenticateToken());
router.get('/', getChatsFromUser);
router.get('/:chatId/messages', validate({ params: chatIdParams, query: messagesQuerySchema }), memberOnly, getMessages);
router.get('/:chatId/members', validate({ params: chatIdParams }), memberOnly, getChatMembers);
router.patch('/:chatId/read', validate({ params: chatIdParams }), memberOnly, markChatAsRead);
router.post('/private', validate({ body: privateChatSchema }), createPrivateChat);
router.post('/group', validate({ body: groupChatSchema }), createGroupChat);
router.post('/send', validate({ body: sendMessageSchema }), sendMessage);
router.get('/history/:userId', validate({ params: userIdParams }), getChatHistory);

export default router;
