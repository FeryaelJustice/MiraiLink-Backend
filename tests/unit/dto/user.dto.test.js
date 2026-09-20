import { describe, expect, it } from 'vitest';
import { toPublicUser } from '../../../src/dto/user.dto.js';

describe('toPublicUser', () => {
    it('allowlists public fields and drops every credential or internal field', () => {
        const result = toPublicUser({
            id: 'user-1', username: 'mirai', nickname: 'Mirai', bio: 'Hello',
            birthdate: '2000-01-01', gender: 'non-binary',
            password_hash: 'secret-hash', email: 'private@example.com',
            phone_number: '+34123456789', two_fa_secret: 'totp-secret',
            is_deleted: false, auth_provider: 'email',
        });
        expect(result).toEqual({
            id: 'user-1', nickname: 'Mirai', bio: 'Hello',
            gender: 'non-binary', birthdate: '2000-01-01',
        });
        expect(JSON.stringify(result)).not.toMatch(/password|email|phone|secret|deleted|provider|username/);
    });
});
