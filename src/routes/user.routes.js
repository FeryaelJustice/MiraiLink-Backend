import express from 'express';
import { z } from 'zod';
import {
    deleteAccount,
    deleteUserPhoto,
    getLocationHistory,
    getProfile,
    getProfileFromId,
    locationPing,
    saveFCMToken,
    updateProfile,
    updateSearchSettings,
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { profilePhotoUpload, validateUploadedImages } from '../middleware/photoUpload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { fcmSchema, photoPositionParams, profileByIdSchema } from '../validation/user.schemas.js';

const router = express.Router();

const profileUpdateSchema = z.object({
    nickname: z.string().trim().max(30).optional(),
    bio: z.string().trim().max(500).optional(),
    gender: z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say', '']).optional(),
    birthdate: z.iso.date().or(z.literal('')).optional(),
    animes: z.string().max(20_000).optional(),
    games: z.string().max(20_000).optional(),
    reorderedPositions: z.string().max(20_000).optional(),
    photo_0: z.string().optional(),
    photo_1: z.string().optional(),
    photo_2: z.string().optional(),
    photo_3: z.string().optional(),
    residence_city: z.string().trim().max(100).nullable().optional(),
    residence_region: z.string().trim().max(100).nullable().optional(),
    residence_country_code: z.string().trim().max(10).nullable().optional(),
    residence_latitude: z.preprocess(value => value === '' ? null : value, z.coerce.number().min(-90).max(90).nullable()).optional(),
    residence_longitude: z.preprocess(value => value === '' ? null : value, z.coerce.number().min(-180).max(180).nullable()).optional(),
});

const searchSettingsSchema = z.object({
    search_radius_km: z.coerce.number().int().min(10).max(300).default(40),
    search_scope: z.enum(['radius_residence', 'radius_active', 'country', 'world', 'specific_country']).default('radius_residence'),
    search_target_country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Invalid ISO country code').nullable().optional(),
    search_match_live_location: z.boolean().default(false),
});

const locationPingSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    city: z.string().trim().max(100).nullable().optional(),
    country_code: z.string().trim().max(10).nullable().optional(),
});

router.use(authenticateToken());
router.get('/', getProfile);
router.post('/byId', validate({ body: profileByIdSchema }), getProfileFromId);
router.post('/fcm', validate({ body: fcmSchema }), saveFCMToken);
router.put('/', profilePhotoUpload, validateUploadedImages, validate({ body: profileUpdateSchema }), updateProfile);
router.put('/settings/search', validate({ body: searchSettingsSchema }), updateSearchSettings);
router.post('/location/ping', validate({ body: locationPingSchema }), locationPing);
router.get('/location/history', getLocationHistory);
router.delete('/', deleteAccount);
router.delete('/photo/:position', validate({ params: photoPositionParams }), deleteUserPhoto);

export default router;
