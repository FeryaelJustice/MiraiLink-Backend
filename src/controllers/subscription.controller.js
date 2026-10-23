import { verifyAndSavePurchase } from '../services/play-billing.js';
import { subscriptionDto } from '../dto/subscription.dto.js';
import db from '../models/db.js';
import { SUBSCRIPTION_PRODUCTS, PLAY_STORE_URLS } from '../consts/subscriptionConsts.js';

export const getSubscriptionStatus = async (req, res, next) => {
    try {
        const result = await db.query(`SELECT provider_verified,product_id,base_plan_id,status,
            auto_renewing,expires_at,provider_state,acknowledgement_pending
            FROM user_subscriptions WHERE user_id=$1`, [req.user.id]);
        const status = subscriptionDto(result.rows[0]);
        res.setHeader('X-Subscription-Plan', status.plan);
        return res.json(status);
    } catch (error) { return next(error); }
};

export const verifySubscription = async (req, res, next) => {
    try {
        const sub = await verifyAndSavePurchase(req.user.id, req.body.purchaseToken, req.body.productId);
        const status = subscriptionDto(sub?.product_id ? sub : undefined);
        res.setHeader('X-Subscription-Plan', status.plan);
        return res.json(status);
    } catch (error) { return next(error); }
};

/** Records local intent; only Google determines whether auto-renewal is enabled. */
export const cancelSubscriptionIntent = async (req, res, next) => {
    try {
        const result = await db.query(`UPDATE user_subscriptions
            SET cancellation_intent_at=NOW(),updated_at=NOW() WHERE user_id=$1 RETURNING product_id`, [req.user.id]);
        const productId = result.rows[0]?.product_id || SUBSCRIPTION_PRODUCTS.PREMIUM;
        return res.json({
            message: 'Cancellation intent registered',
            playStoreUrl: `${PLAY_STORE_URLS.SUBSCRIPTIONS_BASE}?package=${PLAY_STORE_URLS.APP_PACKAGE_NAME}&sku=${productId}`,
        });
    } catch (error) { return next(error); }
};
