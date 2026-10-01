import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(currentDir, 'migrations');

/**
 * Serializa migraciones con advisory lock de sesión y procesa filenames en orden.
 * Requiere baseline previo. El registro del filename ocurre después del SQL y no comparte su COMMIT.
 */
export async function runMigrations(pool) {
    const client = await pool.connect();
    try {
        await client.query('SELECT pg_advisory_lock(hashtext($1))', ['mirailink-db-migrations']);
        await client.query(
            'CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())',
        );
        const applied = new Set(
            (await client.query('SELECT filename FROM schema_migrations')).rows.map(row => row.filename),
        );
        if (!fs.existsSync(migrationsDir)) return;
        const files = fs.readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort();
        for (const filename of files) {
            if (applied.has(filename)) continue;
            const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
            console.log(`[DB Migrations] Applied migration ${filename}`);
        }
    } catch (error) {
        console.error('[DB Migrations] Error running migrations:', error);
        throw error;
    } finally {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', ['mirailink-db-migrations']).catch(() => {});
        client.release();
    }
}
