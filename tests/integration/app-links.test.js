import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { appLinksConfig, PLAY_FINGERPRINT, securityLink } from '../../src/config/appLinks.js';

afterEach(() => { delete process.env.APP_BASE_URL; delete process.env.ANDROID_APP_SHA256_FINGERPRINTS; });
describe('public Android App Links', () => {
    it('publishes the actual Play certificate without redirects or authentication', async () => {
        const res = await request(createApp({ enableRateLimits: false })).get('/.well-known/assetlinks.json');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('application/json');
        expect(res.body[0].target.sha256_cert_fingerprints).toEqual([PLAY_FINGERPRINT]);
        expect(res.body[0].target.package_name).toBe('com.feryaeljustice.mirailink');
    });
    it.each(['/verify', '/verification', '/reset-password', '/recover_password', '/recover-password'])('serves safe fallback %s', async path => {
        const res = await request(createApp()).get(path).query({ token: '123456' });
        expect(res.status).toBe(200);
        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.headers['referrer-policy']).toBe('no-referrer');
        expect(res.text).toContain('mirailink://');
        expect(res.text).toContain('play.google.com');
        expect(res.text).not.toContain('<script');
    });
    it.each(['token=a&token=b', 'token[x]=a', 'redirect=https://evil.test', 'userId=a&user_id=b'])('rejects ambiguous/unexpected query %s', async query => {
        expect((await request(createApp()).get('/verify?' + query)).status).toBe(400);
    });
    it('encodes email and escapes query separators in fallback', async () => {
        const res = await request(createApp()).get('/reset-password').query({ token: '123456', email: 'a+b@example.com' });
        expect(res.text).toContain('token=123456&amp;email=a%2Bb%40example.com');
    });
    it('validates origin and fingerprint configuration', () => {
        expect(() => appLinksConfig({ APP_BASE_URL: 'http://example.com' })).toThrow();
        expect(() => appLinksConfig({ ANDROID_APP_SHA256_FINGERPRINTS: 'fake' })).toThrow();
        expect(securityLink('/verify', { token: 'a+b', userId: 'u' })).toBe('https://mirailink-backend.onrender.com/verify?token=a%2Bb&userId=u');
    });
});
