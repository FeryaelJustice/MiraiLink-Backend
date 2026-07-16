import { z } from 'zod';

export const uuid = z.string().uuid();
export const shortText = z.string().trim().min(1).max(500);
export const pagination = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});
export const chatIdParams = z.object({ chatId: uuid });
export const userIdParams = z.object({ userId: uuid });
