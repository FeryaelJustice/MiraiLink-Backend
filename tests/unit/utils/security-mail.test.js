import { beforeEach, describe, expect, it, vi } from 'vitest';
const mail = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: mail.sendMail }) } }));
const { sendVerificationEmail, sendPasswordResetEmail, sendTwoFactorEmail } = await import('../../../src/utils/mailer.js');
beforeEach(() => {
    vi.stubEnv('EMAIL_USER', 'test@example.com');
    vi.stubEnv('EMAIL_PASSWORD', 'test-only');
    vi.stubEnv('APP_BASE_URL', 'https://mirailink-backend.onrender.com');
    mail.sendMail.mockReset().mockResolvedValue({});
});
describe('security email contents', () => {
    it('uses HTTPS for registration verification in HTML and plain text', async () => {
        await sendVerificationEmail('u@example.com', '123456', undefined, 'user-id');
        const sent = mail.sendMail.mock.calls[0][0];
        expect(sent.html).toContain('href="https://mirailink-backend.onrender.com/verify?');
        expect(sent.html).not.toContain('href="mirailink://');
        expect(sent.text).toContain('userId=user-id');
    });
    it('uses HTTPS and encodes reset email', async () => {
        await sendPasswordResetEmail('a+b@example.com', '123456');
        const sent = mail.sendMail.mock.calls[0][0];
        expect(sent.html).toContain('https://mirailink-backend.onrender.com/reset-password?');
        expect(sent.text).toContain('email=a%2Bb%40example.com');
    });
    it.each(['enable', 'disable'])('sends a code without URLs for %s', async action => {
        await sendTwoFactorEmail('u@example.com', '123456', action);
        const sent = mail.sendMail.mock.calls[0][0];
        expect(sent.html).toContain('123456');
        expect(sent.html).not.toMatch(/https?:|mirailink:|href=/);
        expect(sent.text).not.toMatch(/https?:|mirailink:\/\//);
        expect(sent.text).toContain('5 minutos');
    });
});
