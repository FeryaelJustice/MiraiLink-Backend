import { describe, expect, it, vi } from 'vitest';
import { requireChatMember } from '../../../src/middleware/chatMember.middleware.js';

function responseDouble() {
    const res = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    return res;
}

describe('requireChatMember', () => {
    it('rejects a user who is not a member of the requested chat', async () => {
        const db = { query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }) };
        const res = responseDouble();
        const next = vi.fn();

        await requireChatMember({ db })({
            user: { id: 'user-1' },
            params: { chatId: 'chat-1' },
        }, res, next);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            code: 'CHAT_NOT_FOUND',
            message: 'Chat not found',
        });
        expect(next).not.toHaveBeenCalled();
    });
});
