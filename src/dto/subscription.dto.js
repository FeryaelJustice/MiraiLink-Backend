import { SUBSCRIPTION_PRODUCTS } from '../consts/subscriptionConsts.js';

/** Public subscription allowlist. Google state and access are distinct. */
export function subscriptionDto(sub) {
    const expiresAt = sub?.expires_at ? new Date(sub.expires_at).toISOString() : null;
    const validProduct = [SUBSCRIPTION_PRODUCTS.PLUS, SUBSCRIPTION_PRODUCTS.PREMIUM].includes(sub?.product_id);
    const hasAccess = Boolean(sub?.provider_verified === true && sub.status === 'active'
        && expiresAt && new Date(expiresAt) > new Date() && validProduct);
    const isPremium = hasAccess && sub.product_id === SUBSCRIPTION_PRODUCTS.PREMIUM;
    const isPlus = hasAccess;
    return {
        isPremium,
        isPlus,
        plan: isPremium ? 'premium' : isPlus ? 'plus' : 'free',
        status: sub ? (hasAccess ? 'active' : 'expired') : 'free',
        productId: sub?.product_id ?? null,
        basePlanId: sub?.base_plan_id ?? null,
        expiresAt,
        autoRenewing: Boolean(sub?.auto_renewing),
        providerState: sub?.provider_state ?? null,
        hasAccess,
        acknowledgementPending: Boolean(sub?.acknowledgement_pending),
    };
}
