import request from 'supertest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import speakeasy from 'speakeasy';
const state = vi.hoisted(() => ({ pool: null, mails: [] }));
vi.mock('../../src/models/db.js', () => ({ default: {
    query: (...args) => state.pool.query(...args),
    connect: (...args) => state.pool.connect(...args),
} }));
vi.mock('../../src/utils/mailer.js', () => ({
    sendVerificationEmail: vi.fn(), sendPasswordResetEmail: vi.fn(),
    sendTwoFactorEmail: async (email, code, action) => { state.mails.push({ email, code, action }); return { success: true, simulated: true }; },
}));
const url = process.env.APPLINKS_TEST_DB_URL;
const suite = url ? describe : describe.skip;
suite('2FA with disposable PostgreSQL', () => {
    const userId = '00000000-0000-4000-8000-000000000001';
    const response = () => { const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res); return res; };
    let auth;
    beforeAll(async () => {
        const parsed = new URL(url);
        if (parsed.hostname !== '127.0.0.1' || parsed.pathname !== '/mirailink_app_links_test') throw Error('Only the isolated local test database is allowed');
        state.pool = new pg.Pool({ connectionString: url, max: 4 });
        await state.pool.query(`
            CREATE TABLE IF NOT EXISTS users(id UUID PRIMARY KEY, email TEXT, username TEXT, is_verified BOOLEAN DEFAULT TRUE, is_deleted BOOLEAN DEFAULT FALSE);
            CREATE TABLE IF NOT EXISTS user_2fa(user_id UUID PRIMARY KEY REFERENCES users(id), secret TEXT, enabled BOOLEAN DEFAULT FALSE);
            CREATE TABLE IF NOT EXISTS recovery_codes(id UUID DEFAULT gen_random_uuid(), user_id UUID REFERENCES users(id), code_hash TEXT, used BOOLEAN DEFAULT FALSE);
        `);
        const migration = readFileSync(new URL('../../src/database/migrations/023_two_factor_email_challenges.sql', import.meta.url), 'utf8');
        await state.pool.query(migration);
        await state.pool.query(migration);
        auth = await import('../../src/controllers/auth.controller.js');
    });
    afterAll(async () => { if (state.pool) await state.pool.end(); });
    beforeEach(async () => {
        state.mails.length = 0;
        await state.pool.query('TRUNCATE two_factor_email_challenges, recovery_codes, user_2fa, users');
        await state.pool.query("INSERT INTO users(id,email,username) VALUES ($1,'test@example.com','localtest')", [userId]);
    });
    async function call(handler, body = {}) {
        const res = response(), next = vi.fn();
        await handler({ user: { id: userId, username: 'localtest' }, body }, res, next);
        expect(next).not.toHaveBeenCalled();
        return res;
    }
    async function setup() {
        const res = await call(auth.setup2FA);
        return res.json.mock.calls[0][0].base32;
    }
    async function requestCode(action) {
        await call(auth.requestTwoFactorEmail, { action });
        return state.mails.at(-1).code;
    }
    const totp = secret => speakeasy.totp({ secret, encoding: 'base32' });
    it('enables with email plus authenticator, then disables with a separate email code', async () => {
        const secret = await setup();
        const code = await requestCode('enable');
        const enabled = await call(auth.verify2FA, { token: totp(secret), emailCode: code });
        expect(enabled.json).toHaveBeenCalledWith({ message: '2FA enabled' });
        expect((await state.pool.query('SELECT enabled FROM user_2fa')).rows[0].enabled).toBe(true);
        const disableCode = await requestCode('disable');
        const disabled = await call(auth.disable2FA, { emailCode: disableCode });
        expect(disabled.json).toHaveBeenCalledWith({ message: '2FA disabled' });
        expect((await state.pool.query('SELECT * FROM user_2fa')).rowCount).toBe(0);
        expect((await state.pool.query('SELECT * FROM recovery_codes')).rowCount).toBe(0);
    });
    it('persists failed attempts and locks the code after five tries', async () => {
        const secret = await setup();
        const code = await requestCode('enable');
        const wrong = code === '100000' ? '200000' : '100000';
        for (let i = 0; i < 5; i++) {
            expect((await call(auth.verify2FA, { token: totp(secret), emailCode: wrong })).status).toHaveBeenCalledWith(400);
        }
        expect((await state.pool.query('SELECT attempts FROM two_factor_email_challenges')).rows[0].attempts).toBe(5);
        expect((await call(auth.verify2FA, { token: totp(secret), emailCode: code })).status).toHaveBeenCalledWith(400);
        expect((await state.pool.query('SELECT enabled FROM user_2fa')).rows[0].enabled).toBe(false);
    });
    it('rejects expired codes and replaced hashes', async () => {
        const secret = await setup();
        await requestCode('enable');
        const oldHash = (await state.pool.query('SELECT token_hash FROM two_factor_email_challenges')).rows[0].token_hash;
        const latest = await requestCode('enable');
        expect((await state.pool.query('SELECT token_hash FROM two_factor_email_challenges')).rows[0].token_hash).not.toBe(oldHash);
        await state.pool.query("UPDATE two_factor_email_challenges SET expires_at = NOW() - INTERVAL '1 second'");
        expect((await call(auth.verify2FA, { token: totp(secret), emailCode: latest })).status).toHaveBeenCalledWith(400);
    });
    it('consumes a code only once under concurrent confirmations', async () => {
        const secret = await setup();
        const code = await requestCode('enable');
        const results = await Promise.all([
            call(auth.verify2FA, { token: totp(secret), emailCode: code }),
            call(auth.verify2FA, { token: totp(secret), emailCode: code }),
        ]);
        expect(results.filter(res => res.status.mock.calls.some(([status]) => status === 400))).toHaveLength(1);
        expect((await state.pool.query('SELECT * FROM two_factor_email_challenges')).rowCount).toBe(0);
    });
    it('cannot use a disable purpose code to activate 2FA', async () => {
        const secret = await setup();
        await requestCode('enable');
        await state.pool.query("UPDATE two_factor_email_challenges SET action = 'disable'");
        expect((await call(auth.verify2FA, { token: totp(secret), emailCode: state.mails[0].code })).status).toHaveBeenCalledWith(400);
    });
    it('runs the HTTP contracts with database and preserves authenticator login', async () => {
        await state.pool.query(`
            CREATE TABLE IF NOT EXISTS token_blacklist(token TEXT);
            CREATE TABLE IF NOT EXISTS user_subscriptions(user_id UUID, provider_verified BOOLEAN, product_id TEXT, status TEXT, expires_at TIMESTAMPTZ);
        `);
        const { createApp } = await import('../../src/app.js');
        const { createAccessToken, createTwoFactorChallenge } = await import('../../src/services/tokenService.js');
        const app = createApp({ uploadRoot: join(tmpdir(), 'mirailink-app-links-http'), enableRateLimits: false });
        const user = { id: userId, username: 'localtest' };
        const access = createAccessToken(user);
        const post = (path, body) => request(app).post('/api/auth/2fa/' + path).set('Authorization', 'Bearer ' + access).send(body);
        expect((await request(app).post('/api/auth/2fa/email/request').send({ action: 'enable' })).status).toBe(401);
        const setupResponse = await post('setup', {});
        expect(setupResponse.status).toBe(200);
        const secret = setupResponse.body.base32;
        expect((await post('verify', { token: totp(secret) })).status).toBe(400);
        expect((await post('email/request', { action: 'enable' })).status).toBe(200);
        expect((await post('verify', { token: totp(secret), emailCode: state.mails.at(-1).code })).status).toBe(200);
        expect((await post('setup', {})).status).toBe(409);
        const login = await request(app).post('/api/auth/2fa/loginVerifyLastStep').send({
            challengeToken: createTwoFactorChallenge(user), code: totp(secret),
        });
        expect(login.status).toBe(200);
        expect(login.body.token).toEqual(expect.any(String));
        expect((await post('disable', {})).status).toBe(400);
        expect((await post('email/request', { action: 'disable' })).status).toBe(200);
        expect((await post('disable', { emailCode: state.mails.at(-1).code })).status).toBe(200);
    });

});
