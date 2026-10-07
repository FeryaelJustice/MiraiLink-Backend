import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { writeLimiter } from '../middleware/rateLimit.middleware.js';
import { resolveCatalogLanguage } from '../utils/catalogLocalization.js';
import { getCapsuleConfig, executeCapsuleAction } from '../services/capsule-service.js';

const router = express.Router();
const base = { actionId: z.uuid(), expectedRevision: z.number().int().nonnegative() };

const questionSchema = z.object({
    ...base,
    type: z.literal('question'),
    category: z.enum(['anime', 'gaming', 'hobbies', 'everyday', 'ideal_date', 'projects', 'relationships', 'family']),
    questionId: z.string().trim().min(1).max(50).optional(),
    isCustom: z.boolean().optional(),
    customQuestion: z.string().trim().min(1).max(120).optional(),
    answer: z.string().trim().min(1).max(300),
    language: z.string().trim().min(2).max(35).optional(),
}).superRefine((val, ctx) => {
    if (val.isCustom && !val.customQuestion) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'customQuestion is required when isCustom is true',
            path: ['customQuestion'],
        });
    }
});

const answerSchema = z.object({
    ...base,
    type: z.literal('answer'),
    missionId: z.uuid(),
    answer: z.string().trim().min(1).max(300).optional(),
    text: z.string().trim().min(1).max(300).optional(),
    language: z.string().trim().min(2).max(35).optional(),
}).superRefine((val, ctx) => {
    if (!val.answer && !val.text) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'answer or text is required',
            path: ['answer'],
        });
    }
});

const lifecycleTypes = ['pause', 'leave', 'resume', 'request_reveal', 'accept_reveal', 'decline_reveal', 'cancel_reveal'];
const lifecycleSchemas = lifecycleTypes.map(type => z.object({ ...base, type: z.literal(type) }));

const schema = z.discriminatedUnion('type', [
    questionSchema,
    answerSchema,
    ...lifecycleSchemas,
]);

router.use(authenticateToken());
router.get('/config', async (req, res, next) => {
    try {
        const preferredLocale = req.get('x-language') || resolveCatalogLanguage(req.get('accept-language'));
        return res.json(await getCapsuleConfig(preferredLocale));
    } catch (error) {
        return next(error);
    }
});

router.post('/:id/actions', writeLimiter, validate({ params: z.object({ id: z.uuid() }), body: schema }), async (req, res, next) => {
    try {
        const preferredLocale = req.body.language || req.get('x-language') || resolveCatalogLanguage(req.get('accept-language'));
        return res.json(await executeCapsuleAction(req.user.id, req.params.id, req.body, preferredLocale));
    } catch (error) {
        return next(error);
    }
});

export default router;
