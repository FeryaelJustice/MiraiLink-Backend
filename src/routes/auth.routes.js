import express from 'express';
import { register, login, logout, requestPasswordReset, confirmPasswordReset, requestVerificationCode, confirmVerificationCode } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post("/logout", authenticateToken(true), logout)

// Password reset
router.post('/password/request-reset', requestPasswordReset);
router.post('/password/confirm-reset', confirmPasswordReset);

// Account verification
router.post('/verification/request', requestVerificationCode);
router.post('/verification/confirm', confirmVerificationCode);

export default router;