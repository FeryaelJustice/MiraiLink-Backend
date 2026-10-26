import bcrypt from 'bcrypt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ query: vi.fn(), clientQuery: vi.fn(), release: vi.fn(), verify: vi.fn(), send: vi.fn(), sendVerification: vi.fn() }));
vi.mock('../../src/models/db.js', () => ({ default: { query: state.query, connect: async () => ({ query: state.clientQuery, release: state.release }) } }));
vi.mock('../../src/utils/mailer.js', () => ({ sendVerificationEmail: state.sendVerification, sendTwoFactorEmail: vi.fn(), verifyEmailTransport: state.verify, sendPasswordResetEmail: state.send }));
const { requestPasswordReset, requestVerificationCode, register } = await import('../../src/controllers/auth.controller.js');
const key = 'a-private-test-key-that-is-32-chars-long';
const req = k => ({ body: { email: 'tester@example.com' }, get: () => k });
function response() { const res = { set: vi.fn(), json: vi.fn(), status: vi.fn() }; res.set.mockReturnValue(res); res.status.mockReturnValue(res); return res; }
beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SALT_ROUNDS', '4');
    vi.stubEnv('DEBUG_SECURITY_LINKS', 'true');
    vi.stubEnv('DEBUG_SECURITY_LINK_KEY', key);
    vi.stubEnv('DEBUG_SECURITY_LINK_EMAILS', 'tester@example.com');
    state.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 'test-id', email: 'tester@example.com' }] });
    state.clientQuery.mockResolvedValue({});
    state.verify.mockResolvedValue({ success: false });
    state.send.mockResolvedValue({ success: false });
    state.sendVerification.mockResolvedValue({ success: false });
});
afterEach(() => vi.unstubAllEnvs());
describe('password reset private debug response', () => {
    it('returns a usable code only for the authorised test request even when SMTP fails', async () => {
        const res = response(); const next = vi.fn();
        await requestPasswordReset(req(key), res, next);
        expect(next).not.toHaveBeenCalled();
        const body = res.json.mock.calls[0][0];
        expect(body.debugMailDelivered).toBe(false);
        expect(res.status).toHaveBeenCalledWith(503);
        const url = new URL(body.debugLink);
        expect(url.pathname).toBe('/reset-password');
        expect(url.searchParams.get('email')).toBe('tester@example.com');
        const insert = state.clientQuery.mock.calls.find(([sql]) => sql.includes('INSERT INTO password_reset_tokens'));
        expect(await bcrypt.compare(url.searchParams.get('token'), insert[1][1])).toBe(true);
        expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
    });
    it('does not bypass SMTP or return a link for a wrong key', async () => {
        const res = response(); const next = vi.fn();
        await requestPasswordReset(req('wrong'), res, next);
        expect(next).toHaveBeenCalledOnce();
        expect(state.query).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });
});


describe('verification private debug response', () => {
    it('returns the original verification code for the allowed account when SMTP fails', async () => {
        state.query.mockResolvedValue({ rowCount: 1, rows: [{ email: 'tester@example.com' }] });
        const res = response(); const next = vi.fn();
        await requestVerificationCode({ body: { userId: 'user-123', type: 'email' }, get: () => key }, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(503);
        const url = new URL(res.json.mock.calls[0][0].debugLink);
        expect(url.pathname).toBe('/verify');
        expect(url.searchParams.get('userId')).toBe('user-123');
        const insert = state.clientQuery.mock.calls.find(([sql]) => sql.includes('INSERT INTO verification_tokens'));
        expect(await bcrypt.compare(url.searchParams.get('token'), insert[1][1])).toBe(true);
    });
});

describe('registration private debug response', () => {
    it('returns the verification link after committing a pending user when SMTP fails', async () => {
        state.query.mockResolvedValue({ rowCount: 0, rows: [] });
        state.clientQuery.mockImplementation(async sql => sql.includes('INSERT INTO users')
            ? { rowCount: 1, rows: [{ id: 'new-user', username: 'tester', email: 'tester@example.com' }] }
            : {});
        const res = response(); const next = vi.fn();
        await register({ body: { username: 'tester', email: 'tester@example.com', password: 'a-password', gender: 'male', birthdate: '2000-01-01' }, get: () => key }, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(503);
        const url = new URL(res.json.mock.calls[0][0].debugLink);
        expect(url.pathname).toBe('/verify');
        expect(url.searchParams.get('userId')).toBe('new-user');
        const insert = state.clientQuery.mock.calls.find(([sql]) => sql.includes('INSERT INTO verification_tokens'));
        expect(await bcrypt.compare(url.searchParams.get('token'), insert[1][1])).toBe(true);
        expect(res.json.mock.calls[0][0]).not.toHaveProperty('token');
    });
});
