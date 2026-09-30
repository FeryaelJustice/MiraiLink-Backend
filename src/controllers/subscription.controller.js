import db from '../models/db.js';
import {
    SUBSCRIPTION_PRODUCTS,
    BASE_PLANS,
    resolvePlanInterval,
    PLAY_STORE_URLS,
} from '../consts/subscriptionConsts.js';

export const getSubscriptionStatus = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const queryText = `
            SELECT id, product_id, base_plan_id, status, auto_renewing, expires_at, created_at
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
        const isActive = sub.status === 'active' && isNotExpired;
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
        const userId = req.user.id;
        const { purchaseToken, productId, basePlanId = BASE_PLANS.MONTHLY, orderId } = req.body;

        const interval = resolvePlanInterval(basePlanId);

        const upsertQuery = `
            INSERT INTO user_subscriptions (
                user_id, product_id, base_plan_id, purchase_token, order_id,
                status, auto_renewing, expires_at, last_verified_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                'active', TRUE, NOW() + $6::INTERVAL, NOW(), NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
                product_id = EXCLUDED.product_id,
                base_plan_id = EXCLUDED.base_plan_id,
                purchase_token = EXCLUDED.purchase_token,
                order_id = COALESCE(EXCLUDED.order_id, user_subscriptions.order_id),
                status = 'active',
                auto_renewing = TRUE,
                expires_at = NOW() + $6::INTERVAL,
                last_verified_at = NOW(),
                updated_at = NOW()
            RETURNING id, product_id, base_plan_id, status, auto_renewing, expires_at
        `;

        const result = await db.query(upsertQuery, [
            userId,
            productId,
            basePlanId,
            purchaseToken,
            orderId || null,
            interval,
        ]);

        const savedSub = result.rows[0];
        const isPremium = savedSub.product_id === SUBSCRIPTION_PRODUCTS.PREMIUM;
        const isPlus = savedSub.product_id === SUBSCRIPTION_PRODUCTS.PLUS || isPremium;

        return res.json({
            isPremium,
            isPlus,
            plan: isPremium ? 'premium' : 'plus',
            status: savedSub.status,
            productId: savedSub.product_id,
            basePlanId: savedSub.base_plan_id,
            expiresAt: savedSub.expires_at ? new Date(savedSub.expires_at).toISOString() : null,
            autoRenewing: Boolean(savedSub.auto_renewing),
        });
    } catch (error) {
        return next(error);
    }
};

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
