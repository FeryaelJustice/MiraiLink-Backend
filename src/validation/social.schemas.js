import { z } from 'zod';
import { uuid } from './common.schemas.js';

// Some existing PostgreSQL seed rows use UUID-shaped IDs with a non-RFC
// variant nibble. Keep swipe compatibility scoped to this legacy field.
const swipeTargetUserId = z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid UUID',
);

export const targetUserSchema = z.object({ toUserId: swipeTargetUserId });
export const matchIdsSchema = z.object({ matchIds: z.array(uuid).min(1).max(100) });
export const reportSchema = z.object({
    reportedUser: uuid,
    reason: z.string().trim().min(3).max(2000),
});
export const feedbackSchema = z.object({ feedback: z.string().trim().min(1).max(10_000) });
