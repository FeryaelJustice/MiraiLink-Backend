import express from 'express';
import multer from 'multer';
import { join, extname, resolve } from 'path';
import fs from 'node:fs/promises';
import { uploadPhoto, getUserPhotos, deletePhoto } from '../controllers/photo.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';

const router = express.Router();

const UPLOAD_DIR_PROFILES = resolve('src', UPLOAD_DIR_PROFILES_STRING);

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const userId = req.user.id;
        const userFolder = join(UPLOAD_DIR_PROFILES, userId);

        // Asegúrate de que existe la carpeta del usuario
        try {
            await fs.mkdir(userFolder, { recursive: true });
            cb(null, userFolder);
        } catch (err) {
            cb(err, userFolder); // Error al crear la carpeta
        }
    },
    filename: (req, file, cb) => {
        const ext = extname(file.originalname); // conserva la extensión original
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, filename);
    }
});


const upload = multer({ storage });

router.get('', authenticateToken(), getUserPhotos);
router.post('', authenticateToken(), upload.single('photo'), uploadPhoto);
router.delete('/:photoId', authenticateToken(), deletePhoto);

export default router;
