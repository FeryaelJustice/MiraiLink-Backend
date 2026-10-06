import { describe,it,expect,beforeAll,afterAll } from 'vitest';
import pg from 'pg';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const url=process.env.AFFINITY_TEST_DB_URL;
const enabled=Boolean(url && ['127.0.0.1','localhost'].includes(new URL(url).hostname));
describe.skipIf(!enabled)('Affinity isolated PostgreSQL transactions',()=>{
    let admin,db,service,billing;
    const schema='affinity_test_'+randomUUID().replaceAll('-','');
    const users=Array.from({length:6},()=>randomUUID());const recs=[];
    beforeAll(async()=>{
        admin=new pg.Pool({connectionString:url});await admin.query(`CREATE SCHEMA ${schema}`);
        const scoped=new URL(url);scoped.searchParams.set('options','-csearch_path='+schema+',public');
        process.env.DB_URL=scoped.toString();process.env.AFFINITIES_ENABLED='true';
        db=(await import('../../src/models/db.js')).default;
        await db.query(await fs.readFile('src/database/db.sql','utf8'));
        await (await import('../../src/database/migrator.js')).runMigrations(db);
        service=await import('../../src/services/affinity-service.js');billing=await import('../../src/services/play-billing.js');
        const anime=(await db.query("INSERT INTO animes(name,catalog_key) VALUES('Affinity fixture','affinity-fixture') RETURNING id")).rows[0].id;
        const game=(await db.query("INSERT INTO games(name,catalog_key) VALUES('Affinity fixture','affinity-fixture') RETURNING id")).rows[0].id;
        const goal=(await db.query("INSERT INTO relationship_goals(code) VALUES('affinity_fixture') RETURNING id")).rows[0].id;
        for(let n=0;n<users.length;n++){
            const user=users[n];
            await db.query("INSERT INTO users(id,username,auth_provider,is_verified,birthdate,bio,residence_latitude,residence_longitude) VALUES($1,$2,'email',TRUE,'2000-01-01','Hello',39.57,2.65)",[user,'affinity'+n]);
            await db.query("INSERT INTO user_photos(user_id,url,position) VALUES($1,'/uploads/avatar.jpg',1)",[user]);
            await db.query('INSERT INTO user_search_preferences(user_id) VALUES($1)',[user]);
            await db.query("INSERT INTO affinity_preferences(user_id,observed_since,last_active_at) VALUES($1,NOW()-INTERVAL '8 days',NOW())",[user]);
            await db.query('INSERT INTO user_anime_interests VALUES($1,$2)',[user,anime]);await db.query('INSERT INTO user_game_interests VALUES($1,$2)',[user,game]);await db.query('INSERT INTO user_relationship_goals VALUES($1,$2)',[user,goal]);
        }
        await db.query("INSERT INTO user_subscriptions(user_id,product_id,purchase_token,status,provider_verified,expires_at) VALUES($1,'mirailink_plus','test-token','active',TRUE,NOW()+INTERVAL '30 days')",[users[0]]);
        const batch=(await db.query('INSERT INTO affinity_batches(user_id) VALUES($1) RETURNING id',[users[0]])).rows[0].id;
        for(const peer of users.slice(1))recs.push((await db.query('INSERT INTO affinity_recommendations(batch_id,user_id,target_id,common_keys,score) VALUES($1,$2,$3,$4,1) RETURNING id',[batch,users[0],peer,JSON.stringify(['anime:'+anime,'game:'+game])])).rows[0].id);
    },30000);
    afterAll(async()=>{if(db)await db.end();if(admin){await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}});
    it('redacts Free identities and returns honest common tastes',async()=>{
        const feed=await service.recommendations(users[0],false,'es');expect(feed.items).toHaveLength(5);expect(feed.items.every(r=>r.person===null&&r.commonInterests.length===2)).toBe(true);
    });
    it('serializes repeated sends and accepts once for a Free recipient without a match',async()=>{
        const clientId=randomUUID();const [a,b]=await Promise.all([service.sendRequest(users[0],recs[0],clientId,'First message'),service.sendRequest(users[0],recs[0],clientId,'First message')]);
        expect(a.id).toBe(b.id);
        const [one,two]=await Promise.all([service.respondRequest(users[1],a.id,true),service.respondRequest(users[1],a.id,true)]);
        expect(one.chatId).toBe(two.chatId);
        expect((await db.query('SELECT * FROM messages WHERE affinity_request_id=$1',[a.id])).rows).toHaveLength(1);
        expect((await db.query('SELECT * FROM matches')).rows).toHaveLength(0);
        await db.query('INSERT INTO matches(user1_id,user2_id) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid))',[users[0],users[1]]);
        expect((await db.query('SELECT * FROM chats')).rows).toHaveLength(1);
    });
    it('mutual like opens a pending invitation once and preserves its text',async()=>{
        const request=await service.sendRequest(users[0],recs[1],randomUUID(),'From affinities');
        await db.query('INSERT INTO matches(user1_id,user2_id) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid))',[users[0],users[2]]);
        const row=(await db.query('SELECT * FROM affinity_requests WHERE id=$1',[request.id])).rows[0];expect(row.state).toBe('accepted');
        expect((await db.query('SELECT text FROM messages WHERE affinity_request_id=$1',[request.id])).rows).toEqual([{text:'From affinities'}]);
    });
    it('enforces three invitations and seven day expiry independently of the batch',async()=>{
        const request=await service.sendRequest(users[0],recs[2],randomUUID(),'Third');
        await expect(service.sendRequest(users[0],recs[3],randomUUID(),'Fourth')).rejects.toMatchObject({code:'AFFINITY_QUOTA_REACHED'});
        await db.query("UPDATE affinity_requests SET expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",[request.id]);
        await expect(service.respondRequest(users[3],request.id,true)).rejects.toMatchObject({code:'REQUEST_EXPIRED'});
    });
    it('prevents chat bypass and both directions of a block',async()=>{
        await expect(service.requireMatch(db,users[0],users[5])).rejects.toMatchObject({code:'MATCH_OR_ACCEPTED_REQUEST_REQUIRED'});
        await db.query('INSERT INTO user_blocks VALUES($1,$2,NOW())',[users[5],users[0]]);
        await expect(service.ensureContact(db,users[0],users[5])).rejects.toMatchObject({code:'CONTACT_BLOCKED'});
        await expect(service.ensureContact(db,users[5],users[0])).rejects.toMatchObject({code:'CONTACT_BLOCKED'});
    });
    it('ignores an obsolete purchase token after a real upgrade',async()=>{
        const user=users[0];const purchase=(linked)=>({subscriptionState:'SUBSCRIPTION_STATE_ACTIVE',externalAccountIdentifiers:{obfuscatedExternalAccountId:billing.accountHash(user)},linkedPurchaseToken:linked,lineItems:[{productId:'mirailink_plus',expiryTime:'2027-01-01T00:00:00Z'}]});
        await billing.verifyAndSavePurchase(user,'old',null,{queryPurchase:async()=>purchase()});
        await billing.verifyAndSavePurchase(user,'new',null,{queryPurchase:async()=>purchase('old')});
        await billing.verifyAndSavePurchase(user,'old',null,{queryPurchase:async()=>({...purchase(),subscriptionState:'SUBSCRIPTION_STATE_EXPIRED'})});
        const current=(await db.query('SELECT purchase_token,status FROM user_subscriptions WHERE user_id=$1',[user])).rows[0];expect(current).toEqual({purchase_token:'new',status:'active'});
    });
});
