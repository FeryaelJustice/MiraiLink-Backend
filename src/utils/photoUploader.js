import fs from 'fs/promises';
import { join, basename, resolve } from 'path';
import db from '../models/db.js';
import { UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';

const UPLOAD_DIR_PROFILES = resolve('src', UPLOAD_DIR_PROFILES_STRING);

export async function uploadOrReplacePhoto(userId, file, position, client = db) {
    // Eliminar antigua si existe en esa posición
    const previous = await client.query(
        'SELECT * FROM user_photos WHERE user_id = $1 AND position = $2',
        [userId, position]
    );

    if (previous.rows.length > 0) {
        const oldPath = join(UPLOAD_DIR_PROFILES, userId, basename(previous.rows[0].url));
        try {
            await fs.unlink(oldPath);
        } catch (err) {
            console.warn('No se pudo borrar:', oldPath, err.message);
        }

        await client.query(
            'DELETE FROM user_photos WHERE user_id = $1 AND position = $2',
            [userId, position]
        );
    }

    const url = `${UPLOAD_DIR_PROFILES_STRING}/${userId}/${file.filename}`;
    await client.query(
        'INSERT INTO user_photos (user_id, url, position) VALUES ($1, $2, $3)',
        [userId, url, position]
    );

    return url;
}
