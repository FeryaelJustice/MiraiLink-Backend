import pg from 'pg';
import request from 'supertest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ pool: null, deliver: true, visibleAtDelivery: 0, delivered: [] }));
vi.mock('../../src/models/db.js', () => ({ default: {
    query: (...args) => state.pool.query(...args), connect: (...args) => state.pool.connect(...args),
} }));
vi.mock('../../src/utils/mailer.js', () => ({
    sendVerificationEmail: async (...args) => {
        state.visibleAtDelivery = (await state.pool.query('SELECT id FROM users')).rowCount;
        state.delivered.push(args);
        return { success: state.deliver, simulated: false };
    },
    sendPasswordResetEmail: vi.fn(), sendTwoFactorEmail: vi.fn(), verifyEmailTransport: vi.fn(),
}));
const url = process.env.MAIL_RETRY_TEST_DB_URL;
(url ? describe : describe.skip)('registration delivery and retry with isolated PostgreSQL', () => {
    let app;
    const body = { username: 'retrytester', email: 'retry@example.com', password: 'Strong_Pass-926', gender: 'male', birthdate: '2000-01-01' };
    beforeAll(async () => {
        const parsed = new URL(url);
        if (parsed.hostname !== '127.0.0.1' || parsed.pathname !== '/mirailink_registration_test') throw Error('Only the isolated local registration test database is allowed');
        state.pool = new pg.Pool({ connectionString: url, max: 4 });
        await state.pool.query(`
            CREATE TABLE users(
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username TEXT UNIQUE, email TEXT UNIQUE,
                password_hash TEXT, auth_provider TEXT, nickname TEXT, gender TEXT, birthdate DATE,
                is_verified BOOLEAN DEFAULT FALSE, is_deleted BOOLEAN DEFAULT FALSE
            );
            CREATE TABLE verification_tokens(
                user_id UUID REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT, type TEXT,
                expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        const { createApp } = await import('../../src/app.js');
        app = createApp({ uploadRoot: join(tmpdir(), 'mirailink-registration-test'), enableRateLimits: false });
    });
    afterAll(async () => { if (state.pool) await state.pool.end(); });
    beforeEach(async () => {
        await state.pool.query('TRUNCATE verification_tokens, users');
        state.deliver = true; state.visibleAtDelivery = 0; state.delivered.length = 0;
    });
    const register = payload => request(app).post('/api/auth/register').send(payload || body);
    it('commits registration before attempting SMTP and never returns success on delivery failure', async () => {
        state.deliver = false;
        const res = await register();
        expect(res.status).toBe(503);
        expect(res.body.code).toBe('EMAIL_DELIVERY_FAILED');
        expect(res.body).not.toHaveProperty('token');
        expect(state.visibleAtDelivery).toBe(1);
        expect((await state.pool.query('SELECT is_verified FROM users')).rows[0].is_verified).toBe(false);
    });
    it('retries the same registration without creating a duplicate account or invoking login', async () => {
        state.deliver = false;
        expect((await register()).status).toBe(503);
        const first = (await state.pool.query('SELECT id FROM users')).rows[0].id;
        const hash = (await state.pool.query('SELECT token_hash FROM verification_tokens')).rows[0].token_hash;
        state.deliver = true;
        const res = await register();
        expect(res.status).toBe(200);
        expect(res.body.userId).toBe(first);
        expect(res.body.isVerified).toBe(false);
        expect(res.body.token).toEqual(expect.any(String));
        expect((await state.pool.query('SELECT id FROM users')).rowCount).toBe(1);
        const tokens = await state.pool.query('SELECT token_hash FROM verification_tokens');
        expect(tokens.rowCount).toBe(1);
        expect(tokens.rows[0].token_hash).not.toBe(hash);
    });
    it('never resumes an account using a wrong password', async () => {
        await register();
        const count = state.delivered.length;
        const res = await register({ ...body, password: 'Different_Pass-792' });
        expect(res.status).toBe(409);
        expect(state.delivered).toHaveLength(count);
    });
    it('never resumes an already verified account', async () => {
        await register();
        await state.pool.query('UPDATE users SET is_verified = TRUE');
        const res = await register();
        expect(res.status).toBe(409);
        expect(res.body).not.toHaveProperty('token');
    });
    it('rejects reuse of a different email for a pending username', async () => {
        await register();
        expect((await register({ ...body, email: 'other@example.com' })).status).toBe(409);
    });
});
