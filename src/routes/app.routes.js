/**
 * Compone rutas de compatibilidad de versiones de cliente: ordena guardas, validación y handler.
 * El prefijo /api lo monta createApp; consultar docs/estudio/flujos y OpenAPI al cambiar contratos.
 */
import express from 'express';
import { checkAndroidAppVersion } from '../controllers/app.controller.js';

const router = express.Router();

router.get('/version/android', checkAndroidAppVersion);

export default router;