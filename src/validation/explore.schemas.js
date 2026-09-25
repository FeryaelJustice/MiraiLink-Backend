import { z } from 'zod';
import { pagination, uuid } from './common.schemas.js';

export const categoryParamsSchema = z.object({
    categoryId: uuid,
});

export const updateCategorySettingsSchema = z.object({
    radius_km: z.coerce.number().int().min(10).max(500),
});

export const categoryFeedQuery = pagination.extend({
    radius_km: z.coerce.number().int().min(10).max(500).optional(),
});
