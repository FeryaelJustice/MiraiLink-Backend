/**
 * Compone rutas de denuncias: ordena guardas, validación y handler.
 * El prefijo /api lo monta createApp; consultar docs/estudio/flujos y OpenAPI al cambiar contratos.
 */
import express from 'express';
import { reportUser } from '../controllers/report.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { writeLimiter } from '../middleware/rateLimit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { reportSchema } from '../validation/social.schemas.js';

const router = express.Router();
router.post('/', authenticateToken(), writeLimiter, validate({ body: reportSchema }), reportUser);
export default router;
