import db from '../models/db.js';
import { AppError } from '../errors/AppError.js';
import { enabled,activity,recommendations,transaction,recommendation,sendRequest,respondRequest,outbox,profile,publicPerson,ensureContact,pairLock } from '../services/affinity-service.js';
const fail=(code,status=403)=>new AppError({code,status,message:code});
export const plusOnly=(req,_res,next)=>req.user.subscription?.isPlus?next():next(fail('PLUS_REQUIRED'));
const handle=work=>async(req,res,next)=>{try{return res.json(await work(req));}catch(error){return next(error);}};
const locale=req=>['es','en','ja'].includes(req.get('accept-language')?.slice(0,2))?req.get('accept-language').slice(0,2):'es';
export const getRecommendations=handle(req=>recommendations(req.user.id,req.user.subscription.isPlus,locale(req)));
export const recordActivity=handle(async req=>{await activity(req.user.id);return {success:true};});
export const setPreferences=handle(async req=>{
    await db.query('INSERT INTO affinity_preferences(user_id,enabled) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET enabled=EXCLUDED.enabled',[req.user.id,req.body.enabled]);
    return {enabled:req.body.enabled};
});
export const dismissRecommendation=handle(async req=>{
    await db.query("UPDATE affinity_recommendations SET state='dismissed' WHERE id=$1 AND user_id=$2 AND state IN('available','liked')",[req.params.id,req.user.id]);return {success:true};
});
export const likeRecommendation=handle(req=>transaction(async client=>{
    const row=await recommendation(client,req.user.id,req.params.id);
    const created=await client.query("INSERT INTO likes(from_user_id,to_user_id,origin) VALUES($1,$2,'affinity') ON CONFLICT DO NOTHING RETURNING id",[req.user.id,row.target_id]);
    const reciprocal=await client.query('SELECT 1 FROM likes WHERE from_user_id=$1 AND to_user_id=$2',[row.target_id,req.user.id]);
    if(reciprocal.rows.length)await client.query('INSERT INTO matches(user1_id,user2_id) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid)) ON CONFLICT DO NOTHING',[req.user.id,row.target_id]);
    await client.query("UPDATE affinity_recommendations SET state=$2 WHERE id=$1",[row.id,reciprocal.rows.length?'matched':'liked']);
    if(created.rows[0])await outbox(client,row.target_id,'affinity_like',created.rows[0].id);
    return {match:Boolean(reciprocal.rows.length)};
}));
export const requestConversation=handle(req=>sendRequest(req.user.id,req.params.id,req.body.clientId,req.body.text));
export const acceptConversation=handle(req=>respondRequest(req.user.id,req.params.id,true));
export const rejectConversation=handle(req=>respondRequest(req.user.id,req.params.id,false));
export const getRequests=handle(async req=>{
    const rows=await db.query(`SELECT r.id,r.from_user_id,r.to_user_id,r.state,r.text,r.expires_at,r.chat_id,r.created_at FROM affinity_requests r
        WHERE (r.from_user_id=$1 OR r.to_user_id=$1) AND r.state='pending' AND r.expires_at>NOW() AND NOT EXISTS(SELECT 1 FROM reports WHERE (reported_by=r.from_user_id AND reported_user=r.to_user_id) OR (reported_by=r.to_user_id AND reported_user=r.from_user_id)) AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE
        (b.user_id=r.from_user_id AND b.target_id=r.to_user_id) OR (b.user_id=r.to_user_id AND b.target_id=r.from_user_id))
        ORDER BY r.created_at DESC,r.id LIMIT $2 OFFSET $3`,[req.user.id,req.query.limit,req.query.offset]);
    const items=[];
    for(const row of rows.rows){
        const incoming=row.to_user_id===req.user.id;const peer=await profile(db,incoming?row.from_user_id:row.to_user_id,locale(req));
        if(!peer||peer.is_deleted)continue;
        items.push({id:row.id,incoming,state:row.state==='pending'&&Date.parse(row.expires_at)<=Date.now()?'expired':row.state,text:row.text,expiresAt:row.expires_at,chatId:row.chat_id,person:publicPerson(peer)});
    }
    return {items};
});
export const getAffinityLikes=handle(async req=>{
    const rows=await db.query(`SELECT l.id,l.from_user_id,l.created_at FROM likes l JOIN users u ON u.id=l.from_user_id
        WHERE l.to_user_id=$1 AND l.origin='affinity' AND u.is_deleted=FALSE
        AND NOT EXISTS(SELECT 1 FROM likes WHERE from_user_id=$1 AND to_user_id=l.from_user_id)
        AND NOT EXISTS(SELECT 1 FROM dislikes WHERE from_user_id=$1 AND to_user_id=l.from_user_id)
        AND NOT EXISTS(SELECT 1 FROM user_blocks WHERE (user_id=$1 AND target_id=l.from_user_id) OR (user_id=l.from_user_id AND target_id=$1))
        ORDER BY l.created_at DESC LIMIT $2 OFFSET $3`,[req.user.id,req.query.limit,req.query.offset]);
    const items=[];
    for(const row of rows.rows){const peer=await profile(db,row.from_user_id,locale(req));if(peer)items.push({id:row.id,person:req.user.subscription.isPlus?publicPerson(peer):null,createdAt:row.created_at});}
    return {items};
});
export const returnAffinityLike=handle(req=>transaction(async client=>{
    const user=req.user.id;
    const found=await client.query("SELECT from_user_id FROM likes WHERE id=$1 AND to_user_id=$2 AND origin='affinity'",[req.params.id,user]);
    if(!found.rows[0])throw fail('LIKE_NOT_FOUND',404);const peer=found.rows[0].from_user_id;
    await pairLock(client,user,peer);await ensureContact(client,user,peer);
    await client.query("INSERT INTO likes(from_user_id,to_user_id,origin) VALUES($1,$2,'discovery') ON CONFLICT DO NOTHING",[user,peer]);
    await client.query('INSERT INTO matches(user1_id,user2_id) VALUES(LEAST($1::uuid,$2::uuid),GREATEST($1::uuid,$2::uuid)) ON CONFLICT DO NOTHING',[user,peer]);
    return {match:true};
}));
export const blockUser=handle(req=>transaction(async client=>{
    const user=req.user.id;const target=req.params.id;if(user===target)throw fail('SELF_ACTION',400);
    await pairLock(client,user,target);
    await client.query('INSERT INTO user_blocks(user_id,target_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[user,target]);
    await client.query("UPDATE affinity_requests SET state='blocked' WHERE LEAST(from_user_id,to_user_id)=LEAST($1::uuid,$2::uuid) AND GREATEST(from_user_id,to_user_id)=GREATEST($1::uuid,$2::uuid) AND state='pending'",[user,target]);
    return {success:true};
}));
export const getContactStatus=handle(async req=>{
    const user=req.user.id,target=req.params.id;
    await ensureContact(db,user,target);
    const chat=await db.query(`SELECT c.origin FROM chats c JOIN chat_members a ON a.chat_id=c.id AND a.user_id=$1 JOIN chat_members b ON b.chat_id=c.id AND b.user_id=$2 WHERE c.type='private' LIMIT 1`,[user,target]);
    const match=await db.query('SELECT 1 FROM matches WHERE user1_id=LEAST($1::uuid,$2::uuid) AND user2_id=GREATEST($1::uuid,$2::uuid)',[user,target]);
    return {origin:chat.rows[0]?.origin??'match',matched:Boolean(match.rows.length),enabled:enabled()};
});
