import db from '../models/db.js';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { join, basename, dirname } from 'path';
import { UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';

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

        // 4. Actualizar fotos

        // Obtener fotos antiguas
        const previousPhotos = await client.query(
            'SELECT * FROM user_photos WHERE user_id = $1',
            [userId]
        );

        // Eliminar del sistema archivos antiguos (si existen físicamente)
        for (const photo of previousPhotos.rows) {
            const filePath = join(__dirname, '..', UPLOAD_DIR_PROFILES_STRING, userId, basename(photo.url));
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

        // Borrar referencias anteriores de la base de datos
        await client.query('DELETE FROM user_photos WHERE user_id = $1', [userId]);

        // Insertar nuevas fotos a partir de los archivos recibidos
        for (const [key, fileList] of Object.entries(req.files)) {
            const file = Array.isArray(fileList) ? fileList[0] : fileList;
            const field = key; // Ej: "photo_0"
            const positionStr = field.split('_')[1]; // "0"
            const position = parseInt(positionStr, 10);

            const url = `${UPLOAD_DIR_PROFILES_STRING}/${userId}/${file.filename}`;
            await client.query(
                'INSERT INTO user_photos (user_id, url, position) VALUES ($1, $2, $3)',
                [userId, url, position + 1] // +1 ya tenemos photo_0 al photo_3 que las posiciones deben ir del 1 al 4
            );
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