import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
if (!process.env.DB_URL) {
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
        process.loadEnvFile(envPath);
    }
}

if (!process.env.DB_URL) {
    console.error('❌ Error: DB_URL is not defined in .env.');
    process.exit(1);
}

async function resetDatabase() {
    // 0. Ensure target database exists
    const urlObj = new URL(process.env.DB_URL);
    const targetDbName = urlObj.pathname.replace(/^\//, '');
    const adminUrlObj = new URL(process.env.DB_URL);
    adminUrlObj.pathname = '/postgres';

    const adminClient = new pg.Client({ connectionString: adminUrlObj.toString() });
    try {
        await adminClient.connect();
        const checkDb = await adminClient.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [targetDbName],
        );
        if (checkDb.rowCount === 0) {
            console.log(`📦 Creando base de datos "${targetDbName}"...`);
            await adminClient.query(`CREATE DATABASE "${targetDbName}"`);
            console.log(`✅ Base de datos "${targetDbName}" creada.`);
        }
    } catch (err) {
        console.warn('⚠️ No se pudo verificar la creación de DB con postgres DB:', err.message);
    } finally {
        await adminClient.end().catch(() => {});
    }

    const pool = new pg.Pool({
        connectionString: process.env.DB_URL,
    });
    const client = await pool.connect();
    try {
        console.log('🔄 Restableciendo esquema de base de datos...');

        // 1. Limpiar esquema público por completo
        await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
        await client.query('CREATE SCHEMA public;');
        await client.query('GRANT ALL ON SCHEMA public TO public;');
        console.log('✅ Esquema public reiniciado.');

        // 2. Ejecutar db.sql (DDL: Tablas, Índices, Enums)
        const dbSqlPath = path.join(rootDir, 'src', 'database', 'db.sql');
        const dbSql = fs.readFileSync(dbSqlPath, 'utf8');
        await client.query(dbSql);
        console.log('✅ Esquema DDL aplicado con éxito (db.sql).');

        // 3. Ejecutar db_inserts.sql (Catálogos: Games, Animes, Mangas, etc.)
        const dbInsertsPath = path.join(rootDir, 'src', 'database', 'db_inserts.sql');
        if (fs.existsSync(dbInsertsPath)) {
            const dbInsertsSql = fs.readFileSync(dbInsertsPath, 'utf8');
            await client.query(dbInsertsSql);
            console.log('✅ Catálogos iniciales insertados (db_inserts.sql).');
        }

        console.log('✨ Base de datos restablecida correctamente.');
    } catch (error) {
        console.error('❌ Error al restablecer la base de datos:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

resetDatabase();
