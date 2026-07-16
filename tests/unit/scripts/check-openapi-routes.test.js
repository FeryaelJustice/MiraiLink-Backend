import { describe, expect, it } from 'vitest';
import { collectExpressRoutes, validateContract } from '../../../scripts/check-openapi-routes.js';

describe('OpenAPI route contract', () => {
    it('discovers the Express route surface', () => {
        const routes = collectExpressRoutes(process.cwd());
        expect(routes).toContain('post /api/auth/login');
        expect(routes).toContain('get /api/chats/{chatId}/messages');
        expect(routes).not.toContain('post /api/user/byEmailPassword');
    });

    it('documents every active Express operation with unique operation ids', () => {
        expect(() => validateContract(process.cwd())).not.toThrow();
    });
});
