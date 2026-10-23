import fs from 'node:fs/promises';
import { createHash, createPublicKey } from 'node:crypto';
import jwt from 'jsonwebtoken';
import db from '../models/db.js';
import { AppError } from '../errors/AppError.js';

async function billingTransaction(work) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function lockBillingAccount(client, userId) {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['play-account:' + userId]);
}

async function currentSubscription(client, userId) {
    return (await client.query('SELECT * FROM user_subscriptions WHERE user_id=$1', [userId])).rows[0];
}


const PACKAGE = 'com.feryaeljustice.mirailink';
const PRODUCTS = ['mirailink_plus', 'mirailink_premium'];
let oauth;
let googleKeys;
const failure = (code, status = 403) => new AppError({ code, status, message: code });
export const accountHash = id => createHash('sha256').update(id).digest('hex');

export async function googleRequest(url, options = {}, { emptyResponse = false } = {}) {
    let response;
    try { response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) }); }
    catch (cause) { throw new AppError({ code: 'PLAY_UNAVAILABLE', status: 503, cause }); }
    if (!response.ok) throw failure(response.status === 400 || response.status === 404 ? 'INVALID_PURCHASE' : 'PLAY_UNAVAILABLE', response.status === 400 || response.status === 404 ? 403 : 503);
    if (emptyResponse) return {};
    try { return await response.json(); }
    catch (cause) { throw new AppError({ code: 'PLAY_UNAVAILABLE', status: 503, cause }); }
}

async function accessToken() {
    if (oauth?.expires > Date.now() + 60000) return oauth.token;
    if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE) throw failure('PLAY_NOT_CONFIGURED', 503);
    const credentials = JSON.parse(await fs.readFile(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE, 'utf8'));
    const assertion = jwt.sign({ scope: 'https://www.googleapis.com/auth/androidpublisher' }, credentials.private_key, {
        algorithm: 'RS256', issuer: credentials.client_email, audience: 'https://oauth2.googleapis.com/token', expiresIn: 3600,
    });
    const response = await googleRequest('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    if (!response.access_token || !Number.isFinite(response.expires_in)) throw failure('PLAY_UNAVAILABLE', 503);
    oauth = { token: response.access_token, expires: Date.now() + response.expires_in * 1000 };
    return oauth.token;
}

export function parsePlayPurchase(purchase, expectedProduct) {
    const items = (purchase.lineItems ?? []).filter(item => PRODUCTS.includes(item.productId));
    const item = items.sort((a, b) => new Date(b.expiryTime) - new Date(a.expiryTime))[0];
    const pending = ['SUBSCRIPTION_STATE_PENDING', 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED'].includes(purchase.subscriptionState);
    if (!item || (expectedProduct && item.productId !== expectedProduct) || (!pending && !Number.isFinite(Date.parse(item.expiryTime)))) throw failure('INVALID_PURCHASE');
    const entitled = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED'].includes(purchase.subscriptionState)
        && Date.parse(item.expiryTime) > Date.now();
    return {
        productId: item.productId, basePlanId: item.offerDetails?.basePlanId ?? 'monthly-autorenew',
        status: entitled ? 'active' : 'expired', state: purchase.subscriptionState,
        expiresAt: Number.isFinite(Date.parse(item.expiryTime)) ? item.expiryTime : null, autoRenewing: Boolean(item.autoRenewingPlan?.autoRenewEnabled),
        orderId: item.latestSuccessfulOrderId ?? purchase.latestOrderId ?? null,
    };
}

/** Verify under the account lock; acknowledge only after the durable transaction. */
export async function verifyAndSavePurchase(userId, purchaseToken, expectedProduct, { queryPurchase, acknowledge } = {}) {
    const token = queryPurchase ? null : await accessToken();
    const endpoint = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const saved = await billingTransaction(async client => {
        await lockBillingAccount(client, userId);
        const purchase = queryPurchase ? await queryPurchase(purchaseToken) : await googleRequest(endpoint, { headers: { Authorization: `Bearer ${token}` } });
        const state = parsePlayPurchase(purchase, expectedProduct);
        const linkedToken = purchase.linkedPurchaseToken;
        if (linkedToken === purchaseToken) throw failure('INVALID_PURCHASE');
        for (const value of [...new Set([purchaseToken, linkedToken].filter(Boolean))].sort()) {
            await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['play-token:' + value]);
        }
        const owner = (await client.query('SELECT user_id,superseded_by FROM play_purchase_owners WHERE purchase_token=$1', [purchaseToken])).rows[0];
        if (owner && owner.user_id !== userId) throw failure('PURCHASE_ALREADY_BOUND');
        if (owner?.superseded_by) {
            return { purchase: await currentSubscription(client, userId), obsolete: true };
        }
        const mapped = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId;
        if (mapped ? mapped !== accountHash(userId) : !owner) throw failure('PURCHASE_ACCOUNT_MISMATCH');
        if (linkedToken) {
            const linked = (await client.query('SELECT user_id,superseded_by FROM play_purchase_owners WHERE purchase_token=$1', [linkedToken])).rows[0];
            if (linked && linked.user_id !== userId) throw failure('PURCHASE_ALREADY_BOUND');
            if (linked?.superseded_by && linked.superseded_by !== purchaseToken) throw failure('INVALID_PURCHASE');
        }
        const current = await currentSubscription(client, userId);
        const replacing = current && current.purchase_token !== purchaseToken;
        if (replacing && (state.state === 'SUBSCRIPTION_STATE_PENDING'
            || state.state === 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED'
            || (current.provider_verified && current.status === 'active' && new Date(current.expires_at) > new Date()
                && linkedToken !== current.purchase_token))) throw failure('PURCHASE_REPLACEMENT_REQUIRED', 409);
        await client.query('INSERT INTO play_purchase_owners(purchase_token,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [purchaseToken, userId]);
        if (replacing) {
            await client.query('INSERT INTO play_purchase_owners(purchase_token,user_id,superseded_by) VALUES($1,$2,$3) ON CONFLICT(purchase_token) DO UPDATE SET superseded_by=EXCLUDED.superseded_by',
                [current.purchase_token, userId, purchaseToken]);
        }
        // Only a completed replacement supersedes the previous paid purchase, even after expiry.
        if (linkedToken && !['SUBSCRIPTION_STATE_PENDING', 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED', 'SUBSCRIPTION_STATE_UNSPECIFIED'].includes(state.state)) {
            await client.query(`INSERT INTO play_purchase_owners(purchase_token,user_id,superseded_by) VALUES($1,$2,$3)
                ON CONFLICT(purchase_token) DO UPDATE SET superseded_by=EXCLUDED.superseded_by`, [linkedToken, userId, purchaseToken]);
        }
        const pending = purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING';
        const previous = (await client.query('SELECT * FROM user_subscriptions WHERE purchase_token=$1', [purchaseToken])).rows[0];
        const attempt = pending && state.status === 'active' && (!previous?.acknowledgement_pending
            || !previous.acknowledgement_next_attempt_at || new Date(previous.acknowledgement_next_attempt_at) <= new Date());
        const result = await client.query(`INSERT INTO user_subscriptions(user_id,product_id,base_plan_id,purchase_token,
            order_id,status,auto_renewing,expires_at,last_verified_at,provider_verified,provider_state,acknowledgement_pending,
            acknowledgement_attempts,acknowledgement_next_attempt_at,verification_next_attempt_at)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW(),TRUE,$9,$10,$11,
                CASE WHEN $11=1 THEN NOW()+INTERVAL '1 hour' END,NOW()+INTERVAL '1 hour')
            ON CONFLICT(user_id) DO UPDATE SET purchase_token=EXCLUDED.purchase_token,product_id=EXCLUDED.product_id,base_plan_id=EXCLUDED.base_plan_id,
            cancellation_intent_at=CASE WHEN user_subscriptions.purchase_token=EXCLUDED.purchase_token THEN user_subscriptions.cancellation_intent_at END,
            order_id=EXCLUDED.order_id,status=EXCLUDED.status,auto_renewing=EXCLUDED.auto_renewing,expires_at=EXCLUDED.expires_at,
            last_verified_at=NOW(),updated_at=NOW(),revision=gen_random_uuid(),provider_verified=TRUE,provider_state=EXCLUDED.provider_state,
            acknowledgement_pending=EXCLUDED.acknowledgement_pending,
            acknowledgement_attempts=CASE WHEN user_subscriptions.purchase_token<>EXCLUDED.purchase_token THEN EXCLUDED.acknowledgement_attempts WHEN $11=1 THEN user_subscriptions.acknowledgement_attempts+1 ELSE user_subscriptions.acknowledgement_attempts END,
            acknowledgement_next_attempt_at=CASE WHEN user_subscriptions.purchase_token<>EXCLUDED.purchase_token THEN EXCLUDED.acknowledgement_next_attempt_at WHEN $11=1 THEN NOW()+LEAST(6,POWER(2,LEAST(user_subscriptions.acknowledgement_attempts,3))) * INTERVAL '1 hour'
                WHEN EXCLUDED.acknowledgement_pending THEN user_subscriptions.acknowledgement_next_attempt_at END,
            acknowledgement_error_code=NULL,verification_next_attempt_at=NOW()+INTERVAL '1 hour' RETURNING *`,
        [userId, state.productId, state.basePlanId, purchaseToken, state.orderId, state.status, state.autoRenewing,
            state.expiresAt, state.state, pending, attempt ? 1 : 0]);
        return { purchase: result.rows[0], attempt };
    });
    let processed = saved.purchase;
    if (saved.attempt) {
        try {
            if (acknowledge) await acknowledge(purchaseToken);
            else await googleRequest(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases/subscriptions/${processed.product_id}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}',
            }, { emptyResponse: true });
            const updated = await db.query(`UPDATE user_subscriptions SET acknowledgement_pending=FALSE,
                acknowledgement_next_attempt_at=NULL,acknowledgement_error_code=NULL
                WHERE purchase_token=$1 AND revision=$2 RETURNING *`, [purchaseToken, processed.revision]);
            processed = updated.rows[0] ?? processed;
        } catch (_error) {
            // The pending attempt was committed first. Even a DB outage cannot lose it.
            await db.query(`UPDATE user_subscriptions SET acknowledgement_error_code='PLAY_ACKNOWLEDGEMENT_PENDING'
                WHERE purchase_token=$1 AND revision=$2`, [purchaseToken, processed.revision]).catch(() => {});
        }
    }
    return await currentSubscription(db, userId).catch(() => processed);
}

export async function reconcileSubscriptions() {
    // Reserve half of the batch for ordinary verification so failed acknowledgements cannot starve it.
    const records = await db.query(`WITH pending AS (
        SELECT p.user_id,p.purchase_token FROM user_subscriptions p
        JOIN play_purchase_owners o USING(purchase_token,user_id)
        WHERE o.superseded_by IS NULL AND p.acknowledgement_pending
            AND p.acknowledgement_next_attempt_at<=NOW() AND p.verification_next_attempt_at<=NOW()
        ORDER BY p.acknowledgement_next_attempt_at,p.purchase_token LIMIT 50
    ), stale AS (
        SELECT p.user_id,p.purchase_token FROM user_subscriptions p
        JOIN play_purchase_owners o USING(purchase_token,user_id)
        WHERE o.superseded_by IS NULL AND p.verification_next_attempt_at<=NOW()
            AND NOT EXISTS(SELECT 1 FROM pending q WHERE q.purchase_token=p.purchase_token)
        ORDER BY p.last_verified_at,p.purchase_token LIMIT 50
    ) SELECT * FROM pending UNION ALL SELECT * FROM stale`);
    let unavailable = false;
    for (const record of records.rows) {
        try { await verifyAndSavePurchase(record.user_id, record.purchase_token); }
        catch (error) {
            await billingTransaction(async client => {
                await lockBillingAccount(client, record.user_id);
                // A successful concurrent verification takes precedence over this failed attempt.
                if (error.code === 'INVALID_PURCHASE') {
                    await client.query(`UPDATE user_subscriptions SET status='expired',provider_verified=FALSE,
                        acknowledgement_pending=FALSE,acknowledgement_next_attempt_at=NULL,last_verified_at=NOW(),
                        verification_next_attempt_at=NOW()+INTERVAL '1 day',revision=gen_random_uuid()
                        WHERE purchase_token=$1 AND verification_next_attempt_at<=NOW()`, [record.purchase_token]);
                } else {
                    await client.query(`UPDATE user_subscriptions SET verification_next_attempt_at=NOW()+INTERVAL '1 hour'
                        WHERE purchase_token=$1 AND verification_next_attempt_at<=NOW()`, [record.purchase_token]);
                }
            });
            if (error.status === 503) unavailable = true;
            else if (error.code !== 'INVALID_PURCHASE') throw error;
        }
    }
    if (unavailable) throw failure('PLAY_UNAVAILABLE', 503);
}

export async function googlePlayNotification(req, res, next) {
    try {
        if (!process.env.GOOGLE_PLAY_RTDN_AUDIENCE || !process.env.GOOGLE_PLAY_RTDN_EMAIL) throw failure('PLAY_NOT_CONFIGURED', 503);
        const bearer = req.headers.authorization?.replace(/^Bearer /, '');
        const decoded = jwt.decode(bearer ?? '', { complete: true });
        if (!decoded?.header.kid || decoded.header.alg !== 'RS256') throw failure('INVALID_NOTIFICATION', 401);
        if (!googleKeys || googleKeys.expires < Date.now()) {
            const jwks = await googleRequest('https://www.googleapis.com/oauth2/v3/certs');
            googleKeys = { keys: jwks.keys, expires: Date.now() + 3600000 };
        }
        const key = googleKeys.keys.find(k => k.kid === decoded.header.kid);
        if (!key) { googleKeys = null; throw failure('INVALID_NOTIFICATION', 401); }
        const identity = jwt.verify(bearer, createPublicKey({ key, format: 'jwk' }), {
            algorithms: ['RS256'], audience: process.env.GOOGLE_PLAY_RTDN_AUDIENCE, issuer: ['accounts.google.com','https://accounts.google.com'],
        });
        if (identity.email !== process.env.GOOGLE_PLAY_RTDN_EMAIL || identity.email_verified !== true) throw failure('INVALID_NOTIFICATION', 401);
        const data = JSON.parse(Buffer.from(req.body.message?.data ?? '', 'base64').toString('utf8'));
        if (data.packageName !== PACKAGE) throw failure('INVALID_NOTIFICATION', 400);
        if (data.subscriptionNotification?.purchaseToken) {
            const purchaseToken = data.subscriptionNotification.purchaseToken;
            const owner = await db.query('SELECT user_id,superseded_by FROM play_purchase_owners WHERE purchase_token=$1', [purchaseToken]);
            let userId = owner.rows[0]?.user_id;
            if (!userId) {
                // Recover purchases even when the app died before delivering its token.
                // Trust only the account identifier returned by Google's authenticated API.
                const token = await accessToken();
                const purchase = await googleRequest(
                    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
                    { headers: { Authorization: `Bearer ${token}` } },
                );
                const mapped = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId;
                if (typeof mapped !== 'string' || !/^[a-f0-9]{64}$/.test(mapped)) {
                    throw failure('PURCHASE_ACCOUNT_MISMATCH');
                }
                const account = await db.query(
                    "SELECT id FROM users WHERE encode(sha256(convert_to(id::text,'UTF8')),'hex')=$1 AND is_deleted=FALSE",
                    [mapped],
                );
                userId = account.rows[0]?.id;
                // A non-success response keeps Pub/Sub delivery retryable.
                if (!userId) throw failure('PURCHASE_ACCOUNT_MISMATCH');
            }
            // Reuse all ownership, linked-token, entitlement and acknowledgement checks.
            await verifyAndSavePurchase(userId, purchaseToken);
        }
        return res.status(204).end();
    } catch (error) { return next(error instanceof jwt.JsonWebTokenError ? failure('INVALID_NOTIFICATION', 401) : error); }
}
