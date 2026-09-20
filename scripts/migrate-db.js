import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(rootDir, '.env');
if (!process.env.DB_URL && fs.existsSync(envPath)) process.loadEnvFile(envPath);
if (!process.env.DB_URL) throw new Error('DB_URL environment variable is required.');

const migrationsDir = path.join(rootDir, 'src', 'database', 'migrations');
const pool = new pg.Pool({ connectionString: process.env.DB_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('SELECT pg_advisory_lock(hashtext($1))', ['mirailink-db-migrations']);
        await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
        const applied = new Set((await client.query('SELECT filename FROM schema_migrations')).rows.map(row => row.filename));
        const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort();
        for (const filename of files) {
            if (applied.has(filename)) continue;
            await client.query(fs.readFileSync(path.join(migrationsDir, filename), 'utf8'));
            await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
            console.log(`Applied migration ${filename}`);
        }
    } finally {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', ['mirailink-db-migrations']).catch(() => {});
        client.release();
        await pool.end();
    }
}

migrate().catch(error => {
    console.error('Database migration failed:', error);
    process.exitCode = 1;
});
