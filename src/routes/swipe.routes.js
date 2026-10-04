/**
 * Compone rutas de descubrimiento y votos: ordena guardas, validación y handler.
 * El prefijo /api lo monta createApp; consultar docs/estudio/flujos y OpenAPI al cambiar contratos.
 */
import express from 'express';
import { dislikeUser, getFeed, getReceivedLikes, getUndoQuota, likeUser, undoSwipe } from '../controllers/swipe.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { feedQuery, pagination } from '../validation/common.schemas.js';
import { targetUserSchema, undoSwipeSchema } from '../validation/social.schemas.js';

const router = express.Router();
router.use(authenticateToken());

// Feed de descubrimiento paginado con soporte para localizacion y filtros de radio
router.get('/feed', validate({ query: feedQuery }), getFeed);

// Likes entrantes recibidos (disponible para planes con visibilidad de likes)
router.get('/likes-received', validate({ query: pagination }), getReceivedLikes);

// Consulta de cuota diaria de deshacer disponible (Free: 1, Plus: 3, Premium: 6 en ventana de 24h)
router.get('/undo-quota', getUndoQuota);

// Emision de like (crea match si es reciproco)
router.post('/like', validate({ body: targetUserSchema }), likeUser);

// Emision de dislike
router.post('/dislike', validate({ body: targetUserSchema }), dislikeUser);

// Reversion de ultimo like/dislike dentro de la cuota activa del plan
router.post('/undo', validate({ body: undoSwipeSchema }), undoSwipe);

export default router;
