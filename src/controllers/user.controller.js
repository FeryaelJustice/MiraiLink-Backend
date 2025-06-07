import db from '../models/db.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';

export const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];
        res.json(user);
    } catch (err) {
        next(err);
    }
};

export const getProfileFromId = async (req, res, next) => {
    try {
        const { id } = req.body;
        const usersResult = await db.query('SELECT * FROM users WHERE is_deleted = false AND id = $1', [id]);
        const user = usersResult.rows[0];

        res.json(user);
    } catch (err) {
        next(err);
    }
};

export const getUserIdByToken = async (req, res, next) => {
    try {
        const { token } = req.body;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ userId: decoded.id });
    } catch (err) {
        next(err);
    }
}

export const getUserIdByEmailAndPassword = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.json({ userId: user.id });
    } catch (err) {
        next(err);
    }
}

export const getProfiles = async (req, res, next) => {
    try {
        const authenticatedUserId = req.user.id;

        const usersResult = await db.query('SELECT * FROM users WHERE is_deleted = false AND id != $1', [authenticatedUserId]);
        const users = usersResult.rows;

        // Obtener fotos para todos los usuarios
        const userIds = users.map(user => user.id);
        const photosResult = await db.query(
            'SELECT id, user_id, url, position FROM user_photos WHERE user_id = ANY($1::uuid[]) ORDER BY position ASC',
            [userIds]
        );

        // Agrupar las fotos por user_id
        const photosByUser = {};
        for (const photo of photosResult.rows) {
            if (!photosByUser[photo.user_id]) {
                photosByUser[photo.user_id] = [];
            }
            photosByUser[photo.user_id].push({
                id: photo.id,
                user_id: photo.user_id,
                url: photo.url,
                position: photo.position
            });
        }

        // Combinar users con sus fotos
        const usersWithPhotos = users.map(user => ({
            ...user,
            photos: photosByUser[user.id] || []
        }));


        res.json(usersWithPhotos);
    } catch (err) {
        next(err);
    }
}

export const updateProfile = async (req, res, next) => {
    const client = await db.connect();

    try {
        const userId = req.user.id;
        const { nickname, bio, animes, games, photos } = req.body;
        const files = req.files || [];
        console.log(games, animes)

        await client.query('BEGIN');

        // 1. Actualizar nickname y bio
        await client.query(
            'UPDATE users SET nickname = $1, bio = $2 WHERE id = $3',
            [nickname, bio, userId]
        );

        // 2. Actualizar gustos (anime)
        await client.query('DELETE FROM user_anime_interests WHERE user_id = $1', [userId]);
        const animeTitles = JSON.parse(animes || '[]');
        if (animeTitles.length > 0) {
            const animeIds = animeTitles.map(r => r.id);
            console.log(animeIds)
            for (const animeId of animeIds) {
                await client.query(
                    'INSERT INTO user_anime_interests (user_id, anime_id) VALUES ($1, $2)',
                    [userId, animeId]
                );
            }
        }

        // 3. Actualizar gustos (juegos)
        await client.query('DELETE FROM user_game_interests WHERE user_id = $1', [userId]);
        const gameTitles = JSON.parse(games || '[]');
        if (gameTitles.length > 0) {
            const gameIds = gameTitles.map(r => r.id);
            for (const gameId of gameIds) {
                await client.query(
                    'INSERT INTO user_game_interests (user_id, game_id) VALUES ($1, $2)',
                    [userId, gameId]
                );
            }
        }

        // 4. Actualizar fotos
        const photosArray = JSON.parse(photos || '[]');

        // Obtener fotos antiguas de la base de datos
        const previousPhotos = await client.query(
            'SELECT * FROM user_photos WHERE user_id = $1',
            [userId]
        );

        // Borrado lógico + archivos si ya no están en el nuevo array
        const newUrls = photosArray.map(p => p.url).filter(Boolean);
        for (const photo of previousPhotos.rows) {
            if (!newUrls.includes(photo.url)) {
                const filePath = path.join(UPLOAD_DIR_PROFILES_STRING, path.basename(photo.url));
                fs.access(filePath, fs.constants.F_OK, err => {
                    if (!err) {
                        fs.unlink(filePath, unlinkErr => {
                            if (unlinkErr) {
                                console.error('Error al eliminar la imagen:', unlinkErr);
                            }
                        });
                    } else {
                        console.warn('Archivo no encontrado, no se puede eliminar:', filePath);
                    }
                });
            }
        }

        // Limpiar todas las fotos en BBDD
        await client.query('DELETE FROM user_photos WHERE user_id = $1', [userId]);

        // Insertar nuevas fotos según posición
        for (const p of photosArray) {
            const { position, url } = p;
            const fileKey = `photo_${position}`;
            const file = Array.isArray(files[fileKey]) ? files[fileKey][0] : files[fileKey];

            let finalUrl = url;

            if (file) {
                // Nueva foto, subirla
                finalUrl = `${UPLOAD_DIR_PROFILES_STRING}/${userId}/${file.filename}`;
            }

            if (finalUrl) {
                await client.query(
                    'INSERT INTO user_photos (user_id, url, position) VALUES ($1, $2, $3)',
                    [userId, finalUrl, position]
                );
            }
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Profile updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating profile:', err);
        next(err);
    } finally {
        client.release();
    }
};