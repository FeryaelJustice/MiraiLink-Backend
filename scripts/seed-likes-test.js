import { runScenario, peerAt } from './test-scenarios.js';

await runScenario(async (client, users) => {
    for (let index = 0; index < users.length; index++) {
        const peer = peerAt(users, index, 5);
        await client.query(`INSERT INTO likes(from_user_id,to_user_id,origin,discovery_mode) VALUES($1,$2,'discovery','classic')
            ON CONFLICT(from_user_id,to_user_id) DO UPDATE SET origin='discovery',discovery_mode='classic',created_at=NOW()`, [users[index].id,peer.id]);
    }
    console.log(`1 like normal entrante para cada una de las ${users.length} cuentas existentes, separado de Afinidades y Capsule.`);
});
