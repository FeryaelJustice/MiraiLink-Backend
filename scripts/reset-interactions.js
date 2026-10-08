import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Cargar variables de entorno si DB_URL no esta definida
if (!process.env.DB_URL) {
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
        process.loadEnvFile(envPath);
    }
}

if (!process.env.DB_URL) {
    console.error('❌ Error: DB_URL no esta definida en .env.');
    process.exit(1);
}

export async function resetInteractions(pool) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('🧹 Limpiando mensajes y chats...');
        // Limpiar mensajes y chats (chat_members se elimina en cascada o con chats)
        const messagesRes = await client.query('DELETE FROM messages;');
        const chatMembersRes = await client.query('DELETE FROM chat_members;');
        const chatsRes = await client.query('DELETE FROM chats;');

        console.log('🧹 Limpiando matches, likes y dislikes...');
        const matchesRes = await client.query('DELETE FROM matches;');
        const likesRes = await client.query('DELETE FROM likes;');
        const dislikesRes = await client.query('DELETE FROM dislikes;');

        console.log('🧹 Limpiando afinidades (solicitudes, recomendaciones y lotes)...');
        const affinityRequestsRes = await client.query('DELETE FROM affinity_requests;');
        const affinityRecommendationsRes = await client.query('DELETE FROM affinity_recommendations;');
        const affinityBatchesRes = await client.query('DELETE FROM affinity_batches;');
        const affinityOutboxRes = await client.query('DELETE FROM affinity_outbox;');

        await client.query('COMMIT');

        console.log('✅ Interacciones restablecidas correctamente:');
        console.log(`   - Mensajes eliminados: ${messagesRes.rowCount ?? 0}`);
        console.log(`   - Miembros de chat eliminados: ${chatMembersRes.rowCount ?? 0}`);
        console.log(`   - Chats eliminados: ${chatsRes.rowCount ?? 0}`);
        console.log(`   - Matches eliminados: ${matchesRes.rowCount ?? 0}`);
        console.log(`   - Likes eliminados: ${likesRes.rowCount ?? 0}`);
        console.log(`   - Dislikes eliminados: ${dislikesRes.rowCount ?? 0}`);
        console.log(`   - Solicitudes de afinidad eliminadas: ${affinityRequestsRes.rowCount ?? 0}`);
        console.log(`   - Recomendaciones de afinidad eliminadas: ${affinityRecommendationsRes.rowCount ?? 0}`);
        console.log(`   - Lotes de afinidad eliminados: ${affinityBatchesRes.rowCount ?? 0}`);
        console.log(`   - Notificaciones outbox de afinidad eliminadas: ${affinityOutboxRes.rowCount ?? 0}`);
        console.log('ℹ️ Perfiles, fotos, intereses, ubicaciones y cuentas se han conservado intactos.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error al resetear las interacciones:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

// Ejecutar si se invoca directamente desde CLI
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun) {
    const pool = new pg.Pool({ connectionString: process.env.DB_URL });
    resetInteractions(pool)
        .then(async () => {
            await pool.end();
            process.exit(0);
        })
        .catch(async () => {
            await pool.end().catch(() => {});
            process.exit(1);
        });
}
