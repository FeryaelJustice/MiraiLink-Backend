
import express from 'express';
import { getProfile, updateProfile, getProfileFromId, getUserIdByToken, getUserIdByEmailAndPassword } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('', authenticateToken(), getProfile);
router.get('/byToken', authenticateToken(), getUserIdByToken);
router.post('/byEmailPassword', getUserIdByEmailAndPassword);
router.post('byId', authenticateToken(), getProfileFromId);
router.put('', authenticateToken(), updateProfile);

export default router;