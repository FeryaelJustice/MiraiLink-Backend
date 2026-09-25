import { describe, expect, it } from 'vitest';
import {
    categoryFeedQuery,
    categoryParamsSchema,
    updateCategorySettingsSchema,
} from '../../../src/validation/explore.schemas.js';

describe('explore.schemas validation', () => {
    const validUuid = '11111111-2222-3333-4444-555555555555';

    describe('categoryParamsSchema', () => {
        it('accepts valid categoryId UUID', () => {
            const result = categoryParamsSchema.safeParse({ categoryId: validUuid });
            expect(result.success).toBe(true);
        });

        it('rejects invalid categoryId', () => {
            const result = categoryParamsSchema.safeParse({ categoryId: 'invalid-uuid' });
            expect(result.success).toBe(false);
        });
    });

    describe('updateCategorySettingsSchema', () => {
        it('accepts valid radius within 10 to 500 km', () => {
            const result = updateCategorySettingsSchema.safeParse({ radius_km: 100 });
            expect(result.success).toBe(true);
            expect(result.data.radius_km).toBe(100);
        });

        it('coerces string radius to number', () => {
            const result = updateCategorySettingsSchema.safeParse({ radius_km: '40' });
            expect(result.success).toBe(true);
            expect(result.data.radius_km).toBe(40);
        });

        it('rejects radius less than 10 km', () => {
            const result = updateCategorySettingsSchema.safeParse({ radius_km: 5 });
            expect(result.success).toBe(false);
        });

        it('rejects radius greater than 500 km', () => {
            const result = updateCategorySettingsSchema.safeParse({ radius_km: 600 });
            expect(result.success).toBe(false);
        });
    });

    describe('categoryFeedQuery', () => {
        it('accepts valid pagination and optional radius', () => {
            const result = categoryFeedQuery.safeParse({ limit: '10', offset: '20', radius_km: '80' });
            expect(result.success).toBe(true);
            expect(result.data).toEqual({
                limit: 10,
                offset: 20,
                radius_km: 80,
            });
        });

        it('uses defaults when query parameters are omitted', () => {
            const result = categoryFeedQuery.safeParse({});
            expect(result.success).toBe(true);
            expect(result.data.limit).toBe(20);
            expect(result.data.offset).toBe(0);
            expect(result.data.radius_km).toBeUndefined();
        });
    });
});
