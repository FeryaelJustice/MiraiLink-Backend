import express from 'express';
import { getMatches, getUnseenMatches, markMatchesSeen } from '../controllers/match.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { matchIdsSchema } from '../validation/social.schemas.js';

const router = express.Router();
router.use(authenticateToken());
router.get('/', getMatches);
router.get('/unseen', getUnseenMatches);
router.post('/mark-seen', validate({ body: matchIdsSchema }), markMatchesSeen);
export default router;
