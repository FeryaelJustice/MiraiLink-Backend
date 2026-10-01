/**
 * Esquemas de entrada consumidos por validate() antes de los controllers.
 * Coerciones, defaults y campos omitidos afectan el contrato; no prueban autorización ni existencia en DB.
 */
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
