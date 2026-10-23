import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs/promises';
import jwt from 'jsonwebtoken';
const query = vi.fn();
const release = vi.fn();
vi.mock('../../../src/models/db.js', () => ({ default: { query, connect: async () => ({ query, release }) } }));
const { parsePlayPurchase, verifyAndSavePurchase, accountHash, googleRequest, reconcileSubscriptions, googlePlayNotification } = await import('../../../src/services/play-billing.js');
const user = '00000000-0000-4000-8000-000000000001';
const purchase = () => ({
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING',
    externalAccountIdentifiers: { obfuscatedExternalAccountId: accountHash(user) },
    lineItems: [{ productId: 'mirailink_plus', expiryTime: new Date(Date.now() + 86400000).toISOString(), offerDetails: { basePlanId: 'weekly-autorenew' } }],
});
let row;
beforeEach(() => {
    row = { user_id: user, purchase_token: 'token', product_id: 'mirailink_plus', status: 'active', provider_verified: true,
        expires_at: purchase().lineItems[0].expiryTime, acknowledgement_pending: true, revision: 'revision' };
    release.mockClear();
    query.mockReset();
    query.mockImplementation(async sql => {
        if (sql.includes('INSERT INTO user_subscriptions')) return { rows: [row] };
        if (sql.includes('FROM user_subscriptions WHERE user_id')) return { rows: [row] };
        if (sql.includes('SET acknowledgement_pending=FALSE')) {
            row = { ...row, acknowledgement_pending: false };
            return { rows: [row] };
        }
        return { rows: [] };
    });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('Google Play authority', () => {
    it.each(['SUBSCRIPTION_STATE_PENDING', 'SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_EXPIRED', 'SUBSCRIPTION_STATE_PAUSED', 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED'])('denies %s', state => {
        expect(parsePlayPurchase({ ...purchase(), subscriptionState: state }).status).toBe('expired');
    });
    it.each(['SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED', 'SUBSCRIPTION_STATE_ACTIVE'])('preserves access for %s during its paid term', state => {
        expect(parsePlayPurchase({ ...purchase(), subscriptionState: state }).status).toBe('active');
    });
    it('rejects product mismatch, invalid expiry and empty line items', () => {
        expect(() => parsePlayPurchase(purchase(), 'mirailink_premium')).toThrow();
        expect(() => parsePlayPurchase({ lineItems: [] })).toThrow();
        const p = purchase(); p.lineItems[0].expiryTime = 'bad';
        expect(() => parsePlayPurchase(p)).toThrow();
        p.lineItems[0].expiryTime = '2020-01-01T00:00:00Z';
        expect(parsePlayPurchase(p).status).toBe('expired');
    });
    it('stores a payment pending without expiry but never grants access', () => {
        const p = purchase(); delete p.lineItems[0].expiryTime;
        expect(parsePlayPurchase({ ...p, subscriptionState: 'SUBSCRIPTION_STATE_PENDING' })).toMatchObject({ expiresAt: null, status: 'expired' });
    });
    it('rejects a token already attached to someone else without saving', async () => {
        query.mockImplementation(async sql => ({ rows: sql.startsWith('SELECT user_id') ? [{ user_id: 'someone-else' }] : [] }));
        await expect(verifyAndSavePurchase(user, 'token', null, { queryPurchase: async () => purchase() })).rejects.toMatchObject({ code: 'PURCHASE_ALREADY_BOUND' });
        expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO user_subscriptions'))).toBe(false);
        expect(query).toHaveBeenCalledWith('ROLLBACK');
        expect(release).toHaveBeenCalledOnce();
    });
    it('rejects a new token with an absent or incorrect account binding', async () => {
        for (const identifiers of [undefined, { obfuscatedExternalAccountId: 'wrong' }]) {
            await expect(verifyAndSavePurchase(user, 'token', null, { queryPurchase: async () => ({ ...purchase(), externalAccountIdentifiers: identifiers }) })).rejects.toMatchObject({ code: 'PURCHASE_ACCOUNT_MISMATCH' });
        }
    });
    it('stores provider expiry and acknowledges only after commit', async () => {
        const providerPurchase = purchase();
        const acknowledge = vi.fn(async () => { expect(query.mock.calls.at(-1)[0]).toBe('COMMIT'); });
        const result = await verifyAndSavePurchase(user, 'token', 'mirailink_plus', { queryPurchase: async () => providerPurchase, acknowledge });
        const values = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO user_subscriptions'))[1];
        expect(values[7]).toBe(providerPurchase.lineItems[0].expiryTime);
        expect(acknowledge).toHaveBeenCalledOnce();
        expect(result.acknowledgement_pending).toBe(false);
    });
    it('returns the committed purchase with a durable pending after acknowledgement failure', async () => {
        const result = await verifyAndSavePurchase(user, 'token', null, { queryPurchase: async () => purchase(), acknowledge: async () => { throw new Error('network'); } });
        expect(result.acknowledgement_pending).toBe(true);
        expect(query.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(false);
    });
    it.each([200, 204])('accepts the real acknowledge transport with HTTP %s and an empty body', async status => {
        const fetch = vi.fn().mockResolvedValue(new Response(null, { status }));
        vi.stubGlobal('fetch', fetch);
        const result = await verifyAndSavePurchase(user, 'token', null, { queryPurchase: async () => purchase() });
        expect(fetch.mock.calls[0][0]).toContain(':acknowledge');
        expect(result.acknowledgement_pending).toBe(false);
    });
    it('rejects self-linked tokens', async () => {
        await expect(verifyAndSavePurchase(user, 'token', null, { queryPurchase: async () => ({ ...purchase(), linkedPurchaseToken: 'token' }) })).rejects.toMatchObject({ code: 'INVALID_PURCHASE' });
    });
});

describe('Google HTTP transport', () => {
    it('requires valid JSON for data operations', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('')).mockResolvedValueOnce(new Response('{bad')).mockResolvedValueOnce(Response.json({ ok: true })));
        await expect(googleRequest('https://example.test')).rejects.toMatchObject({ code: 'PLAY_UNAVAILABLE' });
        await expect(googleRequest('https://example.test')).rejects.toMatchObject({ code: 'PLAY_UNAVAILABLE' });
        await expect(googleRequest('https://example.test')).resolves.toEqual({ ok: true });
    });
    it.each([[400, 'INVALID_PURCHASE'], [404, 'INVALID_PURCHASE'], [401, 'PLAY_UNAVAILABLE'], [500, 'PLAY_UNAVAILABLE']])('normalizes HTTP %s', async (status, code) => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })));
        await expect(googleRequest('https://example.test')).rejects.toMatchObject({ code });
    });
    it('normalizes transport timeouts', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
        await expect(googleRequest('https://example.test')).rejects.toMatchObject({ code: 'PLAY_UNAVAILABLE', status: 503 });
    });
    it('handles an empty reconciliation batch', async () => {
        await reconcileSubscriptions();
        expect(query.mock.calls[0][0]).toContain('WITH pending AS');
    });
});

describe('Google authenticated notifications', () => {
    it('rejects missing configuration and invalid notification identity', async () => {
        vi.stubEnv('GOOGLE_PLAY_RTDN_AUDIENCE', '');
        const next = vi.fn();
        await googlePlayNotification({ headers: {} }, {}, next);
        expect(next.mock.calls[0][0]).toMatchObject({ code: 'PLAY_NOT_CONFIGURED' });
        vi.stubEnv('GOOGLE_PLAY_RTDN_AUDIENCE', 'https://fixture.test/notifications');
        vi.stubEnv('GOOGLE_PLAY_RTDN_EMAIL', 'pubsub@example.test');
        await googlePlayNotification({ headers: { authorization: 'Bearer invalid' } }, {}, next);
        expect(next.mock.calls[1][0]).toMatchObject({ code: 'INVALID_NOTIFICATION' });
    });
    it('requeries Google for an owned token after verifying OIDC signature, audience and email', async () => {
        const audience = 'https://fixture.test/notifications';
        const email = 'pubsub@example.test';
        vi.stubEnv('GOOGLE_PLAY_RTDN_AUDIENCE', audience);
        vi.stubEnv('GOOGLE_PLAY_RTDN_EMAIL', email);
        vi.stubEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_FILE', 'fixture.json');
        const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
        const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'fixture-key' };
        vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify({ client_email: email, private_key: privateKey.export({ format: 'pem', type: 'pkcs8' }) }));
        const fetch = vi.fn(async url => {
            if (url.includes('/certs')) return Response.json({ keys: [jwk] });
            if (url.includes('oauth2.googleapis.com/token')) return Response.json({ access_token: 'fixture-access', expires_in: 3600 });
            return Response.json({ ...purchase(), acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' });
        });
        vi.stubGlobal('fetch', fetch);
        const base = query.getMockImplementation();
        query.mockImplementation((sql, args) => sql.startsWith('SELECT user_id,superseded_by') ? { rows: [{ user_id: user }] } : base(sql, args));
        const bearer = jwt.sign({ email, email_verified: true }, privateKey, { algorithm: 'RS256', keyid: jwk.kid,
            issuer: 'https://accounts.google.com', audience, expiresIn: 300 });
        const req = { headers: { authorization: 'Bearer ' + bearer }, body: { message: {
            data: Buffer.from(JSON.stringify({ packageName: 'com.feryaeljustice.mirailink', subscriptionNotification: { purchaseToken: 'token' } })).toString('base64'),
        } } };
        const res = { status: vi.fn().mockReturnThis(), end: vi.fn() };
        const next = vi.fn();
        await googlePlayNotification(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(204);
        expect(fetch.mock.calls.some(([url]) => url.includes('/subscriptionsv2/tokens/token'))).toBe(true);
        const wrongEmail = jwt.sign({ email: 'other@example.test', email_verified: true }, privateKey, { algorithm: 'RS256', keyid: jwk.kid,
            issuer: 'https://accounts.google.com', audience, expiresIn: 300 });
        await googlePlayNotification({ ...req, headers: { authorization: 'Bearer ' + wrongEmail } }, res, next);
        expect(next.mock.calls[0][0]).toMatchObject({ code: 'INVALID_NOTIFICATION' });
    });
});

describe('Recovery of unregistered Play tokens', () => {
    it.each(['valid', 'missing-account', 'unknown-account', 'google-unavailable'])('handles %s without silently discarding the token', async scenario => {
        vi.resetModules();
        const { googlePlayNotification: notify } = await import('../../../src/services/play-billing.js');
        const audience = 'https://fixture.test/notifications';
        const email = 'pubsub@example.test';
        vi.stubEnv('GOOGLE_PLAY_RTDN_AUDIENCE', audience);
        vi.stubEnv('GOOGLE_PLAY_RTDN_EMAIL', email);
        vi.stubEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_FILE', 'fixture.json');
        const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
        const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'recovery-key' };
        vi.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify({
            client_email: email, private_key: privateKey.export({ format: 'pem', type: 'pkcs8' }),
        }));
        const provider = purchase();
        if (scenario === 'missing-account') delete provider.externalAccountIdentifiers;
        const fetch = vi.fn(async url => {
            if (url.includes('/certs')) return Response.json({ keys: [jwk] });
            if (url.includes('oauth2.googleapis.com/token')) return Response.json({ access_token: 'fixture-access', expires_in: 3600 });
            if (scenario === 'google-unavailable') return new Response(null, { status: 503 });
            if (url.endsWith(':acknowledge')) return new Response(null, { status: 204 });
            return Response.json(provider);
        });
        vi.stubGlobal('fetch', fetch);
        const base = query.getMockImplementation();
        query.mockImplementation((sql, args) => sql.startsWith('SELECT id FROM users')
            ? { rows: scenario === 'unknown-account' ? [] : [{ id: user }] } : base(sql, args));
        const bearer = jwt.sign({ email, email_verified: true }, privateKey, {
            algorithm: 'RS256', keyid: jwk.kid, issuer: 'https://accounts.google.com', audience, expiresIn: 300,
        });
        const req = { headers: { authorization: 'Bearer ' + bearer }, body: { message: {
            data: Buffer.from(JSON.stringify({
                packageName: 'com.feryaeljustice.mirailink', subscriptionNotification: { purchaseToken: 'token' },
            })).toString('base64'),
        } } };
        const res = { status: vi.fn().mockReturnThis(), end: vi.fn() };
        const next = vi.fn();
        await notify(req, res, next);
        if (scenario === 'valid') {
            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(204);
            expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT id FROM users'), [accountHash(user)]);
            expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO user_subscriptions'))).toBe(true);
            expect(fetch.mock.calls.some(([url]) => url.endsWith(':acknowledge'))).toBe(true);
            expect(row.acknowledgement_pending).toBe(false);
        } else {
            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                code: scenario === 'google-unavailable' ? 'PLAY_UNAVAILABLE' : 'PURCHASE_ACCOUNT_MISMATCH',
            }));
            expect(res.status).not.toHaveBeenCalled();
            expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO user_subscriptions'))).toBe(false);
            expect(fetch.mock.calls.some(([url]) => url.endsWith(':acknowledge'))).toBe(false);
        }
    });
});
