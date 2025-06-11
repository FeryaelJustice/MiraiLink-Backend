import express from 'express';
import { reportUser } from '../controllers/report.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('', authenticateToken(), reportUser);

export default router;
