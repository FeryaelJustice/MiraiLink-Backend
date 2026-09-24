import { z } from 'zod';
import { uuid } from './common.schemas.js';

export const targetUserSchema = z.object({ toUserId: uuid });
export const matchIdsSchema = z.object({ matchIds: z.array(uuid).min(1).max(100) });
export const reportSchema = z.object({
    reportedUser: uuid,
    reason: z.string().trim().min(3).max(2000),
});
export const feedbackSchema = z.object({ feedback: z.string().trim().min(1).max(10_000) });
