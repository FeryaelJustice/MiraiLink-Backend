import { runScenario, peerAt } from './test-scenarios.js';
import { createMatchCapsule } from '../src/services/capsule-service.js';

await runScenario(async (client, users) => {
    for (let index = 0; index < users.length; index++) {
        const pair = [users[index].id, peerAt(users,index,6).id].sort();
        const match = (await client.query(`INSERT INTO matches(user1_id,user2_id) VALUES($1,$2)
            ON CONFLICT(user1_id,user2_id) DO UPDATE SET user1_id=EXCLUDED.user1_id RETURNING id`, pair)).rows[0].id;
        for (const [from,to] of [pair,[pair[1],pair[0]]]) {
            await client.query(`INSERT INTO likes(from_user_id,to_user_id,origin,discovery_mode) VALUES($1,$2,'discovery','capsule')
                ON CONFLICT(from_user_id,to_user_id,origin) DO UPDATE SET origin='discovery',discovery_mode='capsule'`, [from,to]);
        }
        await createMatchCapsule(client,pair,match);
    }
    console.log(`Capsules con match mutuo preparadas para las ${users.length} cuentas existentes. Sin cambiar su modo de Discovery ni enviar avisos.`);
});
