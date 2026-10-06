import { transaction } from './affinity-service.js';
import { getFcm } from '../config/firebaseAdmin.js';
const text={
    affinity_like:['Nuevo like de Afinidades','Alguien te ha dado un like desde Afinidades. Descubre quien con Plus.'],
    affinity_available:['Afinidades para ti','Hay personas con gustos como los tuyos. Descubre tus afinidades.'],
    affinity_request:['Nueva solicitud','Alguien quiere conversar contigo por Afinidades. Puedes aceptar gratis.'],
    affinity_accepted:['Solicitud aceptada','Tu invitacion de Afinidades ha sido aceptada.'],
};
export async function drainAffinityOutbox(){
    return transaction(async client=>{
        const rows=await client.query('SELECT o.*,t.token FROM affinity_outbox o LEFT JOIN push_tokens t ON t.user_id=o.user_id WHERE o.delivered_at IS NULL AND o.available_at<=NOW() ORDER BY o.available_at LIMIT 50 FOR UPDATE OF o SKIP LOCKED');
        for(const row of rows.rows){
            try{
                const live=await client.query(`SELECT CASE $1
                    WHEN 'affinity_available' THEN EXISTS(SELECT 1 FROM affinity_batches b JOIN affinity_preferences p ON p.user_id=b.user_id WHERE b.id=$2 AND b.expires_at>NOW() AND p.enabled)
                    WHEN 'affinity_like' THEN EXISTS(SELECT 1 FROM likes l WHERE l.id=$2 AND NOT EXISTS(SELECT 1 FROM user_blocks WHERE (user_id=l.from_user_id AND target_id=l.to_user_id) OR (user_id=l.to_user_id AND target_id=l.from_user_id)))
                    WHEN 'affinity_request' THEN EXISTS(SELECT 1 FROM affinity_requests r WHERE r.id=$2 AND r.state='pending' AND r.expires_at>NOW() AND NOT EXISTS(SELECT 1 FROM user_blocks WHERE (user_id=r.from_user_id AND target_id=r.to_user_id) OR (user_id=r.to_user_id AND target_id=r.from_user_id)))
                    WHEN 'affinity_accepted' THEN EXISTS(SELECT 1 FROM affinity_requests r WHERE r.id=$2 AND r.state='accepted' AND NOT EXISTS(SELECT 1 FROM user_blocks WHERE (user_id=r.from_user_id AND target_id=r.to_user_id) OR (user_id=r.to_user_id AND target_id=r.from_user_id)))
                    ELSE FALSE END AS live`,[row.type,row.resource_id]);
                if(live.rows[0].live && row.token){const fcm=await getFcm();await fcm.send({token:row.token,data:{type:row.type,resourceId:row.resource_id},android:{priority:'normal'}});}
                await client.query('UPDATE affinity_outbox SET delivered_at=NOW() WHERE id=$1',[row.id]);
            }catch(error){
                if(['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(error.code)){
                    await client.query('DELETE FROM push_tokens WHERE user_id=$1 AND token=$2',[row.user_id,row.token]);
                    await client.query('UPDATE affinity_outbox SET delivered_at=NOW() WHERE id=$1',[row.id]);
                }else await client.query("UPDATE affinity_outbox SET attempts=attempts+1,available_at=NOW()+INTERVAL '5 minutes' WHERE id=$1",[row.id]);
            }
        }
        return rows.rows.length;
    });
}
export const affinityNotificationText=text;
