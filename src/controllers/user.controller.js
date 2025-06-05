import db from '../models/db.js';
import jwt from 'jsonwebtoken';

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
    try {
        const userId = req.user.id;
        const { bio } = req.body;
        await db.query('UPDATE users SET bio = $1 WHERE id = $2', [bio, userId]);
        res.status(200).json({ message: 'Profile updated' });
    } catch (err) {
        next(err);
    }
};