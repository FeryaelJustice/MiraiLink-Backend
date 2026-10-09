import fs from 'node:fs';
import pg from 'pg';
import { cleanupLegacyTestUsers } from './test-scenarios.js';
if (!process.env.DB_URL && fs.existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.DB_URL) throw new Error('DB_URL required');
const pool=new pg.Pool({connectionString:process.env.DB_URL});
const client=await pool.connect();
try {
    await client.query('BEGIN');
    console.log('Cuentas auxiliares erroneas eliminadas: '+await cleanupLegacyTestUsers(client));
    await client.query('COMMIT');
} catch(error) {
    await client.query('ROLLBACK'); console.error(error.message); process.exitCode=1;
} finally { client.release(); await pool.end(); }
