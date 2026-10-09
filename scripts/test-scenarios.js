import fs from 'node:fs';
import pg from 'pg';

export async function cleanupLegacyTestUsers(client) {
    // Exact signature of the accidental generator. Never match the prefix alone.
    const ids = (await client.query(`SELECT id FROM users WHERE username ~ '^mltest_[a-f0-9]{16}_[0-9]+$'
        AND email=username || '@example.invalid' AND bio='Perfil simulado de prueba'`)).rows.map(row=>row.id);
    if (!ids.length) return 0;
    await client.query(`DELETE FROM affinity_requests WHERE from_user_id=ANY($1::uuid[]) OR to_user_id=ANY($1::uuid[])
        OR recommendation_id IN (SELECT id FROM affinity_recommendations WHERE user_id=ANY($1::uuid[]) OR target_id=ANY($1::uuid[]))`, [ids]);
    await client.query('DELETE FROM affinity_recommendations WHERE user_id=ANY($1::uuid[]) OR target_id=ANY($1::uuid[])', [ids]);
    const chats = (await client.query(`SELECT DISTINCT c.id FROM chats c JOIN chat_members m ON m.chat_id=c.id
        WHERE c.type='private' AND m.user_id=ANY($1::uuid[])`, [ids])).rows.map(row=>row.id);
    await client.query('DELETE FROM capsule_sessions WHERE user1_id=ANY($1::uuid[]) OR user2_id=ANY($1::uuid[])', [ids]);
    await client.query('UPDATE affinity_requests SET chat_id=NULL WHERE chat_id=ANY($1::uuid[])', [chats]);
    await client.query('DELETE FROM chats WHERE id=ANY($1::uuid[])', [chats]);
    const result = await client.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [ids]);
    return result.rowCount;
}

export async function scenarioUsers(client) {
    const users = (await client.query(`SELECT id,username FROM users WHERE is_deleted=FALSE AND is_verified=TRUE
        AND birthdate<=CURRENT_DATE-INTERVAL '18 years' ORDER BY id`)).rows;
    if (users.length < 13) throw new Error('El reparto completo requiere las 13 cuentas originales de db:seed. No se crearan usuarios adicionales.');
    return users;
}

export function peerAt(users, index, offset) {
    return users[(index + offset + users.length) % users.length];
}

export async function runScenario(work) {
    if (!process.env.DB_URL && fs.existsSync('.env')) process.loadEnvFile('.env');
    if (!process.env.DB_URL) throw new Error('DB_URL required');
    if (process.env.NODE_ENV === 'production') throw new Error('Los escenarios de test requieren un entorno de desarrollo.');
    const pool = new pg.Pool({ connectionString: process.env.DB_URL });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await cleanupLegacyTestUsers(client);
        const users = await scenarioUsers(client);
        await work(client, users);
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}
