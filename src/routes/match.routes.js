import express from 'express';
import { getMatches, getUnseenMatches, markMatchesSeen } from '../controllers/match.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticateToken(), getMatches);
router.get('/unseen', authenticateToken(), getUnseenMatches);
router.post('/mark-seen', authenticateToken(), markMatchesSeen);

export default router;