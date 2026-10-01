/**
 * Compone rutas de colección pública de usuarios: ordena guardas, validación y handler.
 * El prefijo /api lo monta createApp; consultar docs/estudio/flujos y OpenAPI al cambiar contratos.
 */
import express from 'express';
import { getProfiles } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { pagination } from '../validation/common.schemas.js';

const router = express.Router();
router.get('/', authenticateToken(), validate({ query: pagination }), getProfiles);
export default router;
