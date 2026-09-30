import { describe, expect, it } from 'vitest';
import {
    cancelSubscriptionIntentSchema,
    verifySubscriptionSchema,
} from '../../../src/validation/subscription.schemas.js';

describe('subscription.schemas', () => {
    describe('verifySubscriptionSchema', () => {
        it('validates a correct payload with default basePlanId', () => {
            const parsed = verifySubscriptionSchema.parse({
                purchaseToken: 'token_12345',
                productId: 'mirailink_premium',
            });
            expect(parsed.purchaseToken).toBe('token_12345');
            expect(parsed.productId).toBe('mirailink_premium');
            expect(parsed.basePlanId).toBe('monthly-autorenew');
        });

        it('validates custom basePlanId and optional orderId', () => {
            const parsed = verifySubscriptionSchema.parse({
                purchaseToken: 'token_12345',
                productId: 'mirailink_premium',
                basePlanId: 'custom-plan',
                orderId: 'GPA.1234-5678',
            });
            expect(parsed.basePlanId).toBe('custom-plan');
            expect(parsed.orderId).toBe('GPA.1234-5678');
        });

        it('rejects missing or empty purchaseToken', () => {
            expect(() => verifySubscriptionSchema.parse({
                purchaseToken: '   ',
                productId: 'mirailink_premium',
            })).toThrow();
        });

        it('rejects missing or empty productId', () => {
            expect(() => verifySubscriptionSchema.parse({
                purchaseToken: 'token_123',
                productId: '',
            })).toThrow();
        });
    });

    describe('cancelSubscriptionIntentSchema', () => {
        it('accepts an empty body', () => {
            const parsed = cancelSubscriptionIntentSchema.parse({});
            expect(parsed).toEqual({});
        });

        it('accepts optional reason', () => {
            const parsed = cancelSubscriptionIntentSchema.parse({ reason: 'too_expensive' });
            expect(parsed.reason).toBe('too_expensive');
        });
    });
});
