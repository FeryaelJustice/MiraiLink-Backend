import { verifyAndSavePurchase } from '../services/play-billing.js';
import db from '../models/db.js';
import {
    SUBSCRIPTION_PRODUCTS,
    PLAY_STORE_URLS,
} from '../consts/subscriptionConsts.js';

export const getSubscriptionStatus = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const queryText = `
            SELECT id, provider_verified, product_id, base_plan_id, status, auto_renewing, expires_at, created_at
            FROM user_subscriptions
            WHERE user_id = $1
            LIMIT 1
        `;
        const result = await db.query(queryText, [userId]);

        if (result.rows.length === 0) {
            return res.json({
                isPremium: false,
                isPlus: false,
                plan: 'free',
                status: 'free',
                productId: null,
                basePlanId: null,
                expiresAt: null,
                autoRenewing: false,
            });
        }

        const sub = result.rows[0];
        const isNotExpired = !sub.expires_at || new Date(sub.expires_at) > new Date();
        const isActive = sub.provider_verified === true && sub.status === 'active' && isNotExpired;
        const isPremium = isActive && sub.product_id === SUBSCRIPTION_PRODUCTS.PREMIUM;
        const isPlus = isActive && (sub.product_id === SUBSCRIPTION_PRODUCTS.PLUS || isPremium);

        return res.json({
            isPremium,
            isPlus,
            plan: isActive ? (sub.product_id === SUBSCRIPTION_PRODUCTS.PREMIUM ? 'premium' : 'plus') : 'free',
            status: sub.status,
            productId: sub.product_id,
            basePlanId: sub.base_plan_id,
            expiresAt: sub.expires_at ? new Date(sub.expires_at).toISOString() : null,
            autoRenewing: Boolean(sub.auto_renewing),
        });
    } catch (error) {
        return next(error);
    }
};

export const verifySubscription = async (req, res, next) => {
    try {
        const sub = await verifyAndSavePurchase(req.user.id, req.body.purchaseToken, req.body.productId);
        const active = sub.provider_verified && sub.status === 'active' && new Date(sub.expires_at) > new Date();
        const isPremium = active && sub.product_id === SUBSCRIPTION_PRODUCTS.PREMIUM;
        const isPlus = active && (isPremium || sub.product_id === SUBSCRIPTION_PRODUCTS.PLUS);
        res.setHeader('X-Subscription-Plan', isPremium ? 'premium' : isPlus ? 'plus' : 'free');
        return res.json({ isPremium, isPlus, plan: isPremium ? 'premium' : isPlus ? 'plus' : 'free', status: sub.status,
            productId: sub.product_id, basePlanId: sub.base_plan_id, expiresAt: new Date(sub.expires_at).toISOString(), autoRenewing: sub.auto_renewing });
    } catch (error) { return next(error); }
};

/**
 * Registra intención local y devuelve enlace de gestión de Google Play.
 * Cambiar auto_renewing aquí no cancela facturación en el proveedor.
 */
export const cancelSubscriptionIntent = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
            `UPDATE user_subscriptions
             SET auto_renewing = FALSE, updated_at = NOW()
             WHERE user_id = $1
             RETURNING product_id`,
            [userId],
        );

        const productId = result.rows[0]?.product_id || SUBSCRIPTION_PRODUCTS.PREMIUM;
        const playStoreUrl = `${PLAY_STORE_URLS.SUBSCRIPTIONS_BASE}?package=${PLAY_STORE_URLS.APP_PACKAGE_NAME}&sku=${productId}`;

        return res.json({
            message: 'Cancellation intent registered',
            playStoreUrl,
        });
    } catch (error) {
        return next(error);
    }
};
