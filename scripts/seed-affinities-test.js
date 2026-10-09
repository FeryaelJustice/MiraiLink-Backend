import { runScenario, peerAt } from './test-scenarios.js';
import { profile } from '../src/services/affinity-service.js';

await runScenario(async (client, users) => {
    await client.query('ALTER TABLE affinity_recommendations ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE');
    for (let index = 0; index < users.length; index++) {
        const user = users[index];
        await client.query(`INSERT INTO affinity_preferences(user_id,enabled,observed_since,last_active_at)
            VALUES($1,TRUE,NOW()-INTERVAL '14 days',NOW()) ON CONFLICT(user_id) DO UPDATE SET enabled=TRUE,
            observed_since=NOW()-INTERVAL '14 days',last_active_at=NOW()`, [user.id]);
        const batch = (await client.query('INSERT INTO affinity_batches(user_id) VALUES($1) RETURNING id', [user.id])).rows[0].id;
        for (const offset of [1, -1, 2, 4]) {
            const peer = peerAt(users, index, offset);
            const person = await profile(client, peer.id);
            const keys = (person.interests ?? []).slice(0, 3).map(interest => interest.key);
            // Renew only this test pair; production recommendations are kept.
            await client.query("DELETE FROM affinity_recommendations r WHERE r.user_id=$1 AND r.target_id=$2 AND r.is_test=TRUE AND NOT EXISTS(SELECT 1 FROM affinity_requests q WHERE q.recommendation_id=r.id)", [user.id, peer.id]);
            if (offset === 4) {
                const existing = (await client.query("SELECT id,recommendation_id FROM affinity_requests WHERE from_user_id=$1 AND to_user_id=$2 AND state='pending'", [user.id, peer.id])).rows[0];
                if (existing) {
                    await client.query("UPDATE affinity_requests SET expires_at=NOW()+INTERVAL '7 days' WHERE id=$1", [existing.id]);
                    continue;
                }
            }
            const rec = (await client.query(`INSERT INTO affinity_recommendations(batch_id,user_id,target_id,common_keys,score,state,is_test)
                VALUES($1,$2,$3,$4,1,$5,TRUE) RETURNING id`, [batch,user.id,peer.id,JSON.stringify(keys),offset===4?'requested':'available'])).rows[0].id;
            if (offset === 4) await client.query(`INSERT INTO affinity_requests(from_user_id,to_user_id,recommendation_id,client_id,text,state,expires_at)
                VALUES($1,$2,$3,gen_random_uuid(),'Hola, me apetece conocerte. ¿Hablamos?','pending',NOW()+INTERVAL '7 days')`, [user.id,peer.id,rec]);
        }
        const likePeer = peerAt(users, index, 3);
        await client.query(`INSERT INTO likes(from_user_id,to_user_id,origin,discovery_mode) VALUES($1,$2,'affinity','classic')
            ON CONFLICT(from_user_id,to_user_id) DO UPDATE SET origin='affinity',discovery_mode='classic',created_at=NOW()`, [user.id,likePeer.id]);
    }
    console.log(`Afinidades para ${users.length} cuentas existentes: 3 recomendaciones, 1 like entrante y 1 invitacion entrante por cuenta.`);
});
