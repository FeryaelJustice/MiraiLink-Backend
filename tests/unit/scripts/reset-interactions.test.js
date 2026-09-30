import { describe, expect, it, vi } from 'vitest';
import { resetInteractions } from '../../../scripts/reset-interactions.js';

describe('resetInteractions script', () => {
    it('executes DELETE commands in a transaction and cleans up interaction tables', async () => {
        const queryMock = vi.fn().mockImplementation((sql) => {
            if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
                return Promise.resolve({ rowCount: 0 });
            }
            if (sql.includes('FROM messages')) return Promise.resolve({ rowCount: 15 });
            if (sql.includes('FROM chat_members')) return Promise.resolve({ rowCount: 6 });
            if (sql.includes('FROM chats')) return Promise.resolve({ rowCount: 3 });
            if (sql.includes('FROM matches')) return Promise.resolve({ rowCount: 4 });
            if (sql.includes('FROM likes')) return Promise.resolve({ rowCount: 10 });
            if (sql.includes('FROM dislikes')) return Promise.resolve({ rowCount: 5 });
            return Promise.resolve({ rowCount: 0 });
        });

        const clientMock = {
            query: queryMock,
            release: vi.fn(),
        };

        const poolMock = {
            connect: vi.fn().mockResolvedValue(clientMock),
        };

        await expect(resetInteractions(poolMock)).resolves.not.toThrow();

        expect(poolMock.connect).toHaveBeenCalledTimes(1);
        expect(queryMock).toHaveBeenCalledWith('BEGIN');
        expect(queryMock).toHaveBeenCalledWith('DELETE FROM messages;');
        expect(queryMock).toHaveBeenCalledWith('DELETE FROM chat_members;');
        expect(queryMock).toHaveBeenCalledWith('DELETE FROM chats;');
        expect(queryMock).toHaveBeenCalledWith('DELETE FROM matches;');
        expect(queryMock).toHaveBeenCalledWith('DELETE FROM likes;');
        expect(queryMock).toHaveBeenCalledWith('DELETE FROM dislikes;');
        expect(queryMock).toHaveBeenCalledWith('COMMIT');
        expect(clientMock.release).toHaveBeenCalledTimes(1);
    });

    it('rolls back transaction on error and releases connection', async () => {
        const queryMock = vi.fn().mockImplementation((sql) => {
            if (sql === 'BEGIN') return Promise.resolve({ rowCount: 0 });
            if (sql.includes('DELETE FROM messages;')) throw new Error('Database connection failed');
            return Promise.resolve({ rowCount: 0 });
        });

        const clientMock = {
            query: queryMock,
            release: vi.fn(),
        };

        const poolMock = {
            connect: vi.fn().mockResolvedValue(clientMock),
        };

        await expect(resetInteractions(poolMock)).rejects.toThrow('Database connection failed');

        expect(queryMock).toHaveBeenCalledWith('BEGIN');
        expect(queryMock).toHaveBeenCalledWith('ROLLBACK');
        expect(clientMock.release).toHaveBeenCalledTimes(1);
    });
});
