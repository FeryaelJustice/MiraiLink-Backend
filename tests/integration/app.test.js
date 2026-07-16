import request from 'supertest';
import { describe, expect, it } from 'vitest';

describe('createApp', () => {
    it('can be imported without starting providers or opening a port', async () => {
        const module = await import('../../src/app.js');

        expect(module.createApp).toBeTypeOf('function');
    });

    it('returns normalized JSON for unknown routes', async () => {
        const { createApp } = await import('../../src/app.js');
        const app = createApp({ enableRateLimits: false });

        const response = await request(app).get('/missing');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({
            code: 'NOT_FOUND',
            message: 'Resource not found',
        });
    });
});
