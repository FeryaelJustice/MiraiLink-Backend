import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
    query: vi.fn(), connect: vi.fn(), send: vi.fn(), lock: vi.fn(), store: vi.fn(), consume: vi.fn(), totp: vi.fn(),
}));
vi.mock('../../src/models/db.js', () => ({ default: { query: mocks.query, connect: mocks.connect } }));
vi.mock('../../src/utils/mailer.js', () => ({ sendTwoFactorEmail: mocks.send, sendVerificationEmail: vi.fn(), sendPasswordResetEmail: vi.fn() }));
vi.mock('../../src/services/twoFactorEmailService.js', () => ({
    lockTwoFactorUser: mocks.lock, storeEmailChallenge: mocks.store, consumeEmailChallenge: mocks.consume,
}));
vi.mock('../../src/services/twoFactorService.js', () => ({ verifyTotp: mocks.totp, hashRecoveryCodes: vi.fn(), useRecoveryCode: vi.fn() }));
const { verify2FA, disable2FA, requestTwoFactorEmail } = await import('../../src/controllers/auth.controller.js');
const client = { query: vi.fn(), release: vi.fn() };
const response = () => { const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res); return res; };
beforeEach(() => {
    vi.resetAllMocks();
    mocks.connect.mockResolvedValue(client);
    mocks.query.mockResolvedValue({ rowCount: 1 });
    client.query.mockResolvedValue({ rows: [] });
    mocks.store.mockResolvedValue({ email: 'u@example.com', code: '123456', hash: 'hash' });
});
describe('2FA confirmation orchestration', () => {
    it('requires both email proof and authenticator when enabling', async () => {
        client.query.mockImplementation(async sql => ({ rows: sql.startsWith('SELECT secret') ? [{ secret: 'encrypted', enabled: false }] : [] }));
        mocks.totp.mockReturnValue(true);
        mocks.consume.mockResolvedValue(true);
        const res = response();
        await verify2FA({ user: { id: 'u' }, body: { emailCode: '123456', token: '654321' } }, res, vi.fn());
        expect(mocks.consume).toHaveBeenCalledWith(client, 'u', 'enable', '123456', true);
        expect(client.query).toHaveBeenCalledWith('UPDATE user_2fa SET enabled = TRUE WHERE user_id = $1', ['u']);
        expect(client.query).toHaveBeenCalledWith('COMMIT');
        expect(res.json).toHaveBeenCalledWith({ message: '2FA enabled' });
    });
    it('commits failed attempts without changing factor state', async () => {
        client.query.mockImplementation(async sql => ({ rows: sql.startsWith('SELECT enabled') ? [{ enabled: true }] : [] }));
        mocks.consume.mockResolvedValue(false);
        const res = response();
        await disable2FA({ user: { id: 'u' }, body: { emailCode: '000000' } }, res, vi.fn());
        expect(res.status).toHaveBeenCalledWith(400);
        expect(client.query).toHaveBeenCalledWith('COMMIT');
        expect(client.query.mock.calls.some(([sql]) => sql.startsWith('DELETE FROM user_2fa'))).toBe(false);
    });
    it('deletes factor and recovery codes only after email proof succeeds', async () => {
        client.query.mockImplementation(async sql => ({ rows: sql.startsWith('SELECT enabled') ? [{ enabled: true }] : [] }));
        mocks.consume.mockResolvedValue(true);
        const res = response();
        await disable2FA({ user: { id: 'u' }, body: { emailCode: '123456' } }, res, vi.fn());
        expect(mocks.consume).toHaveBeenCalledWith(client, 'u', 'disable', '123456');
        expect(client.query).toHaveBeenCalledWith('DELETE FROM recovery_codes WHERE user_id = $1', ['u']);
        expect(res.json).toHaveBeenCalledWith({ message: '2FA disabled' });
    });
    it('invalidates code after SMTP failure and reports service unavailable', async () => {
        mocks.send.mockResolvedValue({ success: false });
        const next = vi.fn();
        await requestTwoFactorEmail({ user: { id: 'u' }, body: { action: 'enable' } }, response(), next);
        expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }));
        expect(mocks.query.mock.calls[0][0]).toContain('DELETE');
        expect(mocks.query.mock.calls[0][1]).toEqual(['u', 'enable', 'hash']);
    });
    it('makes a code usable only after successful email delivery', async () => {
        mocks.send.mockResolvedValue({ success: true, simulated: false });
        const res = response();
        await requestTwoFactorEmail({ user: { id: 'u' }, body: { action: 'disable' } }, res, vi.fn());
        expect(mocks.query.mock.calls[0][0]).toContain('ready = TRUE');
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ expiresIn: 300, simulated: false }));
        expect(JSON.stringify(res.json.mock.calls)).not.toContain('123456');
    });
});
