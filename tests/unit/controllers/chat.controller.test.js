import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientQuery = vi.fn();
const release = vi.fn();
const client = { query: clientQuery, release };
const connect = vi.fn().mockResolvedValue(client);
const query = vi.fn();

vi.mock('../../../src/models/db.js', () => ({
    default: { connect, query },
}));

vi.mock('../../../src/services/notificationService.js', () => ({
    sendChatMessageNotification: vi.fn().mockResolvedValue(undefined),
}));

const { sendMessage } = await import('../../../src/controllers/chat.controller.js');

const senderId = '00000000-0000-4000-8000-000000000001';
const toUserId = '00000000-0000-4000-8000-000000000002';
const chatId = '00000000-0000-4000-8000-000000000003';
const messageId = '00000000-0000-4000-8000-000000000004';

function mockRequest({ body = {} } = {}) {
    return {
        user: { id: senderId },
        body: { toUserId, text: 'Hello world', ...body },
    };
}

function mockResponse() {
    return {
        json: vi.fn(),
        status: vi.fn().mockReturnThis(),
    };
}

describe('chat.controller - crystal capsule message lock', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        connect.mockResolvedValue(client);
    });

    it('rejects sending messages when an active, unrevealed capsule exists with CAPSULE_CHAT_LOCKED', async () => {
        clientQuery
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [] }) // pg_advisory_xact_lock
            .mockResolvedValueOnce({ rows: [{ id: 'capsule-1', status: 'active' }] }) // getPairCapsule
            .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

        const req = mockRequest();
        const res = mockResponse();
        const next = vi.fn();

        await sendMessage(req, res, next);

        expect(next).toHaveBeenCalled();
        const error = next.mock.calls[0][0];
        expect(error.status).toBe(403);
        expect(error.code).toBe('CAPSULE_CHAT_LOCKED');
        expect(res.status).not.toHaveBeenCalledWith(201);
    });

    it('allows sending messages when the capsule status is revealed', async () => {
        clientQuery
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [] }) // pg_advisory_xact_lock
            .mockResolvedValueOnce({ rows: [{ id: 'capsule-1', status: 'revealed' }] }) // getPairCapsule
            .mockResolvedValueOnce({ rows: [{ id: chatId }] }) // existing chat
            .mockResolvedValueOnce({ rows: [{ id: messageId, text: 'Hello world', sent_at: new Date().toISOString() }] }) // insert message
            .mockResolvedValueOnce({ rows: [{ id: 'capsule-1', match_id: 'm1', snapshot: { id: 'capsule-1', userIds: [senderId, toUserId], status: 'revealed', progress: 4, level: 4, revision: 4 } }] }) // creditChatMessage getPairCapsule
            .mockResolvedValueOnce({ rows: [] }) // update capsule chat_id
            .mockResolvedValueOnce({ rows: [] }); // COMMIT

        const req = mockRequest();
        const res = mockResponse();
        const next = vi.fn();

        await sendMessage(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Message sent',
            chatId,
            id: messageId,
        }));
    });

    it('allows sending messages when no capsule exists', async () => {
        clientQuery
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [] }) // pg_advisory_xact_lock
            .mockResolvedValueOnce({ rows: [] }) // getPairCapsule -> null
            .mockResolvedValueOnce({ rows: [{ id: chatId }] }) // existing chat
            .mockResolvedValueOnce({ rows: [{ id: messageId, text: 'Hello world', sent_at: new Date().toISOString() }] }) // insert message
            .mockResolvedValueOnce({ rows: [] }) // creditChatMessage getPairCapsule -> null
            .mockResolvedValueOnce({ rows: [] }); // COMMIT

        const req = mockRequest();
        const res = mockResponse();
        const next = vi.fn();

        await sendMessage(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
