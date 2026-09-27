import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    printSimulatorLog,
    renderEmailShell,
    sendGenericEmail,
    sendPasswordResetEmail,
    sendVerificationEmail,
} from '../../../src/utils/mailer.js';

describe('mailer utility', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.EMAIL_USER;
        delete process.env.EMAIL_PASSWORD;
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.restoreAllMocks();
    });

    it('renders email shell with title and content', () => {
        const html = renderEmailShell({
            title: 'Test Email',
            preheader: 'Preview text',
            contentHtml: '<p>Contenido de prueba</p>',
        });
        expect(html).toContain('Test Email');
        expect(html).toContain('Preview text');
        expect(html).toContain('Contenido de prueba');
        expect(html).toContain('MiraiLink');
    });

    it('prints simulator log without errors', () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        printSimulatorLog({
            to: 'test@example.com',
            subject: 'Prueba',
            code: '123456',
            deepLink: 'mirailink://verify?token=123456',
            type: 'Verificacion',
            expiresIn: '15 min',
        });
        expect(spy).toHaveBeenCalled();
    });

    it('simulates generic email when SMTP credentials are not configured', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const result = await sendGenericEmail({
            to: 'user@example.com',
            subject: 'Hola',
            html: '<p>Test</p>',
            text: 'Test',
            logData: { code: '654321' },
        });

        expect(result.success).toBe(true);
        expect(result.simulated).toBe(true);
        expect(spy).toHaveBeenCalled();
    });

    it('sends verification email with code and deep link in simulator mode', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const result = await sendVerificationEmail('newuser@example.com', '789123', 'token-abc');

        expect(result.success).toBe(true);
        expect(result.simulated).toBe(true);
        expect(spy).toHaveBeenCalled();
    });

    it('sends password reset email with code and deep link in simulator mode', async () => {
        const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const result = await sendPasswordResetEmail('resetuser@example.com', '456789', 'token-xyz');

        expect(result.success).toBe(true);
        expect(result.simulated).toBe(true);
        expect(spy).toHaveBeenCalled();
    });
});
