import db from '../models/db.js';

// Una política compartida cubre perfiles, listas, avatares y proyecciones anidadas.
export async function presentCapsulePhotos(body, req) {
    const users=[];
    const receivedModes=new WeakMap();
    const isDiscoveryFeed=/\/(?:swipe\/feed|categories\/[^/]+\/feed)(?:\?|$)/.test(req.originalUrl ?? '');
    const visit=value=>{
        if(!value || typeof value!=='object') return;
        if(value.likeId && value.user && value.discoveryMode) receivedModes.set(value.user,value.discoveryMode);
        if(!Array.isArray(value) && typeof value.id==='string' && value.id!==req.user?.id &&
            ('photos' in value || 'avatarUrl' in value || 'profilePhoto' in value)) users.push(value);
        for(const child of Object.values(value)) if(child && typeof child==='object') visit(child);
    };
    visit(body);
    if(!users.length) return body;
    const ids=[...new Set(users.map(u=>u.id))];
    const result=await db.query(
        `SELECT u.id,COALESCE(p.discovery_mode,'classic') AS mode,
            COALESCE(own.discovery_mode,'classic') AS viewer_mode,
            c.id AS capsule_id,c.status,c.snapshot,c.revision,
            EXISTS(SELECT 1 FROM matches m WHERE m.user1_id=LEAST($1::uuid,u.id) AND m.user2_id=GREATEST($1::uuid,u.id)) AS has_match,
            EXISTS(SELECT 1 FROM likes l WHERE l.origin='discovery' AND l.discovery_mode='capsule'
                AND ((l.from_user_id=$1 AND l.to_user_id=u.id) OR (l.from_user_id=u.id AND l.to_user_id=$1))) AS has_capsule_like,
            EXISTS(SELECT 1 FROM likes l WHERE l.discovery_mode='classic'
                AND ((l.from_user_id=$1 AND l.to_user_id=u.id) OR (l.from_user_id=u.id AND l.to_user_id=$1)))
            OR EXISTS(SELECT 1 FROM affinity_requests ar
                WHERE ((ar.from_user_id=$1 AND ar.to_user_id=u.id) OR (ar.from_user_id=u.id AND ar.to_user_id=$1))
                AND (ar.state='accepted' OR (ar.state='pending' AND ar.expires_at>NOW())))
            OR EXISTS(SELECT 1 FROM affinity_recommendations r JOIN affinity_batches b ON b.id=r.batch_id
                LEFT JOIN affinity_preferences ap ON ap.user_id=u.id
                WHERE r.user_id=$1 AND r.target_id=u.id AND r.state='available' AND b.expires_at>NOW()
                AND u.is_verified=TRUE AND u.is_deleted=FALSE AND COALESCE(ap.enabled,TRUE)=TRUE
                AND COALESCE(p.discovery_mode,'classic')='classic') AS has_classic_contact
        FROM users u LEFT JOIN user_search_preferences p ON p.user_id=u.id
        LEFT JOIN user_search_preferences own ON own.user_id=$1
        LEFT JOIN capsule_sessions c ON (c.user1_id=$1 AND c.user2_id=u.id) OR (c.user2_id=$1 AND c.user1_id=u.id)
        WHERE u.id=ANY($2::uuid[])`,[req.user.id,ids]);
    const byId=new Map(result.rows.map(r=>[r.id,r]));
    const capable=req.get('X-MiraiLink-Capabilities')?.split(',').includes('crystal-capsule-v1');
    for(const user of users) {
        const row=byId.get(user.id); if(!row) continue;
        const state=row.snapshot;
        const receivedMode=receivedModes.get(user);
        const mode=receivedMode ?? (isDiscoveryFeed ? row.viewer_mode : (row.has_capsule_like ? 'capsule' : row.mode));
        const classicContact=!receivedMode && !isDiscoveryFeed && !row.has_capsule_like && row.has_classic_contact;
        const veiled=state ? state.status!=='revealed' : mode==='capsule' && !row.has_match && !classicContact;
        user.photoPresentation={capsuleId:row.capsule_id ?? null,level:state?.level ?? (veiled?0:4),status:state?.status ?? (veiled?'discovery':'classic'),revision:row.revision ?? 0,veiled};
        if(veiled && !capable) {
            if('photos' in user) user.photos=[];
            if('avatarUrl' in user) user.avatarUrl=null;
            if('profilePhoto' in user) user.profilePhoto=null;
        }
    }
    return body;
}
export function capsulePresentationMiddleware(req,res,next) {
    const json=res.json.bind(res);
    res.json=body=>{
        if(!req.user?.id || res.statusCode>=400) return json(body);
        return presentCapsulePhotos(body,req).then(json).catch(next);
    };
    next();
}
