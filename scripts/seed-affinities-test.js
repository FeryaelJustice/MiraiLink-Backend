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

async function seedTestInteractions() {
    const client = await pool.connect();
    try {
        console.log('🔮 Generando escenario de prueba completo (Afinidades + Likes normales) para todos los usuarios...');
        await client.query('BEGIN');

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

        // Asegurar que todos los usuarios tengan affinity_preferences configurado, activo y observado
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

        // Pre-cargar perfiles con actividad reciente para pruebas
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

        for (const user of usersRes.rows) {
            const a = userProfiles.get(user.id);
            if (!a || !complete(a)) continue;

            // Recopilar usuarios con los que user ya tiene interacción previa en la base de datos
            // (likes recibidos o enviados, dislikes, blocks, reports, matches, requests o recomendaciones)
            const existingInteractions = await client.query(`
                SELECT to_user_id AS peer_id FROM likes WHERE from_user_id=$1
                UNION
                SELECT from_user_id AS peer_id FROM likes WHERE to_user_id=$1
                UNION
                SELECT to_user_id AS peer_id FROM dislikes WHERE from_user_id=$1
                UNION
                SELECT from_user_id AS peer_id FROM dislikes WHERE to_user_id=$1
                UNION
                SELECT target_id AS peer_id FROM user_blocks WHERE user_id=$1
                UNION
                SELECT user_id AS peer_id FROM user_blocks WHERE target_id=$1
                UNION
                SELECT reported_user AS peer_id FROM reports WHERE reported_by=$1
                UNION
                SELECT reported_by AS peer_id FROM reports WHERE reported_user=$1
                UNION
                SELECT CASE WHEN user1_id=$1 THEN user2_id ELSE user1_id END AS peer_id FROM matches WHERE user1_id=$1 OR user2_id=$1
                UNION
                SELECT to_user_id AS peer_id FROM affinity_requests WHERE from_user_id=$1
                UNION
                SELECT from_user_id AS peer_id FROM affinity_requests WHERE to_user_id=$1
                UNION
                SELECT target_id AS peer_id FROM affinity_recommendations WHERE user_id=$1 AND state IN ('available', 'liked', 'requested')
            `, [user.id]);

            const usedPeerIds = new Set(existingInteractions.rows.map(r => r.peer_id));

            // Comprobar qué tiene ya el usuario recibido
            const existingAffinityLikeCount = await client.query(
                "SELECT count(*) FROM likes WHERE to_user_id=$1 AND origin='affinity'",
                [user.id]
            );
            const hasAffinityLike = parseInt(existingAffinityLikeCount.rows[0].count, 10) > 0;

            const existingReqCount = await client.query(
                "SELECT count(*) FROM affinity_requests WHERE to_user_id=$1 AND state='pending' AND expires_at>NOW()",
                [user.id]
            );
            const hasAffinityReq = parseInt(existingReqCount.rows[0].count, 10) > 0;

            const existingRecCount = await client.query(
                "SELECT count(*) FROM affinity_recommendations r JOIN affinity_batches b ON b.id=r.batch_id WHERE r.user_id=$1 AND r.state='available' AND b.expires_at>NOW()",
                [user.id]
            );
            const currentRecCount = parseInt(existingRecCount.rows[0].count, 10);

            const existingNormalLikesCount = await client.query(
                "SELECT count(*) FROM likes WHERE to_user_id=$1 AND origin='discovery'",
                [user.id]
            );
            const currentNormalLikesCount = parseInt(existingNormalLikesCount.rows[0].count, 10);

            // Calcular candidatos compatibles ordenados por puntuación
            const ranked = [];
            for (const cand of usersRes.rows) {
                if (cand.id === user.id || usedPeerIds.has(cand.id)) continue;
                const b = userProfiles.get(cand.id);
                const rank = b && rankCandidate(a, b);
                if (rank) ranked.push({ ...rank, target: b, username: cand.username });
            }

            ranked.sort((x, y) => y.score - x.score);

            let rankIdx = 0;

            // 1. Interés recibido: Like desde afinidades (si aún no tiene)
            if (!hasAffinityLike && rankIdx < ranked.length) {
                const likePeer = ranked[rankIdx++];
                usedPeerIds.add(likePeer.targetId);
                const likeRes = await client.query(`
                    INSERT INTO likes(from_user_id, to_user_id, origin, created_at)
                    VALUES($1, $2, 'affinity', NOW())
                    ON CONFLICT DO NOTHING RETURNING id
                `, [likePeer.targetId, user.id]);
                if (likeRes.rowCount > 0) totalAffinityLikes++;
            }

            // 2. Interés recibido: Invitación a conversar con Mensaje (si aún no tiene)
            if (!hasAffinityReq && rankIdx < ranked.length) {
                const reqPeer = ranked[rankIdx++];
                usedPeerIds.add(reqPeer.targetId);
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

            // 3. Recomendaciones "Por descubrir": Completar hasta un lote de 3
            const neededRecs = Math.max(0, 3 - currentRecCount);
            if (neededRecs > 0 && rankIdx < ranked.length) {
                const discoverCandidates = ranked.slice(rankIdx, rankIdx + neededRecs);
                rankIdx += discoverCandidates.length;

                if (discoverCandidates.length > 0) {
                    const batchRes = await client.query(
                        "INSERT INTO affinity_batches(user_id, created_at, expires_at) VALUES($1, NOW(), NOW() + INTERVAL '7 days') RETURNING id",
                        [user.id]
                    );
                    const batchId = batchRes.rows[0].id;

                    for (const r of discoverCandidates) {
                        usedPeerIds.add(r.targetId);
                        await client.query(`
                            INSERT INTO affinity_recommendations(batch_id, user_id, target_id, common_keys, score, state)
                            VALUES($1, $2, $3, $4, $5, 'available')
                            ON CONFLICT(batch_id, target_id) DO NOTHING
                        `, [batchId, user.id, r.targetId, JSON.stringify(r.commonKeys), r.score]);
                        totalRecommendations++;
                    }
                }
            }

            // 4. Modo normal: Likes recibidos normales (Personas que te han dado like)
            // Completar hasta 2 likes normales con candidatos que NUNCA coincidan con afinidades
            const neededNormalLikes = Math.max(0, 2 - currentNormalLikesCount);
            if (neededNormalLikes > 0) {
                const normalCandidates = usersRes.rows
                    .filter(cand => cand.id !== user.id && !usedPeerIds.has(cand.id))
                    .slice(0, neededNormalLikes);

                for (const nCand of normalCandidates) {
                    usedPeerIds.add(nCand.id);
                    const insNormal = await client.query(`
                        INSERT INTO likes(from_user_id, to_user_id, origin, discovery_mode, created_at)
                        VALUES($1, $2, 'discovery', 'classic', NOW())
                        ON CONFLICT DO NOTHING RETURNING id
                    `, [nCand.id, user.id]);
                    if (insNormal.rowCount > 0) totalNormalLikes++;
                }
            }
        }

        await client.query('COMMIT');
        console.log('✅ Generación idempotente completada:');
        console.log(`   - Nuevos likes de afinidad: ${totalAffinityLikes}`);
        console.log(`   - Nuevas invitaciones a conversar: ${totalConversationRequests}`);
        console.log(`   - Nuevas recomendaciones por descubrir: ${totalRecommendations}`);
        console.log(`   - Nuevos likes de modo normal: ${totalNormalLikes}`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error generando escenario de prueba:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

seedTestInteractions();
