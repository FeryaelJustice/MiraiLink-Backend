import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';

vi.mock('firebase-admin/app', () => ({ cert: vi.fn(value => value), getApps: () => [], initializeApp: vi.fn(value => value) }));
vi.mock('firebase-admin/messaging', () => ({ getMessaging: vi.fn(app => ({ app })) }));
const { getFcm, resetFirebaseForTests } = await import('../../src/config/firebaseAdmin.js');
afterEach(() => { resetFirebaseForTests(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('Firebase credential source', () => {
    it('initializes from environment JSON without a local file', async () => {
        const credentials = { project_id: 'fixture', client_email: 'fixture@example.test', private_key: 'fixture-key' };
        vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_JSON', JSON.stringify(credentials));
        const read = vi.spyOn(fs, 'readFile');
        expect(await getFcm()).toEqual({ app: { credential: credentials } });
        expect(read).not.toHaveBeenCalled();
    });
});
