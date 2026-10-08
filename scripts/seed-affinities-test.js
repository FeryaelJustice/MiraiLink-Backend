import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { rankCandidate, complete } from '../src/services/affinity-engine.js';
import { profile } from '../src/services/affinity-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

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
        console.log('🔮 Generando escenario de prueba completo de Afinidades en base de datos real...');
        await client.query('BEGIN');

        // Limpiar completamente afinidades previas y likes para asegurar un estado de prueba puro y sin duplicados
        await client.query("DELETE FROM affinity_requests");
        await client.query("DELETE FROM affinity_recommendations");
        await client.query("DELETE FROM affinity_batches");
        await client.query("DELETE FROM likes");

        const usersRes = await client.query(`
            SELECT id, username, nickname FROM users 
            WHERE is_deleted = FALSE AND is_verified = TRUE 
            ORDER BY created_at ASC
        `);

        if (usersRes.rows.length < 2) {
            console.log('⚠️ Se necesitan al menos 2 usuarios en la base de datos.');
            await client.query('ROLLBACK');
            return;
        }

        // Asegurar que todos tengan affinity_preferences activo y observado
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

        // Pre-cargar perfiles
        const userProfiles = new Map();
        for (const u of usersRes.rows) {
            const p = await profile(client, u.id, 'es');
            if (p) p.last_active_at = new Date().toISOString();
            userProfiles.set(u.id, p);
        }

        let totalAffinityLikes = 0;
        let totalConversationRequests = 0;
        let totalRecommendations = 0;
        let totalNormalLikes = 0;

        // Asignación de roles por usuario
        for (const user of usersRes.rows) {
            const a = userProfiles.get(user.id);
            if (!a || !complete(a)) continue;

            // Calcular compatibles
            const ranked = [];
            for (const cand of usersRes.rows) {
                if (cand.id === user.id) continue;
                const b = userProfiles.get(cand.id);
                const rank = b && rankCandidate(a, b);
                if (rank) ranked.push({ ...rank, target: b, username: cand.username });
            }

            ranked.sort((x, y) => y.score - x.score);
            if (ranked.length === 0) continue;

            const userAffinityPeers = new Set();

            // 1. Interés recibido: Like desde afinidades (1 candidato)
            if (ranked.length >= 1) {
                const likePeer = ranked[0];
                userAffinityPeers.add(likePeer.targetId);
                const likeRes = await client.query(`
                    INSERT INTO likes(from_user_id, to_user_id, origin, created_at)
                    VALUES($1, $2, 'affinity', NOW())
                    ON CONFLICT DO NOTHING RETURNING id
                `, [likePeer.targetId, user.id]);
                if (likeRes.rowCount > 0) totalAffinityLikes++;
            }

            // 2. Interés recibido: Invitación a conversar con Mensaje (1 candidato distinto)
            if (ranked.length >= 2) {
                const reqPeer = ranked[1];
                userAffinityPeers.add(reqPeer.targetId);
                const dummyBatch = await client.query(
                    "INSERT INTO affinity_batches(user_id, created_at, expires_at) VALUES($1, NOW(), NOW() + INTERVAL '7 days') RETURNING id",
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
                        '¡Hola! Vi que compartimos gustos en común. ¿Qué animes estás viendo últimamente?',
                        '¡Buenas! Tenemos aficiones súper parecidas, ¿te apetece que hablemos un rato?',
                        '¡Hey! Genial encontrar a alguien con gustos tan afines por aquí. ¿Hablamos?'
                    ];
                    const msg = sampleMessages[user.username.length % sampleMessages.length];
                    const insReq = await client.query(`
                        INSERT INTO affinity_requests(from_user_id, to_user_id, recommendation_id, client_id, text, state, expires_at)
                        VALUES($1, $2, $3, gen_random_uuid(), $4, 'pending', NOW() + INTERVAL '7 days')
                        ON CONFLICT DO NOTHING RETURNING id
                    `, [reqPeer.targetId, user.id, reqId, msg]);
                    if (insReq.rowCount > 0) totalConversationRequests++;
                }
            }

            // 3. Recomendaciones "Por descubrir": Lote de candidatos compatibles
            // (excluyendo los que ya enviaron interés a user)
            const discoverCandidates = ranked.filter(r => !userAffinityPeers.has(r.targetId)).slice(0, 3);
            if (discoverCandidates.length > 0) {
                const batchRes = await client.query(
                    "INSERT INTO affinity_batches(user_id, created_at, expires_at) VALUES($1, NOW(), NOW() + INTERVAL '7 days') RETURNING id",
                    [user.id]
                );
                const batchId = batchRes.rows[0].id;

                for (const r of discoverCandidates) {
                    userAffinityPeers.add(r.targetId);
                    await client.query(`
                        INSERT INTO affinity_recommendations(batch_id, user_id, target_id, common_keys, score, state)
                        VALUES($1, $2, $3, $4, $5, 'available')
                        ON CONFLICT(batch_id, target_id) DO NOTHING
                    `, [batchId, user.id, r.targetId, JSON.stringify(r.commonKeys), r.score]);
                    totalRecommendations++;
                }
            }

            // 4. Modo normal: Likes recibidos normales (Personas que te han dado like)
            // Deben ser personas que NUNCA coincidan con los asignados a afinidades para este usuario
            const normalCandidates = usersRes.rows.filter(cand => cand.id !== user.id && !userAffinityPeers.has(cand.id)).slice(0, 2);
            for (const nCand of normalCandidates) {
                const insNormal = await client.query(`
                    INSERT INTO likes(from_user_id, to_user_id, origin, discovery_mode, created_at)
                    VALUES($1, $2, 'discovery', 'classic', NOW())
                    ON CONFLICT DO NOTHING RETURNING id
                `, [nCand.id, user.id]);
                if (insNormal.rowCount > 0) totalNormalLikes++;
            }
        }

        await client.query('COMMIT');
        console.log('✅ Escenario completo de prueba generado con éxito:');
        console.log(`   - Likes de afinidades recibidos: ${totalAffinityLikes}`);
        console.log(`   - Invitaciones a conversar con mensaje recibidas: ${totalConversationRequests}`);
        console.log(`   - Recomendaciones de afinidades 'Por descubrir': ${totalRecommendations}`);
        console.log(`   - Likes de modo normal (sin solapamiento): ${totalNormalLikes}`);
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
