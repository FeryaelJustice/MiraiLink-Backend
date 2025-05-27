
import express from 'express';
import { getProfiles } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('', authenticateToken(), getProfiles);

export default router;