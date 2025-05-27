import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadPhoto, getUserPhotos, deletePhoto } from '../controllers/photo.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { UPLOAD_DIR_STRING, UPLOAD_DIR_IMG_STRING, UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: UPLOAD_DIR_PROFILES_STRING,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // conserva la extensión original
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, filename);
    }
});


const upload = multer({ storage });

router.get('/', authenticateToken(), getUserPhotos);
router.post('/', authenticateToken(), upload.single('photo'), uploadPhoto);
router.delete('/:photoId', authenticateToken(), deletePhoto);

export default router;
