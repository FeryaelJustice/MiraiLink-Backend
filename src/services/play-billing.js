import fs from 'node:fs/promises';
import { createHash, createPublicKey } from 'node:crypto';
import jwt from 'jsonwebtoken';
import db from '../models/db.js';
import { AppError } from '../errors/AppError.js';

const PACKAGE = 'com.feryaeljustice.mirailink';
const PRODUCTS = ['mirailink_plus', 'mirailink_premium'];
let oauth;
let googleKeys;
const failure = (code, status = 403) => new AppError({ code, status, message: code });
export const accountHash = id => createHash('sha256').update(id).digest('hex');

async function googleRequest(url, options = {}) {
    let response;
    try { response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) }); }
    catch (cause) { throw new AppError({ code: 'PLAY_UNAVAILABLE', status: 503, cause }); }
    if (!response.ok) throw failure(response.status === 400 || response.status === 404 ? 'INVALID_PURCHASE' : 'PLAY_UNAVAILABLE', response.status === 400 || response.status === 404 ? 403 : 503);
    return response.status === 204 ? {} : response.json();
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
    oauth = { token: response.access_token, expires: Date.now() + response.expires_in * 1000 };
    return oauth.token;
}

export function parsePlayPurchase(purchase, expectedProduct) {
    const items = (purchase.lineItems ?? []).filter(item => PRODUCTS.includes(item.productId));
    const item = items.sort((a, b) => new Date(b.expiryTime) - new Date(a.expiryTime))[0];
    if (!item || (expectedProduct && item.productId !== expectedProduct) || !Number.isFinite(Date.parse(item.expiryTime))) throw failure('INVALID_PURCHASE');
    const entitled = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED'].includes(purchase.subscriptionState)
        && Date.parse(item.expiryTime) > Date.now();
    return {
        productId: item.productId, basePlanId: item.offerDetails?.basePlanId ?? 'monthly-autorenew',
        status: entitled ? 'active' : 'expired', state: purchase.subscriptionState,
        expiresAt: item.expiryTime, autoRenewing: Boolean(item.autoRenewingPlan?.autoRenewEnabled),
        orderId: item.latestSuccessfulOrderId ?? purchase.latestOrderId ?? null,
    };
}

export async function verifyAndSavePurchase(userId, purchaseToken, expectedProduct, { queryPurchase, acknowledge } = {}) {
    const token = queryPurchase ? null : await accessToken();
    const endpoint = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const purchase = queryPurchase ? await queryPurchase(purchaseToken) : await googleRequest(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    const state = parsePlayPurchase(purchase, expectedProduct);
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['play-account:' + userId]);
        const owner = await client.query('SELECT user_id,superseded_by FROM play_purchase_owners WHERE purchase_token=$1', [purchaseToken]);
        if (owner.rows[0] && owner.rows[0].user_id !== userId) throw failure('PURCHASE_ALREADY_BOUND');
        if(owner.rows[0]?.superseded_by) {
            const current=await client.query('SELECT * FROM user_subscriptions WHERE user_id=$1',[userId]);
            await client.query('COMMIT');return current.rows[0];
        }
        const mapped = purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId;
        if (mapped ? mapped !== accountHash(userId) : !owner.rows[0]) throw failure('PURCHASE_ACCOUNT_MISMATCH');
        if (purchase.linkedPurchaseToken) {
            const linked = await client.query('SELECT user_id,superseded_by FROM play_purchase_owners WHERE purchase_token=$1', [purchase.linkedPurchaseToken]);
            if (linked.rows[0] && linked.rows[0].user_id !== userId) throw failure('PURCHASE_ALREADY_BOUND');
        }
        await client.query('INSERT INTO play_purchase_owners(purchase_token,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [purchaseToken, userId]);
        if(purchase.linkedPurchaseToken)await client.query('INSERT INTO play_purchase_owners(purchase_token,user_id,superseded_by) VALUES($1,$2,$3) ON CONFLICT(purchase_token) DO UPDATE SET superseded_by=EXCLUDED.superseded_by',[purchase.linkedPurchaseToken,userId,purchaseToken]);
        const result = await client.query(`INSERT INTO user_subscriptions(user_id,product_id,base_plan_id,purchase_token,order_id,status,auto_renewing,expires_at,last_verified_at,updated_at,provider_verified,provider_state)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW(),TRUE,$9)
            ON CONFLICT(user_id) DO UPDATE SET product_id=EXCLUDED.product_id,base_plan_id=EXCLUDED.base_plan_id,purchase_token=EXCLUDED.purchase_token,
            order_id=EXCLUDED.order_id,status=EXCLUDED.status,auto_renewing=EXCLUDED.auto_renewing,expires_at=EXCLUDED.expires_at,
            last_verified_at=NOW(),updated_at=NOW(),provider_verified=TRUE,provider_state=EXCLUDED.provider_state RETURNING *`,
        [userId,state.productId,state.basePlanId,purchaseToken,state.orderId,state.status,state.autoRenewing,state.expiresAt,state.state]);
        await client.query('COMMIT');
        if (state.status === 'active' && purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING') {
            if (acknowledge) await acknowledge(purchaseToken);
            else await googleRequest(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}/purchases/subscriptions/${state.productId}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`, {
                method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}',
            });
        }
        return result.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally { client.release(); }
}

export async function reconcileSubscriptions() {
    const records = await db.query('SELECT user_id,purchase_token FROM user_subscriptions WHERE last_verified_at < NOW()-INTERVAL \'1 hour\' ORDER BY last_verified_at LIMIT 100');
    for (const record of records.rows) {
        try { await verifyAndSavePurchase(record.user_id, record.purchase_token); }
        catch (error) {
            if (error.code === 'INVALID_PURCHASE') await db.query('UPDATE user_subscriptions SET status=\'expired\',provider_verified=FALSE,last_verified_at=NOW() WHERE purchase_token=$1', [record.purchase_token]);
            else if (error.status === 503) throw error;
        }
    }
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
            if (owner.rows[0]) await verifyAndSavePurchase(owner.rows[0].user_id, purchaseToken);
        }
        return res.status(204).end();
    } catch (error) { return next(error instanceof jwt.JsonWebTokenError ? failure('INVALID_NOTIFICATION', 401) : error); }
}
