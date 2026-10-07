import defaultDb from '../models/db.js';
export function requireChatMember({db=defaultDb}={}) {
    return async(req,res,next)=>{
        try {
            const result=await db.query(`SELECT 1 FROM chat_members me WHERE me.chat_id=$1 AND me.user_id=$2
                AND NOT EXISTS(SELECT 1 FROM chat_members peer JOIN user_blocks b ON (b.user_id=me.user_id AND b.target_id=peer.user_id) OR (b.user_id=peer.user_id AND b.target_id=me.user_id)
                    WHERE peer.chat_id=me.chat_id AND peer.user_id<>me.user_id) LIMIT 1`,[req.params.chatId,req.user.id]);
            if(!result.rows.length)return res.status(404).json({code:'CHAT_NOT_FOUND',message:'Chat not found'});
            return next();
        }catch(error){return next(error);}
    };
}
