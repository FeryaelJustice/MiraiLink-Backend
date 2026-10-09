/**
 * Esquemas de entrada consumidos por validate() antes de los controllers.
 * Coerciones, defaults y campos omitidos afectan el contrato; no prueban autorización ni existencia en DB.
 */
import { z } from 'zod';
import { uuid } from './common.schemas.js';

export const targetUserSchema = z.object({ toUserId: uuid, discoveryMode: z.enum(['classic','capsule']).optional(), receivedLikeId: uuid.nullish() });
export const undoSwipeSchema = z.object({ targetUserId: uuid.optional() }).optional();
export const matchIdsSchema = z.object({ matchIds: z.array(uuid).min(1).max(100) });
export const reportSchema = z.object({
    reportedUser: uuid,
    reason: z.string().trim().min(3).max(2000),
});
export const feedbackSchema = z.object({ feedback: z.string().trim().min(1).max(10_000) });
