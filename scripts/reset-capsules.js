import fs from 'node:fs';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function resetCapsules(client) {
    const sessions = (await client.query('DELETE FROM capsule_sessions RETURNING match_id,chat_id')).rows;
    const chats = sessions.map(row=>row.chat_id).filter(Boolean);
    const matches = sessions.map(row=>row.match_id).filter(Boolean);
    await client.query('UPDATE affinity_requests SET chat_id=NULL WHERE chat_id=ANY($1::uuid[])', [chats]);
    await client.query('DELETE FROM messages WHERE chat_id=ANY($1::uuid[])', [chats]);
    await client.query('DELETE FROM chat_members WHERE chat_id=ANY($1::uuid[])', [chats]);
    await client.query('DELETE FROM chats WHERE id=ANY($1::uuid[])', [chats]);
    await client.query('DELETE FROM matches WHERE id=ANY($1::uuid[])', [matches]);
    await client.query("DELETE FROM likes WHERE discovery_mode='capsule'");
    await client.query("DELETE FROM dislikes WHERE discovery_mode='capsule'");
    return sessions.length;
}

if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
    if (!process.env.DB_URL && fs.existsSync('.env')) process.loadEnvFile('.env');
    if (!process.env.DB_URL) throw new Error('DB_URL required');
    const pool = new pg.Pool({connectionString:process.env.DB_URL});
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const count = await resetCapsules(client);
        await client.query('COMMIT');
        console.log(`Capsules reiniciadas: ${count}. Cuentas y perfiles conservados.`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error.message);
        process.exitCode=1;
    } finally { client.release(); await pool.end(); }
}
