import db from '../models/db.js';
import { AppError } from '../errors/AppError.js';
import { eligible,rankCandidate,complete,adult } from './affinity-engine.js';
import { DEFAULT_AVATAR_URL } from '../consts/photosConsts.js';
export const enabled=()=>process.env.AFFINITIES_ENABLED==='true';
// Test rows bypass compatibility only, never privacy or participation.
const visibleProfile=p=>Boolean(p && p.is_verified && !p.is_deleted && p.enabled!==false && adult(p) && (p.discovery_mode ?? 'classic')==='classic');
const isTestRecommendation=row=>process.env.NODE_ENV!=='production' && row.is_test===true;
const fail=(code,status=403)=>new AppError({code,status,message:code});
export async function transaction(work) {
    const client=await db.connect();
    try {await client.query('BEGIN');const result=await work(client);await client.query('COMMIT');return result;}
    catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function pairLock(client,a,b){await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[[a,b].sort().join(':')]);}
export async function ensureContact(client,a,b) {
    const result=await client.query(`SELECT 1 FROM user_blocks WHERE (user_id=$1 AND target_id=$2) OR (user_id=$2 AND target_id=$1)`,[a,b]);
    if(result.rows.length) throw fail('CONTACT_BLOCKED');
    const target=await client.query('SELECT 1 FROM users WHERE id=$1 AND is_deleted=FALSE',[b]);
    if(!target.rows.length) throw fail('USER_NOT_FOUND',404);
}
export async function existingChat(client,a,b) {
    const found=await client.query(`SELECT c.id,c.origin FROM chats c JOIN chat_members a ON a.chat_id=c.id AND a.user_id=$1
        JOIN chat_members b ON b.chat_id=c.id AND b.user_id=$2 WHERE c.type='private' LIMIT 1`,[a,b]);
    return found.rows[0];
}
export async function requireMatch(client,a,b) {
    const matched=await client.query('SELECT 1 FROM matches WHERE user1_id=LEAST($1::uuid,$2::uuid) AND user2_id=GREATEST($1::uuid,$2::uuid)',[a,b]);
    if(!matched.rows.length) {
        const accepted=await client.query("SELECT 1 FROM affinity_requests WHERE state='accepted' AND chat_id IS NOT NULL AND ((from_user_id=$1 AND to_user_id=$2) OR (from_user_id=$2 AND to_user_id=$1)) LIMIT 1",[a,b]);
        if(!accepted.rows.length) throw fail('MATCH_OR_ACCEPTED_REQUEST_REQUIRED');
    }
}
export async function profile(client,id,locale='es') {
    const result=await client.query(`SELECT u.id,u.username,u.nickname,u.bio,u.gender,u.birthdate,u.is_verified,u.is_deleted,
        u.residence_country_id,u.residence_latitude,u.residence_longitude,u.current_latitude,u.current_longitude,u.last_location_updated_at,
        p.discovery_mode,p.search_scope,p.search_radius_km,p.search_gender,p.search_target_country_id,p.search_match_live_location,
        ap.enabled,ap.observed_since,ap.last_active_at,ap.last_like_at,ap.last_match_at,
        s.product_id,s.status AS subscription_status,s.expires_at,s.provider_verified,
        COALESCE((SELECT url FROM user_photos WHERE user_id=u.id ORDER BY position LIMIT 1), 'assets/img/profiles/Goku.webp') AS avatar_url,
        COALESCE((SELECT json_agg(g.code) FROM user_relationship_goals i JOIN relationship_goals g ON g.id=i.goal_id WHERE i.user_id=u.id),'[]') AS goals,
        COALESCE((SELECT json_agg(item) FROM (
            SELECT 'anime:'||a.id AS key,COALESCE(t.name,a.name) AS title FROM user_anime_interests i JOIN animes a ON a.id=i.anime_id
            LEFT JOIN anime_name_translations t ON t.anime_id=a.id AND t.language_id=(SELECT id FROM supported_languages WHERE code=$2) WHERE i.user_id=u.id
            UNION ALL
            SELECT 'game:'||g.id,COALESCE(t.name,g.name) FROM user_game_interests i JOIN games g ON g.id=i.game_id
            LEFT JOIN game_name_translations t ON t.game_id=g.id AND t.language_id=(SELECT id FROM supported_languages WHERE code=$2) WHERE i.user_id=u.id
        ) item),'[]') AS interests
        FROM users u LEFT JOIN user_search_preferences p ON p.user_id=u.id LEFT JOIN affinity_preferences ap ON ap.user_id=u.id
        LEFT JOIN user_subscriptions s ON s.user_id=u.id WHERE u.id=$1`,[id,locale]);
    return result.rows[0];
}
export function publicPerson(p) {return {id:p.id,username:p.username,nickname:p.nickname,avatarUrl:p.avatar_url || DEFAULT_AVATAR_URL};}
export async function outbox(client,user,type,resource) {
    await client.query('INSERT INTO affinity_outbox(user_id,type,resource_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[user,type,resource]);
}
export async function activity(user) {
    await db.query(`INSERT INTO affinity_preferences(user_id,last_active_at) VALUES($1,NOW()) ON CONFLICT(user_id) DO UPDATE
        SET last_active_at=NOW() WHERE affinity_preferences.last_active_at IS NULL OR affinity_preferences.last_active_at<NOW()-INTERVAL '1 hour'`,[user]);
}
export async function recommendations(user,plus,locale) {
    const pref=await profile(db,user,locale);const response={enabled:enabled(),participating:pref?.enabled!==false,eligible:false,items:[]};
    if(!enabled()||!visibleProfile(pref))return response;
    response.eligible=eligible(pref);
    const rows=await db.query(`SELECT r.*,b.expires_at FROM affinity_recommendations r JOIN affinity_batches b ON b.id=r.batch_id
        WHERE r.user_id=$1 AND b.expires_at>NOW() AND r.state='available' ORDER BY r.score DESC,r.id`,[user]);
    for(const row of rows.rows){
        const candidate=await profile(db,row.target_id,locale);
        if(!visibleProfile(candidate)||(!isTestRecommendation(row)&&(!complete(pref)||!rankCandidate(pref,candidate))))continue;
        const denied=await db.query(`SELECT 1 FROM user_blocks WHERE (user_id=$1 AND target_id=$2) OR (user_id=$2 AND target_id=$1)
            UNION ALL SELECT 1 FROM reports WHERE (reported_by=$1 AND reported_user=$2) OR (reported_by=$2 AND reported_user=$1)
            UNION ALL SELECT 1 FROM matches WHERE user1_id=LEAST($1::uuid,$2::uuid) AND user2_id=GREATEST($1::uuid,$2::uuid)
            UNION ALL SELECT 1 FROM dislikes WHERE (from_user_id=$1 AND to_user_id=$2) OR (from_user_id=$2 AND to_user_id=$1)
            UNION ALL SELECT 1 FROM likes WHERE (from_user_id=$1 AND to_user_id=$2) OR (from_user_id=$2 AND to_user_id=$1)
            UNION ALL SELECT 1 FROM affinity_requests WHERE ((from_user_id=$1 AND to_user_id=$2) OR (from_user_id=$2 AND to_user_id=$1)) AND state IN('pending','accepted','rejected','blocked')`,[user,row.target_id]);
        if(denied.rows.length||await existingChat(db,user,row.target_id))continue;
        response.items.push({id:row.id,expiresAt:row.expires_at,state:row.state,
            commonInterests:candidate.interests.filter(i=>row.common_keys.includes(i.key)).map(i=>i.title),person:plus?publicPerson(candidate):null});
    }
    return response;
}
export async function recommendation(client,user,id) {
    if(!enabled())throw fail('AFFINITIES_DISABLED',503);
    const result=await client.query(`SELECT r.*,b.expires_at FROM affinity_recommendations r JOIN affinity_batches b ON b.id=r.batch_id
        WHERE r.id=$1 AND r.user_id=$2 AND b.expires_at>NOW() AND r.state IN('available','liked') FOR UPDATE OF r`,[id,user]);
    const row=result.rows[0];if(!row)throw fail('RECOMMENDATION_EXPIRED',409);
    await pairLock(client,user,row.target_id);await ensureContact(client,user,row.target_id);
    const a=await profile(client,user);const b=await profile(client,row.target_id);
    if(!(a?.provider_verified && a.subscription_status==='active' && Date.parse(a.expires_at)>Date.now()))throw fail('PLUS_REQUIRED');
    if(!visibleProfile(a)||!visibleProfile(b)||(!isTestRecommendation(row)&&(!complete(a)||!rankCandidate(a,b))))throw fail('RECOMMENDATION_UNAVAILABLE',409);
    const rejected=await client.query(`SELECT 1 FROM affinity_requests WHERE ((from_user_id=$1 AND to_user_id=$2) OR (from_user_id=$2 AND to_user_id=$1)) AND state IN('pending','accepted','rejected','blocked')
        UNION ALL SELECT 1 FROM likes WHERE (from_user_id=$1 AND to_user_id=$2) OR (from_user_id=$2 AND to_user_id=$1)
        UNION ALL SELECT 1 FROM matches WHERE user1_id=LEAST($1::uuid,$2::uuid) AND user2_id=GREATEST($1::uuid,$2::uuid)
        UNION ALL SELECT 1 FROM dislikes WHERE (from_user_id=$1 AND to_user_id=$2) OR (from_user_id=$2 AND to_user_id=$1)
        UNION ALL SELECT 1 FROM reports WHERE (reported_by=$1 AND reported_user=$2) OR (reported_by=$2 AND reported_user=$1)`,[user,row.target_id]);
    if(rejected.rows.length||await existingChat(client,user,row.target_id))throw fail('RECOMMENDATION_UNAVAILABLE',409);
    return row;
}
export async function sendRequest(user,id,clientId,text) {
    return transaction(async client=>{
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['affinity-quota:'+user]);
        const previous=await client.query('SELECT id,state,chat_id FROM affinity_requests WHERE from_user_id=$1 AND client_id=$2',[user,clientId]);
        if(previous.rows[0])return previous.rows[0];
        const row=await recommendation(client,user,id);
        await client.query("UPDATE affinity_requests SET state='expired' WHERE state='pending' AND expires_at<=NOW()");
        const quota=await client.query("SELECT COUNT(*)::int AS n FROM affinity_requests WHERE from_user_id=$1 AND created_at>NOW()-INTERVAL '7 days'",[user]);
        if(quota.rows[0].n>=3)throw fail('AFFINITY_QUOTA_REACHED',429);
        const pending=await client.query("SELECT 1 FROM affinity_requests WHERE LEAST(from_user_id,to_user_id)=LEAST($1::uuid,$2::uuid) AND GREATEST(from_user_id,to_user_id)=GREATEST($1::uuid,$2::uuid) AND state='pending'",[user,row.target_id]);
        if(pending.rows.length)throw fail('REQUEST_ALREADY_PENDING',409);
        const result=await client.query('INSERT INTO affinity_requests(from_user_id,to_user_id,recommendation_id,client_id,text) VALUES($1,$2,$3,$4,$5) RETURNING id,state,chat_id',[user,row.target_id,id,clientId,text]);
        await client.query("UPDATE affinity_recommendations SET state='requested' WHERE id=$1",[id]);
        await outbox(client,row.target_id,'affinity_request',result.rows[0].id);
        return result.rows[0];
    });
}
export async function respondRequest(user,id,accept) {
    return transaction(async client=>{
        const before=await client.query('SELECT * FROM affinity_requests WHERE id=$1 AND to_user_id=$2',[id,user]);
        if(!before.rows[0])throw fail('REQUEST_NOT_FOUND',404);
        const initial=before.rows[0];await pairLock(client,user,initial.from_user_id);
        const locked=await client.query('SELECT * FROM affinity_requests WHERE id=$1 FOR UPDATE',[id]);const request=locked.rows[0];
        if(request.state==='accepted')return {id,state:'accepted',chatId:request.chat_id};
        if(request.state!=='pending'||Date.parse(request.expires_at)<=Date.now())throw fail('REQUEST_EXPIRED',409);
        if(!accept){await client.query("UPDATE affinity_requests SET state='rejected' WHERE id=$1",[id]);return {id,state:'rejected',chatId:null};}
        await ensureContact(client,user,request.from_user_id);
        const a=await profile(client,user);const b=await profile(client,request.from_user_id);
        if(!a||!b||!a.is_verified||!b.is_verified||!adult(a)||!adult(b)||a.is_deleted||b.is_deleted)throw fail('RECOMMENDATION_UNAVAILABLE',409);
        let chat=await existingChat(client,user,request.from_user_id);
        if(!chat){
            const result=await client.query("INSERT INTO chats(type,created_by,origin) VALUES('private',$1,'affinity') RETURNING id",[request.from_user_id]);chat=result.rows[0];
            await client.query('INSERT INTO chat_members(chat_id,user_id) VALUES($1,$2),($1,$3)',[chat.id,user,request.from_user_id]);
        }
        await client.query('INSERT INTO messages(chat_id,sender_id,text,sent_at,affinity_request_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(affinity_request_id) DO NOTHING',[chat.id,request.from_user_id,request.text,request.created_at,id]);
        await client.query("UPDATE affinity_requests SET state='accepted',chat_id=$2 WHERE id=$1",[id,chat.id]);
        await outbox(client,request.from_user_id,'affinity_accepted',id);
        return {id,state:'accepted',chatId:chat.id};
    });
}

export async function generateAffinities() {
    if(!enabled())return 0;
    return transaction(async client=>{
        const lock=await client.query("SELECT pg_try_advisory_xact_lock(hashtext('affinity-generator')) AS acquired");if(!lock.rows[0].acquired)return 0;
        await client.query("UPDATE affinity_requests SET state='expired' WHERE state='pending' AND expires_at<=NOW()");
        const users=await client.query(`SELECT ap.user_id FROM affinity_preferences ap WHERE ap.enabled=TRUE AND ap.last_active_at>NOW()-INTERVAL '7 days'
            AND ap.observed_since<=NOW()-INTERVAL '7 days' AND (ap.last_like_at IS NULL OR ap.last_like_at<=NOW()-INTERVAL '7 days')
            AND NOT EXISTS(SELECT 1 FROM affinity_batches b WHERE b.user_id=ap.user_id AND b.created_at>NOW()-INTERVAL '7 days')
            AND (ap.last_evaluated_at IS NULL OR ap.last_evaluated_at<NOW()-INTERVAL '1 hour')
            ORDER BY ap.last_evaluated_at NULLS FIRST,ap.user_id LIMIT 100`);
        let count=0;
        for(const {user_id:user} of users.rows){
            await client.query('UPDATE affinity_preferences SET last_evaluated_at=NOW() WHERE user_id=$1',[user]);
            const a=await profile(client,user);if(!a||!eligible(a))continue;
            const ids=await client.query(`SELECT u.id FROM users u JOIN affinity_preferences ap ON ap.user_id=u.id WHERE u.id<>$1 AND ap.enabled=TRUE AND ap.last_active_at>NOW()-INTERVAL '7 days'
                AND u.is_verified=TRUE AND u.is_deleted=FALSE AND u.birthdate<=CURRENT_DATE-INTERVAL '18 years'
                AND NOT EXISTS(SELECT 1 FROM likes WHERE (from_user_id=$1 AND to_user_id=u.id) OR (from_user_id=u.id AND to_user_id=$1))
                AND NOT EXISTS(SELECT 1 FROM dislikes WHERE (from_user_id=$1 AND to_user_id=u.id) OR (from_user_id=u.id AND to_user_id=$1))
                AND NOT EXISTS(SELECT 1 FROM user_blocks WHERE (user_id=$1 AND target_id=u.id) OR (user_id=u.id AND target_id=$1))
                AND NOT EXISTS(SELECT 1 FROM reports WHERE (reported_by=$1 AND reported_user=u.id) OR (reported_by=u.id AND reported_user=$1))
                AND NOT EXISTS(SELECT 1 FROM matches WHERE user1_id=LEAST($1::uuid,u.id) AND user2_id=GREATEST($1::uuid,u.id))
                AND NOT EXISTS(SELECT 1 FROM chat_members me JOIN chat_members them ON me.chat_id=them.chat_id WHERE me.user_id=$1 AND them.user_id=u.id)
                AND NOT EXISTS(SELECT 1 FROM affinity_requests WHERE LEAST(from_user_id,to_user_id)=LEAST($1::uuid,u.id) AND GREATEST(from_user_id,to_user_id)=GREATEST($1::uuid,u.id) AND state IN('pending','rejected','blocked'))
                AND NOT EXISTS(SELECT 1 FROM affinity_recommendations WHERE user_id=$1 AND target_id=u.id AND created_at>NOW()-INTERVAL '30 days')
                ORDER BY ap.last_active_at DESC,u.id LIMIT 500`,[user]);
            const ranked=[];
            for(const candidate of ids.rows){const b=await profile(client,candidate.id);const rank=b&&rankCandidate(a,b);if(rank)ranked.push(rank);}
            ranked.sort((a,b)=>b.score-a.score||Date.parse(b.activity)-Date.parse(a.activity)||a.targetId.localeCompare(b.targetId));
            if(!ranked.length)continue;
            const batch=await client.query('INSERT INTO affinity_batches(user_id) VALUES($1) RETURNING id',[user]);
            for(const row of ranked.slice(0,3))await client.query('INSERT INTO affinity_recommendations(batch_id,user_id,target_id,common_keys,score) VALUES($1,$2,$3,$4,$5)',[batch.rows[0].id,user,row.targetId,JSON.stringify(row.commonKeys),row.score]);
            await outbox(client,user,'affinity_available',batch.rows[0].id);count++;
        }
        return count;
    });
}
