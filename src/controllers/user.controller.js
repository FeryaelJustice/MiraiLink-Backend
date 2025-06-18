import db from '../models/db.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import bcrypt from 'bcrypt';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname, basename } from 'path';
import { uploadOrReplacePhoto } from '../utils/photoUploader.js';

const MAX_NICKNAME_LENGTH = 30;
const MAX_BIO_LENGTH = 500;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const userResult = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];

        const animesResult = await db.query(`
            SELECT a.id, a.name, a.image_url
            FROM animes a
            JOIN user_anime_interests uai ON uai.anime_id = a.id
            WHERE uai.user_id = $1
        `, [userId]);

        const gamesResult = await db.query(`
            SELECT g.id, g.name, g.image_url
            FROM games g
            JOIN user_game_interests ugi ON ugi.game_id = g.id
            WHERE ugi.user_id = $1
        `, [userId]);

        const photosResult = await db.query(`
            SELECT id, user_id, url, position
            FROM user_photos
            WHERE user_id = $1
            ORDER BY position ASC
        `, [userId]);

        res.json({
            ...user,
            animes: animesResult.rows,
            games: gamesResult.rows,
            photos: photosResult.rows
        });
    } catch (err) {
        next(err);
    }
};

export const getProfileFromId = async (req, res, next) => {
    try {
        const { id } = req.body;

        const usersResult = await db.query('SELECT * FROM users WHERE is_deleted = false AND id = $1', [id]);
        const user = usersResult.rows[0];

        const animesResult = await db.query(`
            SELECT a.id, a.name, a.image_url
            FROM animes a
            JOIN user_anime_interests uai ON uai.anime_id = a.id
            WHERE uai.user_id = $1
        `, [id]);

        const gamesResult = await db.query(`
            SELECT g.id, g.name, g.image_url
            FROM games g
            JOIN user_game_interests ugi ON ugi.game_id = g.id
            WHERE ugi.user_id = $1
        `, [id]);

        const photosResult = await db.query(`
            SELECT id, user_id, url, position
            FROM user_photos
            WHERE user_id = $1
            ORDER BY position ASC
        `, [id]);

        res.json({
            ...user,
            animes: animesResult.rows,
            games: gamesResult.rows,
            photos: photosResult.rows
        });
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

export const deleteAccount = async (req, res) => {
    const userId = req.user.id;

    try {
        const result = await db.query(
            `UPDATE users SET is_deleted = true, updated_at = now() WHERE id = $1 RETURNING id`,
            [userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o ya eliminado.' });
        }

        // Opcional: invalidar token actual
        await db.query('INSERT INTO token_blacklist (token) VALUES ($1)', [req.token]);

        return res.status(200).json({ message: 'Cuenta eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar cuenta:', error);
        return res.status(500).json({ message: 'Error al eliminar cuenta.' });
    }
};

export const publicDeleteAccount = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar el usuario por email
        const userResult = await db.query(
            'SELECT id, password_hash FROM users WHERE email = $1 AND is_deleted = false',
            [email]
        );

        if (userResult.rowCount === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o ya eliminado.' });
        }

        const user = userResult.rows[0];

        // 2. Verificar la contraseña
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ message: 'Contraseña incorrecta.' });
        }

        // 3. Marcar como eliminado
        await db.query(
            `UPDATE users SET is_deleted = true, updated_at = now() WHERE id = $1`,
            [user.id]
        );

        return res.status(200).json({ message: 'Cuenta eliminada correctamente.' });
    } catch (error) {
        console.error('Error eliminando cuenta públicamente:', error);
        return res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

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

        const animesResult = await db.query(`
            SELECT uai.user_id, a.id, a.name, a.image_url
            FROM user_anime_interests uai
            JOIN animes a ON uai.anime_id = a.id
            WHERE uai.user_id = ANY($1::uuid[])
        `, [userIds]);

        const gamesResult = await db.query(`
            SELECT ugi.user_id, g.id, g.name, g.image_url
            FROM user_game_interests ugi
            JOIN games g ON ugi.game_id = g.id
            WHERE ugi.user_id = ANY($1::uuid[])
        `, [userIds]);

        const photosByUser = {};
        const animesByUser = {};
        const gamesByUser = {};

        for (const photo of photosResult.rows) {
            if (!photosByUser[photo.user_id]) photosByUser[photo.user_id] = [];
            photosByUser[photo.user_id].push(photo);
        }

        for (const anime of animesResult.rows) {
            if (!animesByUser[anime.user_id]) animesByUser[anime.user_id] = [];
            animesByUser[anime.user_id].push({
                id: anime.id,
                name: anime.name,
                image_url: anime.image_url
            });
        }

        for (const game of gamesResult.rows) {
            if (!gamesByUser[game.user_id]) gamesByUser[game.user_id] = [];
            gamesByUser[game.user_id].push({
                id: game.id,
                name: game.name,
                image_url: game.image_url
            });
        }

        const usersWithExtras = users.map(user => ({
            ...user,
            photos: photosByUser[user.id] || [],
            animes: animesByUser[user.id] || [],
            games: gamesByUser[user.id] || []
        }));

        res.json(usersWithExtras);
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

        // Validaciones
        if (nickname.length > MAX_NICKNAME_LENGTH) {
            return res.status(400).json({ message: 'El apodo es demasiado largo' });
        }
        if (bio.length > MAX_BIO_LENGTH) {
            return res.status(400).json({ message: 'La biografía es demasiado larga' });
        }

        // Comenzar transacción
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

        // 4. Validar que no se superen las 4 fotos permitidas
        const existingPhotosResult = await client.query(
            'SELECT position FROM user_photos WHERE user_id = $1',
            [userId]
        );
        const existingPositions = new Set(existingPhotosResult.rows.map(row => row.position));

        const newPositions = Object.entries(req.files)
            .map(([key]) => parseInt(key.split('_')[1], 10) + 1); // photo_0 → 1

        const positionsThatWouldBeAdded = newPositions.filter(pos => !existingPositions.has(pos));

        if (existingPositions.size + positionsThatWouldBeAdded.length > 4) {
            return res.status(400).json({ message: 'Máximo 4 fotos permitidas' });
        }

        // 4.1. Detectar fotos que el usuario eliminó explícitamente (no las que omitió porque no cambiaron)
        const removedPositions = [];
        for (const pos of [1, 2, 3, 4]) {
            const fieldKey = `photo_${pos - 1}`;
            const fieldInRequest = Object.prototype.hasOwnProperty.call(req.body, fieldKey);
            const fileUploaded = Object.prototype.hasOwnProperty.call(req.files, fieldKey);

            // Si se envía el campo pero no hay foto => quiere eliminarla
            if (fieldInRequest && !fileUploaded) {
                removedPositions.push(pos);
            }
        }

        // 4.2. Obtener URLs de fotos eliminadas antes de borrarlas de la BD
        let removedPhotosResult = { rows: [] };
        if (removedPositions.length > 0) {
            removedPhotosResult = await client.query(
                'SELECT url FROM user_photos WHERE user_id = $1 AND position = ANY($2)',
                [userId, removedPositions]
            );

            await client.query(
                'DELETE FROM user_photos WHERE user_id = $1 AND position = ANY($2)',
                [userId, removedPositions]
            );
        }

        // 4.3. Borrar físicamente los archivos eliminados
        for (const row of removedPhotosResult.rows) {
            const filePath = join(__dirname, '..', 'uploads', row.url); // ajusta según tu estructura
            fs.unlink(filePath, err => {
                if (err) console.error(`Error deleting file ${filePath}:`, err);
            });
        }

        // 5. Actualizar fotos
        for (const [key, fileList] of Object.entries(req.files)) {
            const file = Array.isArray(fileList) ? fileList[0] : fileList;
            const field = key; // Ej: photo_0
            const positionStr = field.split('_')[1];
            const position = parseInt(positionStr, 10) + 1; // photo_0 → position 1

            await uploadOrReplacePhoto(userId, file, position, client);
        }

        // 6. Reordenar todas las fotos del usuario para que vayan de 1 a N sin huecos
        const updatedPhotosResult = await client.query(
            'SELECT id FROM user_photos WHERE user_id = $1 ORDER BY position ASC',
            [userId]
        );

        for (let i = 0; i < updatedPhotosResult.rows.length; i++) {
            const photoId = updatedPhotosResult.rows[i].id;
            const newPosition = i + 1;
            await client.query(
                'UPDATE user_photos SET position = $1 WHERE id = $2 AND position != $1',
                [newPosition, photoId]
            );
        }

        await client.query('COMMIT');

        // 7. Limpieza de archivos basura (no referenciados en BD)
        try {
            const userDir = join(__dirname, '..', 'uploads', userId);
            fs.readdir(userDir, async (err, files) => {
                if (err) {
                    console.error(`Error leyendo carpeta de usuario ${userDir}:`, err);
                    return;
                }

                try {
                    const result = await db.query(
                        'SELECT url FROM user_photos WHERE user_id = $1',
                        [userId]
                    );
                    const usedFiles = result.rows.map(row => row.url);

                    for (const file of files) {
                        if (!usedFiles.includes(file)) {
                            const pathToDelete = join(userDir, file);
                            fs.unlink(pathToDelete, err => {
                                if (err) console.error(`Error eliminando archivo basura ${pathToDelete}:`, err);
                            });
                        }
                    }
                } catch (queryErr) {
                    console.error('Error al consultar archivos válidos en la BD:', queryErr);
                }
            });
        } catch (fsError) {
            console.error('Error al limpiar archivos basura:', fsError);
        }

        res.status(200).json({ message: 'Profile updated' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating profile:', err);
        next(err);
    } finally {
        client.release();
    }
};

export const deleteUserPhoto = async (req, res) => {
    const client = await db.connect();
    try {
        const userId = req.user.id;
        const position = parseInt(req.params.position);

        if (![1, 2, 3, 4].includes(position)) {
            return res.status(400).json({ message: 'Posición inválida' });
        }

        await client.query('BEGIN');

        // 1. Obtener la URL para borrarla físicamente
        const result = await client.query(
            'SELECT url FROM user_photos WHERE user_id = $1 AND position = $2',
            [userId, position]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Foto no encontrada' });
        }

        const url = result.rows[0].url;

        // 2. Borrar de la BD
        await client.query(
            'DELETE FROM user_photos WHERE user_id = $1 AND position = $2',
            [userId, position]
        );

        // 3. Reordenar las posiciones
        await client.query(
            `UPDATE user_photos
            SET position = position - 1
            WHERE user_id = $1 AND position > $2`,
            [userId, position]
        );

        await client.query('COMMIT');

        // 4. Borrar archivo físicamente
        const fsPath = join(__dirname, '..', 'uploads', userId, basename(url));
        fs.unlink(fsPath, err => {
            if (err) console.error(`Error borrando el archivo: ${fsPath}`, err);
        });

        return res.status(200).json({ message: 'Foto eliminada correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Error al eliminar la foto' });
    } finally {
        client.release();
    }
};
