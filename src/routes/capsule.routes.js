import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { writeLimiter } from '../middleware/rateLimit.middleware.js';
import { capsuleCatalog, capsulesEnabled, executeCapsuleAction } from '../services/capsule-service.js';
const router=express.Router();
const base={actionId:z.uuid(),expectedRevision:z.number().int().nonnegative()};
const schema=z.discriminatedUnion('type',[
    z.object({...base,type:z.literal('question'),category:z.enum(['anime','gaming','hobbies','everyday','ideal_date','projects','relationships','family'])}),
    z.object({...base,type:z.literal('answer'),missionId:z.uuid(),text:z.string().trim().min(1).max(4000)}),
    ...['pause','leave','resume','request_reveal','accept_reveal','decline_reveal','cancel_reveal'].map(type=>z.object({...base,type:z.literal(type)})),
]);
router.use(authenticateToken());
router.get('/config',(_req,res)=>res.json({enabled:capsulesEnabled(),rulesVersion:1,catalogVersion:capsuleCatalog.version,questions:capsuleCatalog.questions}));
router.post('/:id/actions',writeLimiter,validate({params:z.object({id:z.uuid()}),body:schema}),async(req,res,next)=>{
    try { return res.json(await executeCapsuleAction(req.user.id,req.params.id,req.body)); } catch(error){return next(error);}
});
export default router;
