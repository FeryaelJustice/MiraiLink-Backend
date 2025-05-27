import express from 'express';
import { getFeed, likeUser, dislikeUser } from '../controllers/swipe.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/feed', authenticateToken(), getFeed);
router.post('/like', authenticateToken(), likeUser);
router.post('/dislike', authenticateToken(), dislikeUser);

export default router;