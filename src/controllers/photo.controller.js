import fs from 'node:fs';
import db from '../models/db.js';
import { join, basename, resolve } from 'path';
import { UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';
import { uploadOrReplacePhoto } from '../utils/photoUploader.js';

const UPLOAD_DIR_PROFILES = resolve('src', UPLOAD_DIR_PROFILES_STRING);

export const uploadPhoto = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const file = req.file;
        const position = parseInt(req.body.position) || null;

        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        // Validación extra: máximo 4 fotos
        const result = await db.query('SELECT COUNT(*) FROM user_photos WHERE user_id = $1', [userId]);
        const count = parseInt(result.rows[0].count);
        if (count >= 4 && position === null) {
            return res.status(400).json({ message: 'Maximum 4 photos allowed' });
        }

        const finalPosition = position ?? count + 1;
        const url = await uploadOrReplacePhoto(userId, file, finalPosition);

        res.status(201).json({ url });
    } catch (err) {
        next(err);
    }
};

export const getUserPhotos = async (req, res, next) => {
    try {
        const userId = req.query.userId;
        const result = await db.query(
            'SELECT id, user_id, url, position FROM user_photos WHERE user_id = $1 ORDER BY position ASC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
};

export const deletePhoto = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const photoId = req.params.photoId;

        const result = await db.query('SELECT * FROM user_photos WHERE id = $1 AND user_id = $2', [photoId, userId]);
        const photo = result.rows[0];
        if (!photo) return res.status(404).json({ message: 'Photo not found', shouldLogout: false });

        const all = await db.query('SELECT COUNT(*) FROM user_photos WHERE user_id = $1', [userId]);
        if (parseInt(all.rows[0].count) <= 1) {
            return res.status(400).json({ message: 'At least one photo is required' });
        }

        const filePath = join(UPLOAD_DIR_PROFILES, userId, basename(photo.url));
        fs.unlinkSync(filePath);

        await db.query('DELETE FROM user_photos WHERE id = $1', [photoId]);
        await db.query('UPDATE user_photos SET position = position - 1 WHERE user_id = $1 AND position > $2', [userId, photo.position]);

        res.status(200).json({ message: 'Photo deleted' });
    } catch (err) {
        next(err);
    }
};