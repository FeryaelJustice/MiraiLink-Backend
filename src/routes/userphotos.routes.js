import express from 'express';
import { uploadPhoto, getUserPhotos, deletePhoto } from '../controllers/photo.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { singlePhotoUpload, validateUploadedImages } from '../middleware/photoUpload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { photoIdParams, photoQuerySchema } from '../validation/user.schemas.js';

const router = express.Router();
router.use(authenticateToken());
router.get('/', validate({ query: photoQuerySchema }), getUserPhotos);
router.post('/', singlePhotoUpload, validateUploadedImages, uploadPhoto);
router.delete('/:photoId', validate({ params: photoIdParams }), deletePhoto);

export default router;
