import { describe, it, expect } from 'vitest';
import { privateChatSchema } from '../../../src/validation/chat.schemas.js';

describe('chat.schemas validation', () => {
    it('accepts standard RFC UUID', () => {
        const result = privateChatSchema.safeParse({
            otherUserId: '123e4567-e89b-12d3-a456-426614174000',
        });
        expect(result.success).toBe(true);
    });

    it('accepts synthetic and demo UUIDs like 77777777-7777-7777-7777-777777777777', () => {
        const result = privateChatSchema.safeParse({
            otherUserId: '77777777-7777-7777-7777-777777777777',
        });
        expect(result.success).toBe(true);
    });

    it('rejects invalid UUID string', () => {
        const result = privateChatSchema.safeParse({
            otherUserId: 'not-a-uuid',
        });
        expect(result.success).toBe(false);
    });
});
