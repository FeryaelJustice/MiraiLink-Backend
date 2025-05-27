import fs from 'fs';
import path from 'path';
import db from '../models/db.js';
import { UPLOAD_DIR_STRING, UPLOAD_DIR_IMG_STRING, UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';

const UPLOAD_DIR = path.resolve(UPLOAD_DIR_STRING);
const UPLOAD_DIR_PROFILES = path.resolve(UPLOAD_DIR_PROFILES_STRING);

export const uploadPhoto = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const file = req.file;
        if (!file) return res.status(400).json({ message: 'No file uploaded' });

        const date = Date.now()
        const fileUrl = `${UPLOAD_DIR_PROFILES_STRING}${date}${file.filename}`;

        // Verifica cuántas fotos tiene el usuario
        const result = await db.query('SELECT COUNT(*) FROM user_photos WHERE user_id = $1', [userId]);
        const count = parseInt(result.rows[0].count);

        if (count >= 4) return res.status(400).json({ message: 'Maximum 4 photos allowed' });

        await db.query(
            'INSERT INTO user_photos (user_id, url, position) VALUES ($1, $2, $3, $4)',
            [userId, fileUrl, count + 1]
        );

        res.status(201).json({ url: fileUrl });
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
        if (!photo) return res.status(404).json({ message: 'Photo not found' });

        const all = await db.query('SELECT COUNT(*) FROM user_photos WHERE user_id = $1', [userId]);
        if (parseInt(all.rows[0].count) <= 1) {
            return res.status(400).json({ message: 'At least one photo is required' });
        }

        const filePath = path.join(UPLOAD_DIR_PROFILES, path.basename(photo.url));
        fs.unlinkSync(filePath);

        await db.query('DELETE FROM user_photos WHERE id = $1', [photoId]);
        await db.query('UPDATE user_photos SET position = position - 1 WHERE user_id = $1 AND position > $2', [userId, photo.position]);

        res.status(200).json({ message: 'Photo deleted' });
    } catch (err) {
        next(err);
    }
};