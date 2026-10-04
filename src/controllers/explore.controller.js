import { resolveCatalogLanguage } from '../utils/catalogLocalization.js';
import {
    getCategoryFeedUsers,
    getCategorySettings as fetchCategorySettings,
    getExploreSectionsWithCategories,
    updateCategorySettings as saveCategorySettings,
} from '../services/explore.service.js';

export const getCategories = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const result = await getExploreSectionsWithCategories(req.user.id, locale);
        res.json(result);
    } catch (error) {
        next(error);
    }
};

export const getCategoryFeed = async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        const { limit = 20, offset = 0, radius_km, target_gender } = req.query;
        const locale = resolveCatalogLanguage(req.get('accept-language'));

        const users = await getCategoryFeedUsers(req.user.id, categoryId, {
            limit: Number(limit),
            offset: Number(offset),
            radiusKmOverride: radius_km !== undefined ? Number(radius_km) : undefined,
            genderOverride: target_gender,
            locale,
            req,
        });

        res.json(users);
    } catch (error) {
        next(error);
    }
};

export const getCategorySettings = async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        const settings = await fetchCategorySettings(req.user.id, categoryId);
        res.json(settings);
    } catch (error) {
        next(error);
    }
};

export const updateCategorySettings = async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        const { radius_km, target_gender } = req.body;
        const updated = await saveCategorySettings(req.user.id, categoryId, { radius_km, target_gender });
        res.json(updated);
    } catch (error) {
        next(error);
    }
};
