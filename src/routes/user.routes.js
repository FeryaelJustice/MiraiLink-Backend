import express from 'express';
import { z } from 'zod';
import {
    deleteAccount,
    deleteUserPhoto,
    getLocationHistory,
    getProfile,
    getProfileFromId,
    getProfileByUsername,
    locationPing,
    saveFCMToken,
    updateProfile,
    updateSearchSettings,
} from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { profilePhotoUpload, validateUploadedImages } from '../middleware/photoUpload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { optionalUuid } from '../validation/common.schemas.js';
import { fcmSchema, photoPositionParams, profileByIdSchema, profileByUsernameParams } from '../validation/user.schemas.js';

const router = express.Router();

const profileUpdateSchema = z.object({
    nickname: z.string().trim().max(30).optional(),
    bio: z.string().trim().max(500).optional(),
    profession: z.string().trim().max(100).nullable().optional(),
    religion_id: optionalUuid,
    zodiac_sign_id: optionalUuid,
    political_stance_id: optionalUuid,
    smoking_habit_id: optionalUuid,
    drinking_habit_id: optionalUuid,
    sexual_orientation_id: optionalUuid,
    education_level_id: optionalUuid,
    relationship_goals: z.string().max(20_000).optional(),
    family_options: z.string().max(20_000).optional(),
    spoken_languages: z.string().max(20_000).optional(),
    prompts: z.string().max(20_000).optional(),
    animes: z.string().max(20_000).optional(),
    games: z.string().max(20_000).optional(),
    reorderedPositions: z.string().max(20_000).optional(),
    photo_0: z.string().optional(),
    photo_1: z.string().optional(),
    photo_2: z.string().optional(),
    photo_3: z.string().optional(),
    residence_country_id: optionalUuid,
    residence_region_id: optionalUuid,
    residence_city_id: optionalUuid,
    residence_latitude: z.preprocess(value => value === '' ? null : value, z.coerce.number().min(-90).max(90).nullable()).optional(),
    residence_longitude: z.preprocess(value => value === '' ? null : value, z.coerce.number().min(-180).max(180).nullable()).optional(),
});

const searchSettingsSchema = z.object({
    search_radius_km: z.coerce.number().int().min(10).max(800).default(40),
    search_scope: z.enum(['radius_residence', 'radius_active', 'country', 'world', 'specific_country']).default('radius_residence'),
    search_target_country_id: optionalUuid,
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
router.get('/by-username/:username', validate({ params: profileByUsernameParams }), getProfileByUsername);
router.post('/byId', validate({ body: profileByIdSchema }), getProfileFromId);
router.post('/fcm', validate({ body: fcmSchema }), saveFCMToken);
router.put('/', profilePhotoUpload, validateUploadedImages, validate({ body: profileUpdateSchema }), updateProfile);
router.put('/settings/search', validate({ body: searchSettingsSchema }), updateSearchSettings);
router.post('/location/ping', validate({ body: locationPingSchema }), locationPing);
router.get('/location/history', getLocationHistory);
router.delete('/', deleteAccount);
router.delete('/photo/:position', validate({ params: photoPositionParams }), deleteUserPhoto);

export default router;
