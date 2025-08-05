import express from 'express';
import { register, login, logout, autoLogin, requestPasswordReset, confirmPasswordReset, requestVerificationCode, confirmVerificationCode, checkIsVerified, setup2FA, verify2FA, disable2FA, check2FAStatus, loginVerify2FALastStep } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post("/autologin", authenticateToken(), autoLogin);
router.post("/logout", authenticateToken(true), logout)

// Password reset
router.post('/password/request-reset', requestPasswordReset);
router.post('/password/confirm-reset', confirmPasswordReset);

// Account verification
router.post('/verification/request', requestVerificationCode);
router.post('/verification/confirm', confirmVerificationCode);
router.get('/verification/check', authenticateToken(), checkIsVerified);

// 2FA
router.post('/2fa/setup', authenticateToken(), setup2FA);
router.post('/2fa/verify', authenticateToken(), verify2FA);
router.post('/2fa/disable', authenticateToken(), disable2FA);
router.get('/2fa/status', authenticateToken(), check2FAStatus);
router.post('/2fa/loginVerifyLastStep', authenticateToken(), loginVerify2FALastStep);

export default router;