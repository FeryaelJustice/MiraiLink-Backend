import { describe, expect, it } from 'vitest';
import { mayReturnDebugLink } from '../../../src/utils/debugSecurityLinks.js';

const key = 'only-for-tests-0123456789-0123456789';
const base = { DEBUG_SECURITY_LINKS: 'true', DEBUG_SECURITY_LINK_KEY: key, DEBUG_SECURITY_LINK_EMAILS: 'tester@example.com' };
const req = supplied => ({ get: () => supplied });
describe('private security link access', () => {
    it('requires the feature, strong key, matching secret and an allowed account', () => {
        expect(mayReturnDebugLink(req(key), 'tester@example.com', base)).toBe(true);
        expect(mayReturnDebugLink(req(key), 'TESTER@example.com', base)).toBe(true);
        expect(mayReturnDebugLink(req(key), 'other@example.com', base)).toBe(false);
        expect(mayReturnDebugLink(req('wrong'), 'tester@example.com', base)).toBe(false);
        expect(mayReturnDebugLink(req(key), 'tester@example.com', { ...base, DEBUG_SECURITY_LINKS: 'false' })).toBe(false);
        expect(mayReturnDebugLink(req('short'), 'tester@example.com', { ...base, DEBUG_SECURITY_LINK_KEY: 'short' })).toBe(false);
        expect(mayReturnDebugLink(req(key), 'tester@example.com', { ...base, DEBUG_SECURITY_LINK_EMAILS: '' })).toBe(false);
    });
});
