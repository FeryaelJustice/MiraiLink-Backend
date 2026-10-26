import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import { loadServiceAccount } from '../../src/config/serviceAccount.js';

const variable = 'TEST_SERVICE_ACCOUNT_JSON';
const credentials = { client_email: 'fixture@example.test', private_key: 'line one\nline two\n' };
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('service account credentials', () => {
    it('prefers inline JSON and preserves escaped PEM newlines without reading a file', async () => {
        vi.stubEnv(variable, JSON.stringify(credentials));
        const read = vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('File must not be read'));
        expect(await loadServiceAccount(variable, 'unused.json')).toEqual(credentials);
        expect(read).not.toHaveBeenCalled();
    });

    it.each([undefined, ''])('uses the configured file when inline JSON is %s', async inline => {
        vi.stubEnv(variable, inline);
        const read = vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(credentials));
        expect(await loadServiceAccount(variable, 'fixture.json')).toEqual(credentials);
        expect(read).toHaveBeenCalledWith('fixture.json', 'utf8');
    });

    it.each(['{"secret":"never-expose",', 'null', '[]', '{}', '   '])('rejects invalid inline credentials without a file fallback: %s', async inline => {
        vi.stubEnv(variable, inline);
        const read = vi.spyOn(fs, 'readFile');
        await expect(loadServiceAccount(variable, 'fixture.json')).rejects.toThrow(`Invalid service account JSON for ${variable}`);
        expect(read).not.toHaveBeenCalled();
    });

    it('sanitizes file errors and rejects missing configuration', async () => {
        vi.stubEnv(variable, '');
        vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('sensitive path'));
        await expect(loadServiceAccount(variable, 'fixture.json')).rejects.toThrow(`Cannot read service account file for ${variable}`);
        await expect(loadServiceAccount(variable)).rejects.toThrow(`Missing service account configuration: ${variable}`);
    });
});
