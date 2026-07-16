import { z } from 'zod';
import { uuid } from './common.schemas.js';

export const messagesQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    before: z.coerce.date().optional(),
});
export const privateChatSchema = z.object({ otherUserId: uuid });
export const groupChatSchema = z.object({
    name: z.string().trim().min(1).max(100),
    userIds: z.array(uuid).min(1).max(99),
});
export const sendMessageSchema = z.object({
    toUserId: uuid,
    text: z.string().trim().min(1).max(4000),
});
