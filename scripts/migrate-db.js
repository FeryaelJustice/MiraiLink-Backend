import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { runMigrations } from '../src/database/migrator.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(rootDir, '.env');
if (!process.env.DB_URL && fs.existsSync(envPath)) process.loadEnvFile(envPath);
if (!process.env.DB_URL) throw new Error('DB_URL environment variable is required.');

const pool = new pg.Pool({ connectionString: process.env.DB_URL });

runMigrations(pool)
    .then(async () => {
        console.log('[DB Migrations] All migrations verified successfully.');
        await pool.end();
    })
    .catch(async error => {
        console.error('Database migration failed:', error);
        await pool.end().catch(() => {});
        process.exitCode = 1;
    });
