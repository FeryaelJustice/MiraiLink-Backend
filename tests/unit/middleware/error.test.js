import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../src/errors/AppError.js';
import { errorHandler } from '../../../src/middleware/error.middleware.js';

function responseDouble() {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
}

describe('errorHandler', () => {
    it('serializes operational errors without leaking internals', () => {
        const res = responseDouble();
        errorHandler(new AppError({
            status: 409,
            code: 'CONFLICT',
            message: 'Already exists',
            details: [{ field: 'body.email' }],
        }), { id: 'req-1' }, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            code: 'CONFLICT',
            message: 'Already exists',
            requestId: 'req-1',
            details: [{ field: 'body.email' }],
        });
    });

    it('returns a generic response for unknown errors', () => {
        const res = responseDouble();
        const error = new Error('database password leaked');

        errorHandler(error, { id: 'req-2' }, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            requestId: 'req-2',
        });
    });
});
