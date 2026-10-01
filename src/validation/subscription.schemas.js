/**
 * Esquemas de entrada consumidos por validate() antes de los controllers.
 * Coerciones, defaults y campos omitidos afectan el contrato; no prueban autorización ni existencia en DB.
 */
import { z } from 'zod';
import { BASE_PLANS } from '../consts/subscriptionConsts.js';

export const verifySubscriptionSchema = z.object({
    purchaseToken: z.string().trim().min(1, 'Purchase token is required'),
    productId: z.string().trim().min(1, 'Product ID is required'),
    basePlanId: z.string().trim().default(BASE_PLANS.MONTHLY),
    orderId: z.string().trim().optional(),
});

export const cancelSubscriptionIntentSchema = z.object({
    reason: z.string().trim().optional(),
});
