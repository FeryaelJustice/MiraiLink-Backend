import express from 'express';
import { dislikeUser, getFeed, likeUser } from '../controllers/swipe.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { feedQuery } from '../validation/common.schemas.js';
import { targetUserSchema } from '../validation/social.schemas.js';

const router = express.Router();
router.use(authenticateToken());
router.get('/feed', validate({ query: feedQuery }), getFeed);
router.post('/like', validate({ body: targetUserSchema }), likeUser);
router.post('/dislike', validate({ body: targetUserSchema }), dislikeUser);
export default router;
