import express from 'express';
import { checkAndroidAppVersion } from '../controllers/app.controller.js';

const router = express.Router();

router.get('/version/android', checkAndroidAppVersion);

export default router;