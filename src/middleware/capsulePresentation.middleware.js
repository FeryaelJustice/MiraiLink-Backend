import db from '../models/db.js';

// Una política compartida cubre perfiles, listas, avatares y proyecciones anidadas.
export async function presentCapsulePhotos(body, req) {
    const users=[];
    const visit=value=>{
        if(!value || typeof value!=='object') return;
        if(!Array.isArray(value) && typeof value.id==='string' && value.id!==req.user?.id &&
            ('photos' in value || 'avatarUrl' in value || 'profilePhoto' in value)) users.push(value);
        for(const child of Object.values(value)) if(child && typeof child==='object') visit(child);
    };
    visit(body);
    if(!users.length) return body;
    const ids=[...new Set(users.map(u=>u.id))];
    const result=await db.query(
        "SELECT u.id,COALESCE(p.discovery_mode,'classic') AS mode,c.id AS capsule_id,c.status,c.snapshot,c.revision,EXISTS(SELECT 1 FROM matches m WHERE (m.user1_id=$1 AND m.user2_id=u.id) OR (m.user2_id=$1 AND m.user1_id=u.id)) AS has_match " +
        'FROM users u LEFT JOIN user_search_preferences p ON p.user_id=u.id ' +
        'LEFT JOIN capsule_sessions c ON (c.user1_id=$1 AND c.user2_id=u.id) OR (c.user2_id=$1 AND c.user1_id=u.id) ' +
        'WHERE u.id=ANY($2::uuid[])',[req.user.id,ids]);
    const byId=new Map(result.rows.map(r=>[r.id,r]));
    const capable=req.get('X-MiraiLink-Capabilities')?.split(',').includes('crystal-capsule-v1');
    for(const user of users) {
        const row=byId.get(user.id); if(!row) continue;
        const state=row.snapshot;
        const veiled=state ? state.status!=='revealed' : row.mode==='capsule' && !row.has_match;
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
