import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const url = process.env.BILLING_TEST_DB_URL;
const enabled = Boolean(url && ['127.0.0.1', 'localhost'].includes(new URL(url).hostname));
const database = vi.hoisted(() => ({ pool: null }));
vi.mock('../../src/models/db.js', () => ({ default: {
    connect: (...args) => database.pool.connect(...args),
    query: (...args) => database.pool.query(...args),
} }));

describe.skipIf(!enabled)('Play billing disposable PostgreSQL', () => {
    let admin;
    let pool;
    let billing;
    const schema = 'billing_test_' + randomUUID().replaceAll('-', '');
    const user = randomUUID();
    const legacy = randomUUID();
    beforeAll(async () => {
        admin = new pg.Pool({ connectionString: url });
        await admin.query(`CREATE SCHEMA ${schema}`);
        const scoped = new URL(url);
        scoped.searchParams.set('options', '-csearch_path=' + schema + ',public');
        pool = new pg.Pool({ connectionString: scoped.toString() });
        database.pool = pool;
        billing = await import('../../src/services/play-billing.js');
        // Minimal real prerequisite schema avoids dependencies unrelated to billing.
        await pool.query('CREATE TABLE users(id UUID PRIMARY KEY)');
        await pool.query(await fs.readFile('src/database/migrations/009_user_subscriptions.sql', 'utf8'));
        await pool.query(await fs.readFile('src/database/migrations/015_verified_play_subscriptions.sql', 'utf8'));
        await pool.query('ALTER TABLE play_purchase_owners ADD COLUMN superseded_by TEXT');
        await pool.query('INSERT INTO users VALUES($1),($2)', [user, legacy]);
        await pool.query(`INSERT INTO user_subscriptions(user_id,product_id,purchase_token,status,provider_verified,expires_at)
            VALUES($1,'mirailink_plus','legacy','active',FALSE,NOW()+INTERVAL '2 days')`, [legacy]);
        await pool.query('ALTER TABLE user_subscriptions ADD COLUMN cancellation_intent_at TIMESTAMPTZ');
        const confirmationMigration = await fs.readFile('src/database/migrations/021_subscription_confirmation.sql', 'utf8');
        await pool.query(confirmationMigration);
        await pool.query(confirmationMigration);
    });
    afterAll(async () => {
        if (pool) await pool.end();
        if (admin) {
            await admin.query(`DROP SCHEMA ${schema} CASCADE`);
            await admin.end();
        }
    });

    it('preserves existing subscription data across repeated migrations', async () => {
        const rows = (await pool.query('SELECT purchase_token,provider_verified,acknowledgement_pending FROM user_subscriptions WHERE user_id=$1', [legacy])).rows;
        expect(rows).toEqual([{ purchase_token: 'legacy', provider_verified: false, acknowledgement_pending: false }]);
    });

    const purchase = (id, product = 'mirailink_plus', extra = {}) => ({
        subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
        externalAccountIdentifiers: { obfuscatedExternalAccountId: billing.accountHash(id) },
        lineItems: [{ productId: product, expiryTime: new Date(Date.now() + 86400000).toISOString(), autoRenewingPlan: { autoRenewEnabled: true } }], ...extra,
    });
    it('retains exactly one plan and rejects an unrelated purchase while it is active', async () => {
        await billing.verifyAndSavePurchase(user, 'plus', null, { queryPurchase: async () => purchase(user) });
        await expect(billing.verifyAndSavePurchase(user, 'independent', null, { queryPurchase: async () => purchase(user, 'mirailink_premium') })).rejects.toMatchObject({ code: 'PURCHASE_REPLACEMENT_REQUIRED' });
        expect((await pool.query('SELECT * FROM user_subscriptions WHERE user_id=$1', [user])).rows).toHaveLength(1);
    });
    it('accepts a Google replacement and never restores its old token', async () => {
        await billing.verifyAndSavePurchase(user, 'premium', null, { queryPurchase: async () => purchase(user, 'mirailink_premium', { linkedPurchaseToken: 'plus' }) });
        const stale = await billing.verifyAndSavePurchase(user, 'plus', null, { queryPurchase: async () => purchase(user) });
        expect(stale.product_id).toBe('mirailink_premium');
        await pool.query("UPDATE user_subscriptions SET expires_at=NOW()-INTERVAL '1 second' WHERE user_id=$1", [user]);
        const { subscriptionDto } = await import('../../src/dto/subscription.dto.js');
        expect(subscriptionDto((await pool.query('SELECT * FROM user_subscriptions WHERE user_id=$1', [user])).rows[0]).plan).toBe('free');
    });
    it('persists a failed confirmation in the same row and recovers after restart-compatible retry', async () => {
        const queryPurchase = async () => purchase(legacy, 'mirailink_plus', { acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING' });
        const first = await billing.verifyAndSavePurchase(legacy, 'retry', null, { queryPurchase, acknowledge: async () => { throw new Error('offline'); } });
        expect(first.acknowledgement_pending).toBe(true);
        await pool.query("UPDATE user_subscriptions SET acknowledgement_next_attempt_at=NOW()-INTERVAL '1 second' WHERE user_id=$1", [legacy]);
        const acknowledge = vi.fn();
        const result = await billing.verifyAndSavePurchase(legacy, 'retry', null, { queryPurchase, acknowledge });
        expect(acknowledge).toHaveBeenCalledOnce();
        expect(result.acknowledgement_pending).toBe(false);
    });
    it('preserves provider renewal when recording cancellation intent', async () => {
        const { cancelSubscriptionIntent } = await import('../../src/controllers/subscription.controller.js');
        const next = vi.fn();
        await cancelSubscriptionIntent({ user: { id: legacy } }, { json: vi.fn() }, next);
        expect(next).not.toHaveBeenCalled();
        const row = (await pool.query('SELECT * FROM user_subscriptions WHERE user_id=$1', [legacy])).rows[0];
        expect(row.auto_renewing).toBe(true);
        expect(row.cancellation_intent_at).toBeInstanceOf(Date);
    });
    it('rejects token reuse by another user', async () => {
        await expect(billing.verifyAndSavePurchase(legacy, 'premium', null, { queryPurchase: async () => purchase(legacy, 'mirailink_premium') })).rejects.toMatchObject({ code: 'PURCHASE_ALREADY_BOUND' });
    });
});
