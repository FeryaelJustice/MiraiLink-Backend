import express from 'express';
import { z } from 'zod';
import { deleteAccount, deleteUserPhoto, getProfile, getProfileFromId, saveFCMToken, updateProfile } from '../controllers/user.controller.js';
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
    animes: z.string().max(20_000).optional(), games: z.string().max(20_000).optional(),
    reorderedPositions: z.string().max(20_000).optional(),
    photo_0: z.string().optional(), photo_1: z.string().optional(),
    photo_2: z.string().optional(), photo_3: z.string().optional(),
});
router.use(authenticateToken());
router.get('/', getProfile);
router.post('/byId', validate({ body: profileByIdSchema }), getProfileFromId);
router.post('/fcm', validate({ body: fcmSchema }), saveFCMToken);
router.put('/', profilePhotoUpload, validateUploadedImages, validate({ body: profileUpdateSchema }), updateProfile);
router.delete('/', deleteAccount);
router.delete('/photo/:position', validate({ params: photoPositionParams }), deleteUserPhoto);
export default router;
