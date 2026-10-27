import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendTwoFactorEmail } from '../../../src/utils/mailer.js';

beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('EMAIL_USER', 'sender@example.com');
    vi.stubEnv('EMAIL_PASSWORD', '');
    vi.stubEnv('MAIL_BRIDGE_URL', 'https://bridge.example/');
    vi.stubEnv('MAIL_BRIDGE_KEY', 'test-secret-012345678901234567890123456');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('2FA email with bridge-only production configuration', () => {
    it.each(['enable', 'disable'])('sends the %s code through the bridge', async action => {
        await expect(sendTwoFactorEmail('recipient@example.com', '123456', action)).resolves.toEqual({ success: true, simulated: false });
        const [url, request] = fetch.mock.calls[0];
        expect(url).toBe('https://bridge.example/');
        const body = JSON.parse(request.body);
        expect(body.action).toBe('send');
        expect(body.to).toBe('recipient@example.com');
        expect(body.message).toContain('123456');
    });

    it('reports failure when bridge configuration is incomplete', async () => {
        vi.stubEnv('MAIL_BRIDGE_KEY', '');
        await expect(sendTwoFactorEmail('recipient@example.com', '123456', 'enable')).resolves.toEqual({ success: false, simulated: false, code: 'BRIDGE_FAILED' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('does not simulate delivery when no transport is configured', async () => {
        vi.stubEnv('MAIL_BRIDGE_URL', '');
        await expect(sendTwoFactorEmail('recipient@example.com', '123456', 'disable')).resolves.toEqual({ success: false, simulated: false, code: 'EMAIL_NOT_CONFIGURED' });
        expect(fetch).not.toHaveBeenCalled();
    });
});
