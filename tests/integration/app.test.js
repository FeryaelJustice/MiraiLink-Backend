import request from 'supertest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

    it('trusts only a local reverse proxy by default', async () => {
        const { createApp } = await import('../../src/app.js');

        const app = createApp();

        expect(app.get('trust proxy')).toBe('loopback');
    });

    it('serves profile uploads from the configured profile root', async () => {
        const { createApp } = await import('../../src/app.js');
        const uploadRoot = await mkdtemp(join(tmpdir(), 'mirailink-profile-upload-'));
        try {
            await writeFile(join(uploadRoot, 'photo.jpg'), 'image');
            const app = createApp({ uploadRoot, enableRateLimits: false });

            const response = await request(app).get('/assets/img/profiles/photo.jpg');

            expect(response.status).toBe(200);
            expect(response.body.toString()).toBe('image');
        } finally {
            await rm(uploadRoot, { recursive: true, force: true });
        }
    });
});
