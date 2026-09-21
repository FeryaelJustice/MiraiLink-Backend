import { z } from 'zod';

export const uuid = z.string().uuid();
export const shortText = z.string().trim().min(1).max(500);
export const pagination = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});
export const feedQuery = pagination.extend({
    scope: z.enum(['radius_residence', 'radius_active', 'country', 'world', 'specific_country']).optional(),
    radius_km: z.coerce.number().int().min(10).max(300).optional(),
    target_country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
    match_live_location: z.preprocess(
        value => value === 'true' ? true : value === 'false' ? false : value,
        z.boolean(),
    ).optional(),
});
export const chatIdParams = z.object({ chatId: uuid });
export const userIdParams = z.object({ userId: uuid });
