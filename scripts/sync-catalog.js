import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { syncCatalog } from '../src/services/catalogSyncService.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(rootDir, '.env');
if (!process.env.DB_URL && fs.existsSync(envPath)) process.loadEnvFile(envPath);
if (!process.env.DB_URL) {
    console.error('❌ Error: La variable de entorno DB_URL es obligatoria.');
    process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DB_URL });

async function run() {
    try {
        const summary = await syncCatalog({ pool });
        console.log('🎉 Sincronizacion manual completada con exito:', summary);
    } catch (error) {
        console.error('❌ Error fatal en la sincronizacion:', error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

run();
