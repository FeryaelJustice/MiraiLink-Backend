import bcrypt, { genSalt } from 'bcrypt';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import { sendVerificationEmail } from '../utils/mailer.js';
import db from '../models/db.js';

// Utilidad para generar un código de 6 dígitos
const generateToken = () => Math.floor(100000 + Math.random() * 900000).toString();

export const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const existing = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);

        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'User already exists' });
        }

        const salt = await genSalt(process.env.SALT_ROUNDS || 6);
        const hash = await bcrypt.hash(password, salt);
        await db.query(
            'INSERT INTO users (username, email, password_hash, auth_provider) VALUES ($1, $2, $3, $4)',
            [username, email, hash, 'email']
        );

        const result = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        const user = result.rows[0];

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });

        return res.status(201).json({ message: 'User created', token });
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const result = await db.query('SELECT * FROM users WHERE email = $1 OR username = $2 AND is_deleted = false', [email, username]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });

        return res.json({ token });
    } catch (err) {
        next(err);
    }
};

export const logout = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (!token) return res.status(400).json({ message: 'No token provided' });

        const check = await db.query('SELECT 1 FROM token_blacklist WHERE token = $1', [token]);
        if (check.rows.length <= 0) {
            await db.query('INSERT INTO token_blacklist (token) VALUES ($1)', [token]);
        }

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
}

export const requestPasswordReset = async (req, res, next) => {
    const { email } = req.body;
    const now = dayjs().add(2, 'hours');
    try {
        const userResult = await db.query(`SELECT id FROM users WHERE email = $1 AND is_deleted = false`, [email]);
        if (userResult.rowCount === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const userId = userResult.rows[0].id;
        const token = generateToken();
        const expiresAt = now.add(5, 'minute').toISOString();

        await db.query(`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        `, [userId, token, expiresAt]);

        sendVerificationEmail(email, token);

        res.status(200).json({ message: 'Código de recuperación enviado' });
    } catch (err) {
        next(err);
    }
}

export const confirmPasswordReset = async (req, res, next) => {
    const { email, token, newPassword } = req.body;
    const now = dayjs().add(2, 'hours');
    try {
        const userResult = await db.query(`SELECT id FROM users WHERE email = $1 AND is_deleted = false`, [email]);
        if (userResult.rowCount === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const userId = userResult.rows[0].id;

        const tokenResult = await db.query(`
        SELECT * FROM password_reset_tokens
        WHERE user_id = $1 AND token = $2
        ORDER BY created_at DESC LIMIT 1
        `, [userId, token]);
        if (tokenResult.rowCount === 0) return res.status(400).json({ message: 'Código inválido' });

        const result = tokenResult.rows[0];
        if (result.expires_at < now.toISOString()) return res.status(400).json({ message: 'Código expirado' });

        const salt = await genSalt(process.env.SALT_ROUNDS || 6);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Actualizar password
        await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hashedPassword, userId]);

        // Eliminar tokens usados
        await db.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [userId]);

        res.status(200).json({ message: 'Contraseña actualizada correctamente' });
    } catch (err) {
        next(err);
    }
}

export const requestVerificationCode = async (req, res, next) => {
    const { userId, type } = req.body; // type: 'email' o 'sms'
    if (!['email', 'sms'].includes(type)) return res.status(400).json({ message: 'Tipo inválido' });
    const now = dayjs().add(2, 'hours');

    try {
        // Verificar que el usuario existe y no está verificado
        const userResult = await db.query('SELECT * FROM users WHERE id = $1 AND is_verified = false', [userId]);
        const user = userResult.rows[0];
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado o ya verificado' });

        const token = generateToken();
        const expiresAt = now.add(15, 'minute').toISOString();

        await db.query(`
        INSERT INTO verification_tokens (user_id, token, type, expires_at)
        VALUES ($1, $2, $3, $4)
        `, [userId, token, type, expiresAt]);


        if (type === 'email') {
            sendVerificationEmail(user.email, token);
        }

        res.status(200).json({ message: 'Código de verificación enviado' });
    } catch (err) {
        next(err);
    }
}

export const confirmVerificationCode = async (req, res, next) => {
    const { userId, token, type } = req.body;
    const now = dayjs().add(2, 'hours').toISOString()

    try {
        // Verificar que el usuario existe y no está verificado
        const userResult = await db.query('SELECT * FROM users WHERE id = $1 AND is_verified = false', [userId]);
        const user = userResult.rows[0];
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado o ya verificado' });

        const results = await db.query(`
        SELECT * FROM verification_tokens
        WHERE user_id = $1 AND token = $2 AND type = $3
        ORDER BY created_at DESC LIMIT 1
        `, [userId, token, type]);
        if (results.rowCount === 0) return res.status(400).json({ message: 'Código inválido' });

        const result = results.rows[0];
        if (result.expires_at < now.toISOString()) return res.status(400).json({ message: 'Código expirado' });

        await db.query(`
        UPDATE users SET is_verified = true WHERE id = $1
        `, [userId]);

        await db.query(`
        DELETE FROM verification_tokens WHERE user_id = $1 AND type = $2
        `, [userId, type]);

        res.status(200).json({ message: 'Cuenta verificada correctamente' });
    } catch (err) {
        next(err);
    }
}