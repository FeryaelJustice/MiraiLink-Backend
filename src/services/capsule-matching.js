import { AppError } from '../errors/AppError.js';
import { FREE_DAILY_LIKES_LIMIT } from '../consts/subscriptionConsts.js';
export async function verifySwipeMode(client,fromId,toId,mode) {
    const pair=[fromId,toId].sort();
    await client.query('SELECT id FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[pair]);
    const prefs=await client.query('SELECT user_id,discovery_mode FROM user_search_preferences WHERE user_id=ANY($1::uuid[]) ORDER BY user_id FOR UPDATE',[pair]);
    const modes=new Map(prefs.rows.map(p=>[p.user_id,p.discovery_mode]));
    if(pair.some(id=>(modes.get(id) ?? 'classic')!==mode)) throw new AppError({status:409,code:'CAPSULE_MODE_CHANGED'});
    return pair;
}
export async function likeWithMode(client,fromId,toId,mode,createCapsule) {
    const pair=await verifySwipeMode(client,fromId,toId,mode);
    const prior=await client.query('SELECT discovery_mode FROM likes WHERE from_user_id=$1 AND to_user_id=$2',[fromId,toId]);
    if(prior.rows[0] && prior.rows[0].discovery_mode!==mode) throw new AppError({status:409,code:'CAPSULE_LIKE_MODE_CONFLICT'});
    const reverse=await client.query('SELECT discovery_mode FROM likes WHERE from_user_id=$1 AND to_user_id=$2',[toId,fromId]);
    if(reverse.rows[0] && reverse.rows[0].discovery_mode!==mode) throw new AppError({status:409,code:'CAPSULE_LIKE_MODE_CONFLICT'});
    if(!prior.rows.length) {
        const entitlement=await client.query("SELECT 1 FROM user_subscriptions WHERE user_id=$1 AND status='active' AND product_id IN ('mirailink_plus','mirailink_premium') AND (expires_at IS NULL OR expires_at>NOW())",[fromId]);
        // Cuota compartida bajo bloqueo de usuario, incluso con likes simultáneos.
        if(!entitlement.rowCount) {
            const usage=await client.query("SELECT COUNT(*)::int AS count FROM likes WHERE from_user_id=$1 AND created_at>=NOW()-INTERVAL '24 hours'",[fromId]);
            if(usage.rows[0].count>=FREE_DAILY_LIKES_LIMIT) throw new AppError({status:403,code:'DAILY_LIKES_LIMIT_REACHED'});
        }
        await client.query('INSERT INTO likes(from_user_id,to_user_id,discovery_mode) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[fromId,toId,mode]);
    }
    if(!reverse.rows.length) return false;
    const match=await client.query('INSERT INTO matches(user1_id,user2_id) VALUES($1,$2) ON CONFLICT(user1_id,user2_id) DO UPDATE SET user1_id=EXCLUDED.user1_id RETURNING id',pair);
    if(mode==='capsule') await createCapsule(client,pair,match.rows[0].id);
    return true;
}
