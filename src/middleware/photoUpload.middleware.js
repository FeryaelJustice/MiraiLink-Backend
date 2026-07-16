import multer from 'multer';
import { validateImage } from '../utils/imageValidation.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxBytes = Number(process.env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024);

function fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
        callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
        return;
    }
    callback(null, true);
}

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: maxBytes, files: 4, fields: 30 },
});

export const profilePhotoUpload = upload.fields([
    { name: 'photo_0', maxCount: 1 },
    { name: 'photo_1', maxCount: 1 },
    { name: 'photo_2', maxCount: 1 },
    { name: 'photo_3', maxCount: 1 },
]);

export const singlePhotoUpload = upload.single('photo');

export function validateUploadedImages(req, _res, next) {
    try {
        const files = req.file
            ? [req.file]
            : Object.values(req.files ?? {}).flat();
        for (const file of files) {
            file.detectedType = validateImage(file);
        }
        next();
    } catch (error) {
        next(error);
    }
}
