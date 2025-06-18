
import express from 'express';
import { getProfile, deleteAccount, updateProfile, getProfileFromId, getUserIdByToken, getUserIdByEmailAndPassword, publicDeleteAccount, deleteUserPhoto } from '../controllers/user.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { join, extname, dirname } from 'path';
import fs from 'fs';
import { UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcRoot = join(__dirname, '..');

// Para las fotos, aunque este en el photos.routes.js, es necesario importar multer y configurarlo aquí
// porque multer necesita acceso al request para saber a qué carpeta subir la foto del usuario.
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

const photoFields = [
    { name: 'photo_0', maxCount: 1 },
    { name: 'photo_1', maxCount: 1 },
    { name: 'photo_2', maxCount: 1 },
    { name: 'photo_3', maxCount: 1 }
];

router.get('', authenticateToken(), getProfile);
router.get('/byToken', authenticateToken(), getUserIdByToken);
router.post('/byEmailPassword', getUserIdByEmailAndPassword);
router.post('/byId', authenticateToken(), getProfileFromId);
router.put('', authenticateToken(), upload.fields(photoFields), (req, res, next) => {
    // console.log('---- BODY ----');
    // console.log(req.body);
    // console.log('---- FILES ----');
    // console.log(req.files);
    next();
}, updateProfile);
router.post('/public/delete-account', publicDeleteAccount);
router.delete('', authenticateToken(), deleteAccount);
router.delete('/photo/:position', authenticateToken(), deleteUserPhoto);

export default router;