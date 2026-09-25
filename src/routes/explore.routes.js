import express from 'express';
import {
    getCategories,
    getCategoryFeed,
    getCategorySettings,
    updateCategorySettings,
} from '../controllers/explore.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
    categoryFeedQuery,
    categoryParamsSchema,
    updateCategorySettingsSchema,
} from '../validation/explore.schemas.js';

const router = express.Router();

router.use(authenticateToken());

router.get('/categories', getCategories);
router.get('/categories/:categoryId/feed', validate({ params: categoryParamsSchema, query: categoryFeedQuery }), getCategoryFeed);
router.get('/categories/:categoryId/settings', validate({ params: categoryParamsSchema }), getCategorySettings);
router.put('/categories/:categoryId/settings', validate({ params: categoryParamsSchema, body: updateCategorySettingsSchema }), updateCategorySettings);

export default router;
