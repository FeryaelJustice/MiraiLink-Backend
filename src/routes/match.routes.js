/**
 * Compone rutas de coincidencias y marcas de visto: ordena guardas, validación y handler.
 * El prefijo /api lo monta createApp; consultar docs/estudio/flujos y OpenAPI al cambiar contratos.
 */
import express from 'express';
import { getMatches, getUnseenMatches, markMatchesSeen } from '../controllers/match.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { matchIdsSchema } from '../validation/social.schemas.js';

const router = express.Router();
router.use(authenticateToken());
router.get('/', getMatches);
router.get('/unseen', getUnseenMatches);
router.post('/mark-seen', validate({ body: matchIdsSchema }), markMatchesSeen);
export default router;
