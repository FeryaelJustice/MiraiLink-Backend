import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { rankCandidate, complete } from '../src/services/affinity-engine.js';
import { profile } from '../src/services/affinity-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Cargar variables de entorno si no estan presentes
if (!process.env.DB_URL) {
    const envPath = path.join(rootDir, '.env');
    if (fs.existsSync(envPath)) {
        process.loadEnvFile(envPath);
    }
}

if (!process.env.DB_URL) {
    console.error('❌ Error: DB_URL no esta definida.');
    process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DB_URL });

async function seedAffinitiesTest() {
    const client = await pool.connect();
    try {
        console.log('🔮 Generando escenario de prueba de Afinidades en base de datos real...');
        await client.query('BEGIN');

        // Obtener todos los usuarios no eliminados y verificados
        const usersRes = await client.query(`
            SELECT id, username, nickname FROM users 
            WHERE is_deleted = FALSE AND is_verified = TRUE 
            ORDER BY created_at ASC
        `);

        if (usersRes.rows.length < 2) {
            console.log('⚠️ Se necesitan al menos 2 usuarios en la base de datos para generar afinidades.');
            await client.query('ROLLBACK');
            return;
        }

        console.log(`ℹ️ Usuarios disponibles para emparejar: ${usersRes.rows.length}`);

        // Asegurar que todos tengan affinity_preferences configurado y activo
        for (const u of usersRes.rows) {
            await client.query(`
                INSERT INTO affinity_preferences(user_id, enabled, observed_since, last_active_at)
                VALUES($1, TRUE, NOW() - INTERVAL '14 days', NOW())
                ON CONFLICT(user_id) DO UPDATE SET
                    enabled = TRUE,
                    observed_since = LEAST(affinity_preferences.observed_since, NOW() - INTERVAL '14 days'),
                    last_active_at = NOW()
            `, [u.id]);
        }

        let totalRecommendations = 0;
        let totalAffinityLikes = 0;
        let totalConversationRequests = 0;

        for (let i = 0; i < usersRes.rows.length; i++) {
            const user = usersRes.rows[i];
            const a = await profile(client, user.id, 'es');
            if (!a || !complete(a)) continue;

            // Buscar candidatos compatibles ignorando ventana estricta de 7 días para pruebas
            const candidateIds = await client.query(`
                SELECT u.id FROM users u
                WHERE u.id <> $1 AND u.is_deleted = FALSE AND u.is_verified = TRUE
                  AND NOT EXISTS (SELECT 1 FROM likes WHERE (from_user_id=$1 AND to_user_id=u.id) OR (from_user_id=u.id AND to_user_id=$1))
                  AND NOT EXISTS (SELECT 1 FROM dislikes WHERE (from_user_id=$1 AND to_user_id=u.id) OR (from_user_id=u.id AND to_user_id=$1))
                  AND NOT EXISTS (SELECT 1 FROM user_blocks WHERE (user_id=$1 AND target_id=u.id) OR (user_id=u.id AND target_id=$1))
                  AND NOT EXISTS (SELECT 1 FROM reports WHERE (reported_by=$1 AND reported_user=u.id) OR (reported_by=u.id AND reported_user=$1))
                  AND NOT EXISTS (SELECT 1 FROM matches WHERE user1_id=LEAST($1::uuid,u.id) AND user2_id=GREATEST($1::uuid,u.id))
                  AND NOT EXISTS (SELECT 1 FROM affinity_requests WHERE ((from_user_id=$1 AND to_user_id=u.id) OR (from_user_id=u.id AND to_user_id=$1)) AND state IN ('pending','accepted','rejected','blocked'))
            `, [user.id]);

            const ranked = [];
            for (const cand of candidateIds.rows) {
                const b = await profile(client, cand.id, 'es');
                // En modo prueba, simulamos actividad reciente para rankCandidate
                if (b) b.last_active_at = new Date().toISOString();
                const rank = b && rankCandidate(a, b);
                if (rank) ranked.push({ ...rank, target: b });
            }

            ranked.sort((x, y) => y.score - x.score);

            if (ranked.length === 0) continue;

            // 1. Si hay al menos un candidato, generar "Interés recibido" con Like desde afinidades
            if (ranked.length >= 1) {
                const likePeer = ranked[0];
                const likeRes = await client.query(`
                    INSERT INTO likes(from_user_id, to_user_id, origin, created_at)
                    VALUES($1, $2, 'affinity', NOW())
                    ON CONFLICT DO NOTHING RETURNING id
                `, [likePeer.targetId, user.id]);
                if (likeRes.rowCount > 0) totalAffinityLikes++;
            }

            // 2. Si hay al menos dos candidatos, generar "Interés recibido" con Invitación a conversar (Mensaje)
            if (ranked.length >= 2) {
                const reqPeer = ranked[1];
                const dummyBatch = await client.query(
                    'INSERT INTO affinity_batches(user_id, created_at, expires_at) VALUES($1, NOW(), NOW() + INTERVAL \'7 days\') RETURNING id',
                    [reqPeer.targetId]
                );
                const recRes = await client.query(`
                    INSERT INTO affinity_recommendations(batch_id, user_id, target_id, common_keys, score, state)
                    VALUES($1, $2, $3, $4, $5, 'requested')
                    RETURNING id
                `, [dummyBatch.rows[0].id, reqPeer.targetId, user.id, JSON.stringify(reqPeer.commonKeys), reqPeer.score]);

                const reqId = recRes.rows[0]?.id;
                if (reqId) {
                    const sampleMessages = [
                        '¡Hola! Vi que también te encanta el anime y los RPGs. ¿Qué juegas últimamente?',
                        '¡Buenas! Compartimos gustos muy parecidos, ¿te apetece hablar un rato?',
                        '¡Hey! Tenemos varias aficiones en común, ¿echamos unas partidas o comentamos alguna serie?'
                    ];
                    const msg = sampleMessages[i % sampleMessages.length];
                    const insReq = await client.query(`
                        INSERT INTO affinity_requests(from_user_id, to_user_id, recommendation_id, client_id, text, state, expires_at)
                        VALUES($1, $2, $3, gen_random_uuid(), $4, 'pending', NOW() + INTERVAL '7 days')
                        ON CONFLICT DO NOTHING RETURNING id
                    `, [reqPeer.targetId, user.id, reqId, msg]);
                    if (insReq.rowCount > 0) totalConversationRequests++;
                }
            }

            // 3. Los candidatos restantes (o a partir del 3º) van al carrusel "Por descubrir"
            const discoverCandidates = ranked.length > 2 ? ranked.slice(2, 5) : ranked.slice(0, 1);
            if (discoverCandidates.length > 0) {
                const batchRes = await client.query(
                    'INSERT INTO affinity_batches(user_id, created_at, expires_at) VALUES($1, NOW(), NOW() + INTERVAL \'7 days\') RETURNING id',
                    [user.id]
                );
                const batchId = batchRes.rows[0].id;

                for (const r of discoverCandidates) {
                    await client.query(`
                        INSERT INTO affinity_recommendations(batch_id, user_id, target_id, common_keys, score, state)
                        VALUES($1, $2, $3, $4, $5, 'available')
                        ON CONFLICT(batch_id, target_id) DO NOTHING
                    `, [batchId, user.id, r.targetId, JSON.stringify(r.commonKeys), r.score]);
                    totalRecommendations++;
                }
            }
        }

        await client.query('COMMIT');
        console.log('✅ Escenario de Afinidades generado con éxito:');
        console.log(`   - Recomendaciones 'Por descubrir': ${totalRecommendations}`);
        console.log(`   - Likes de afinidades recibidos: ${totalAffinityLikes}`);
        console.log(`   - Invitaciones con mensaje recibidas: ${totalConversationRequests}`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error generando afinidades de prueba:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

seedAffinitiesTest();
