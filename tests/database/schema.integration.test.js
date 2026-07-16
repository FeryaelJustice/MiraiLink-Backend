import fs from 'node:fs/promises';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const required = process.env.REQUIRE_DATABASE_TESTS === 'true';
const suite = required ? describe : describe.skip;

suite('PostgreSQL security schema', () => {
    const pool = new pg.Pool({ connectionString: process.env.DB_URL });

    beforeAll(async () => {
        const baseline = await fs.readFile('src/database/db.sql', 'utf8');
        const migration = await fs.readFile('src/database/migrations/002_security_hardening.sql', 'utf8');
        await pool.query(baseline);
        await pool.query(migration);
    }, 30_000);

    afterAll(() => pool.end());

    it('stores revocation expiry and hashes instead of plaintext recovery codes', async () => {
        const columns = await pool.query(
            `SELECT table_name, column_name FROM information_schema.columns
             WHERE (table_name = 'token_blacklist' AND column_name = 'expires_at')
                OR (table_name = 'recovery_codes' AND column_name IN ('code', 'code_hash'))`,
        );
        expect(columns.rows).toContainEqual({ table_name: 'token_blacklist', column_name: 'expires_at' });
        expect(columns.rows).toContainEqual({ table_name: 'recovery_codes', column_name: 'code_hash' });
        expect(columns.rows).not.toContainEqual({ table_name: 'recovery_codes', column_name: 'code' });
    });
});
