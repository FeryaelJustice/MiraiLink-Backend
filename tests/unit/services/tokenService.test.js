import { describe, expect, it } from 'vitest';
import {
    createAccessToken,
    createTwoFactorChallenge,
    verifyTwoFactorChallenge,
} from '../../../src/services/tokenService.js';

describe('tokenService', () => {
    it('creates purpose-bound, short-lived 2FA challenges', () => {
        const challenge = createTwoFactorChallenge({ id: 'user-1', username: 'mirai' });
        const payload = verifyTwoFactorChallenge(challenge);

        expect(payload).toMatchObject({ sub: 'user-1', purpose: '2fa-login' });
        expect(payload.exp - payload.iat).toBe(300);
    });

    it('does not accept an access token as a 2FA challenge', () => {
        const access = createAccessToken({ id: 'user-1', username: 'mirai' });
        expect(() => verifyTwoFactorChallenge(access)).toThrow();
    });
});
