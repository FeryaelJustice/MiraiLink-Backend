import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendViaBridge, verifyBridge } from '../../../src/utils/workerMailTransport.js';

beforeEach(() => {
    vi.stubEnv('MAIL_BRIDGE_URL', 'https://bridge.example/');
    vi.stubEnv('MAIL_BRIDGE_KEY', 'test-secret-012345678901234567890123456');
    vi.stubEnv('EMAIL_USER', 'sender@example.com');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('Hostinger bridge transport', () => {
    it('builds an RFC 5322 message with Nodemailer and uses only HTTPS without following redirects', async () => {
        await sendViaBridge({ to: 'recipient@example.com', subject: 'Test', text: 'hello' });
        const [url, options] = fetch.mock.calls[0];
        const body = JSON.parse(options.body);
        expect(url).toBe('https://bridge.example/');
        expect(options.redirect).toBe('error');
        expect(body.action).toBe('send');
        expect(body.to).toBe('recipient@example.com');
        expect(body.message).toContain('Subject: Test');
        expect(body.message).toContain('hello');
    });
    it('sends a verify request and rejects a failure', async () => {
        fetch.mockResolvedValue({ ok: false });
        await expect(verifyBridge()).rejects.toThrow('BRIDGE_FAILED');
    });
    it('does not send credentials to an insecure URL', async () => {
        vi.stubEnv('MAIL_BRIDGE_URL', 'http://bridge.example/');
        await expect(verifyBridge()).rejects.toThrow('BRIDGE_NOT_CONFIGURED');
        expect(fetch).not.toHaveBeenCalled();
    });
});
