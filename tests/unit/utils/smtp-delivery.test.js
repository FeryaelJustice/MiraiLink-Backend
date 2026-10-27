import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const smtp = vi.hoisted(() => ({ create: vi.fn(), send: vi.fn(), verify: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: smtp.create } }));
beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EMAIL_USER', 'private@example.com');
    vi.stubEnv('EMAIL_PASSWORD', 'private-password');
    vi.stubEnv('EMAIL_PORT', '465');
    delete process.env.EMAIL_SECURE;
    smtp.create.mockReturnValue({ sendMail: smtp.send, verify: smtp.verify });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('Nodemailer delivery diagnostics', () => {
    it('preserves SMTP transport and bounds each SMTP phase', async () => {
        smtp.send.mockResolvedValue({ accepted: ['private@example.com'] });
        const { sendGenericEmail } = await import('../../../src/utils/mailer.js');
        expect(await sendGenericEmail({ to: 'private@example.com', subject: 'test', text: 'secret-code' })).toMatchObject({ success: true, simulated: false });
        expect(smtp.create).toHaveBeenCalledWith(expect.objectContaining({
            host: 'smtp.hostinger.com', port: 465, secure: true,
            connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000,
        }));
    });
    it('reports phase and stable SMTP code without logging secrets', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        smtp.send.mockRejectedValue(Object.assign(new Error('private-password private@example.com 123456'), { code: 'ETIMEDOUT', command: 'CONN' }));
        const { sendGenericEmail } = await import('../../../src/utils/mailer.js');
        const result = await sendGenericEmail({ to: 'private@example.com', subject: 'test', text: '123456' });
        expect(result).toEqual({ success: false, code: 'ETIMEDOUT', simulated: false });
        const output = JSON.stringify(warn.mock.calls);
        expect(output).toContain('ETIMEDOUT');
        expect(output).toContain('CONN');
        expect(output).not.toMatch(/private-password|private@example.com|123456/);
    });
    it('never treats missing production credentials as successful delivery', async () => {
        vi.stubEnv('EMAIL_PASSWORD', '');
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { sendGenericEmail } = await import('../../../src/utils/mailer.js');
        expect(await sendGenericEmail({ to: 'private@example.com', text: 'secret' })).toMatchObject({ success: false, simulated: false, code: 'EMAIL_NOT_CONFIGURED' });
        expect(smtp.send).not.toHaveBeenCalled();
    });
    it('treats an SMTP response with no accepted recipient as failure', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        smtp.send.mockResolvedValue({ accepted: [], rejected: ['private@example.com'] });
        const { sendGenericEmail } = await import('../../../src/utils/mailer.js');
        expect(await sendGenericEmail({ to: 'private@example.com' })).toMatchObject({ success: false, code: 'RECIPIENT_REJECTED' });
    });
    it('checks SMTP authentication without sending a message', async () => {
        smtp.verify.mockResolvedValue(true);
        const { verifyEmailTransport } = await import('../../../src/utils/mailer.js');
        expect(await verifyEmailTransport()).toEqual({ success: true });
        expect(smtp.send).not.toHaveBeenCalled();
    });
    it('exposes only a safe authentication diagnostic', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        smtp.verify.mockRejectedValue(Object.assign(new Error('secret'), { code: 'EAUTH', command: 'AUTH PLAIN secret', responseCode: 535 }));
        const { verifyEmailTransport } = await import('../../../src/utils/mailer.js');
        expect(await verifyEmailTransport()).toEqual({ success: false, event: 'email_delivery_failed', code: 'EAUTH', phase: 'AUTH', responseCode: 535 });
        expect(JSON.stringify(warn.mock.calls)).toContain('EAUTH');
        expect(JSON.stringify(warn.mock.calls)).not.toContain('secret');
    });
});
