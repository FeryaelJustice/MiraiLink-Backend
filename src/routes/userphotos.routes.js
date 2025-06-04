import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { join, extname, dirname } from 'path';
import fs from 'fs';
import { uploadPhoto, getUserPhotos, deletePhoto } from '../controllers/photo.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcRoot = join(__dirname, '..');

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const userId = req.user.id;
        const userFolder = join(srcRoot, UPLOAD_DIR_PROFILES_STRING, userId);

        // Asegúrate de que existe la carpeta del usuario
        try {
            await fs.promises.mkdir(userFolder, { recursive: true });
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
