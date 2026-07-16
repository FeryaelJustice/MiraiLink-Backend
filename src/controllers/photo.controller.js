import db from '../models/db.js';
import { cleanupStagedPhoto, finalizePhoto, removePhotoFile, stagePhoto } from '../utils/photoStorage.js';

export const uploadPhoto = async (req, res, next) => {
    if (!req.file) return res.status(400).json({ code: 'FILE_REQUIRED', message: 'A photo is required' });
    const client = await db.connect();
    let staged;
    try {
        staged = await stagePhoto(req.user.id, req.file);
        await client.query('BEGIN');
        const locked = await client.query('SELECT position FROM user_photos WHERE user_id = $1 FOR UPDATE', [req.user.id]);
        const position = req.body.position ? Number(req.body.position) : locked.rows.length + 1;
        if (position < 1 || position > 4 || (locked.rows.length >= 4 && !req.body.position)) {
            await client.query('ROLLBACK');
            await cleanupStagedPhoto(staged);
            return res.status(400).json({ code: 'PHOTO_LIMIT', message: 'Maximum four photos are allowed' });
        }
        const previous = await client.query('DELETE FROM user_photos WHERE user_id = $1 AND position = $2 RETURNING url', [req.user.id, position]);
        await client.query('INSERT INTO user_photos (user_id, url, position) VALUES ($1, $2, $3)', [req.user.id, staged.url, position]);
        await finalizePhoto(staged);
        await client.query('COMMIT');
        if (previous.rows[0]) await removePhotoFile(previous.rows[0].url);
        return res.status(201).json({ url: staged.url, position });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        if (staged) await cleanupStagedPhoto(staged);
        return next(error);
    } finally {
        client.release();
    }
};

export const getUserPhotos = async (req, res, next) => {
    try {
        const result = await db.query('SELECT id, user_id, url, position FROM user_photos WHERE user_id = $1 ORDER BY position', [req.query.userId ?? req.user.id]);
        return res.json(result.rows);
    } catch (error) {
        return next(error);
    }
};

export const deletePhoto = async (req, res, next) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const locked = await client.query('SELECT position FROM user_photos WHERE user_id = $1 FOR UPDATE', [req.user.id]);
        if (locked.rows.length <= 1) {
            await client.query('ROLLBACK');
            return res.status(400).json({ code: 'PHOTO_REQUIRED', message: 'At least one photo is required' });
        }
        const deleted = await client.query('DELETE FROM user_photos WHERE id = $1 AND user_id = $2 RETURNING url, position', [req.params.photoId, req.user.id]);
        if (!deleted.rows[0]) {
            await client.query('ROLLBACK');
            return res.status(404).json({ code: 'PHOTO_NOT_FOUND', message: 'Photo not found' });
        }
        await client.query('UPDATE user_photos SET position = position - 1 WHERE user_id = $1 AND position > $2', [req.user.id, deleted.rows[0].position]);
        await client.query('COMMIT');
        await removePhotoFile(deleted.rows[0].url);
        return res.json({ message: 'Photo deleted' });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        return next(error);
    } finally {
        client.release();
    }
};
