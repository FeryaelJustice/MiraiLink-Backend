import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { validate } from '../../../src/middleware/validate.middleware.js';

describe('validate middleware', () => {
    it('replaces request input with normalized values', () => {
        const middleware = validate({
            query: z.object({
                limit: z.coerce.number().int().min(1).max(100),
            }),
        });
        const req = { query: { limit: '25' } };
        const next = vi.fn();

        middleware(req, {}, next);

        expect(req.query).toEqual({ limit: 25 });
        expect(next).toHaveBeenCalledWith();
    });

    it('passes a stable validation error to the error handler', () => {
        const middleware = validate({
            params: z.object({ id: z.uuid() }),
        });
        const req = { params: { id: 'not-a-uuid' } };
        const next = vi.fn();

        middleware(req, {}, next);

        const error = next.mock.calls[0][0];
        expect(error.status).toBe(400);
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toEqual([
            expect.objectContaining({ field: 'params.id' }),
        ]);
    });
});
