import { z } from 'zod';
import { uuid } from './common.schemas.js';

export const profileByIdSchema = z.object({ id: uuid });
export const fcmSchema = z.object({
    fcm: z.string().trim().min(20).max(4096),
    platform: z.enum(['android', 'ios', 'web']).default('android'),
});
export const photoPositionParams = z.object({ position: z.coerce.number().int().min(1).max(4) });
export const photoIdParams = z.object({ photoId: uuid });
export const photoQuerySchema = z.object({ userId: uuid.optional() });
export const profileByUsernameParams = z.object({
    username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/),
});
