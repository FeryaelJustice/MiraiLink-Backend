/**
 * Compone rutas de planes e intención de cancelación: ordena guardas, validación y handler.
 * El prefijo /api lo monta createApp; consultar docs/estudio/flujos y OpenAPI al cambiar contratos.
 */
import express from 'express';
import { googlePlayNotification } from '../services/play-billing.js';
import {
    cancelSubscriptionIntent,
    getSubscriptionStatus,
    verifySubscription,
} from '../controllers/subscription.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
    cancelSubscriptionIntentSchema,
    verifySubscriptionSchema,
} from '../validation/subscription.schemas.js';

const router = express.Router();

router.post('/google-play-notifications', googlePlayNotification);
router.use(authenticateToken());

router.get('/status', getSubscriptionStatus);
router.post('/verify', validate({ body: verifySubscriptionSchema }), verifySubscription);
router.post('/cancel-intent', validate({ body: cancelSubscriptionIntentSchema }), cancelSubscriptionIntent);

export default router;
