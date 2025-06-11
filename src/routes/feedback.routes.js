import express from 'express';
import { sendFeedback } from '../controllers/feedback.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', authenticateToken(), sendFeedback);

export default router;
