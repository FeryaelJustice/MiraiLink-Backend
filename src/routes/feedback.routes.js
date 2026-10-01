/**
 * Compone rutas de mensajes de soporte: ordena guardas, validación y handler.
 * El prefijo /api lo monta createApp; consultar docs/estudio/flujos y OpenAPI al cambiar contratos.
 */
import express from 'express';
import { sendFeedback } from '../controllers/feedback.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { writeLimiter } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { feedbackSchema } from '../validation/social.schemas.js';

const router = express.Router();
router.post('/', authenticateToken(), writeLimiter, validate({ body: feedbackSchema }), sendFeedback);
export default router;
