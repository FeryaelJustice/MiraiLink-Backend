import bcrypt, { genSalt } from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import db from '../models/db.js';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '../utils/mailer.js';
import { getCorrectNow } from '../utils/dateUtils.js';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';

// Utilidad para generar un código de 6 dígitos
const generateToken = () => Math.floor(100000 + Math.random() * 900000).toString();

// Configuración de Speakeasy para TOTP (2FA)
const SPEAKEASY_CONFIG = {
    secretKeyLength: 20,
    digits: 6,
    encoding: 'base32',
    step: 30, // Time step in seconds
};

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
            'INSERT INTO users (username, email, password_hash, auth_provider, nickname) VALUES ($1, $2, $3, $4, $5)',
            [username, email, hash, 'email', username]
        );

        const result = await db.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
        const user = result.rows[0];

        const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, process.env.JWT_SECRET, {
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

        // 1. Buscar usuario sin importar si está eliminado o no
        const result = await db.query(
            'SELECT * FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        const user = result.rows[0];

        // 2. Usuario no existe
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // 3. Usuario está eliminado
        if (user.is_deleted) {
            return res.status(403).json({ message: 'Account has been deleted', code: 'USER_DELETED' });
        }

        // 4. Password incorrecto
        const passwordValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // 5. Usuario válido → emitir token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({ token });
    } catch (err) {
        next(err);
    }
};

export const logout = async (req, res, next) => {
    try {
        if (!req.token) return res.status(400).json({ message: 'No token provided' });

        const check = await db.query('SELECT 1 FROM token_blacklist WHERE token = $1', [req.token]);
        if (check.rows.length <= 0) {
            await db.query('INSERT INTO token_blacklist (token) VALUES ($1)', [req.token]);
        }

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
        next(err);
    }
}

export const autoLogin = async (req, res, next) => {
    try {
        const userId = req.user.id;
        res.status(200).json({ userId: userId, message: 'Autenticado correctamente' });
    } catch (err) {
        next(err);
    }
}

export const requestPasswordReset = async (req, res, next) => {
    const { email } = req.body;
    const now = getCorrectNow();
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
    const now = getCorrectNow();
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
        const expiresAt = getCorrectNow(result.expires_at);
        if (expiresAt.toISOString() < now.toISOString()) return res.status(400).json({ message: 'Código expirado' });

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

export const checkIsVerified = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const result = await db.query('SELECT is_verified FROM users WHERE id = $1', [userId]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
        const isVerified = result.rows[0].is_verified;
        res.status(200).json({ isVerified });
    } catch (err) {
        next(err);
    }
};

export const requestVerificationCode = async (req, res, next) => {
    const { userId, type } = req.body; // type: 'email' o 'sms'
    if (!['email', 'sms'].includes(type)) return res.status(400).json({ message: 'Tipo inválido' });
    const now = getCorrectNow();

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
    const now = getCorrectNow();

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
        const expiresAt = getCorrectNow(result.expires_at);
        if (expiresAt.toISOString() < now.toISOString()) return res.status(400).json({ message: 'Código expirado' });

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

// 2FA

export const setup2FA = async (req, res, next) => {
    const userId = req.user.id;
    try {
        // 1. Generar secreto
        const secret = speakeasy.generateSecret({
            name: `MiraiLink:${req.user.email || req.user.username || userId}`, // puede usar username también
        });

        // 2. Encriptar y guardar en BBDD (pero sin habilitar aún)
        const encrypted = encrypt(secret.base32);
        await db.query(`
            INSERT INTO user_2fa (user_id, secret, enabled)
            VALUES ($1, $2, FALSE)
            ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret
        `, [userId, encrypted]);

        // 3. Crear códigos de recuperación
        const codes = Array.from({ length: 5 }, () =>
            randomBytes(6).toString('hex')
        );

        await Promise.all(
            codes.map(code =>
                db.query(`
                    INSERT INTO recovery_codes (user_id, code, used)
                    VALUES ($1, $2, FALSE)
            `, [userId, code])
            )
        );

        // 4. Devolver URL + recoveryCodes
        return res.json({
            otpauth_url: secret.otpauth_url,
            recovery_codes: codes,
            base32: secret.base32, // para apps sin QR
        });
    } catch (err) {
        next(err);
    }
};

export const verify2FA = async (req, res, next) => {
    const { token } = req.body;
    const userId = req.user.id;
    try {
        const result = await db.query('SELECT secret FROM user_2fa WHERE user_id = $1', [userId]);
        if (result.rowCount === 0) return res.status(404).json({ message: '2FA no configurado' });

        const decrypted = decrypt(result.rows[0].secret);

        const verified = speakeasy.totp.verify({
            secret: decrypted,
            encoding: SPEAKEASY_CONFIG.encoding,
            token,
            window: 1,
            digits: SPEAKEASY_CONFIG.digits,
            step: SPEAKEASY_CONFIG.step
        });

        if (!verified) return res.status(400).json({ message: 'Código inválido' });

        await db.query('UPDATE user_2fa SET enabled = TRUE WHERE user_id = $1', [userId]);

        res.json({ message: '2FA habilitado correctamente' });
    } catch (err) {
        next(err);
    }
}

export const disable2FA = async (req, res, next) => {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code) return res.status(400).json({ message: 'Se requiere un código o código de recuperación' });

    try {
        // 1. Obtener secreto TOTP
        const result = await db.query('SELECT secret FROM user_2fa WHERE user_id = $1 AND enabled = TRUE', [userId]);
        if (result.rowCount === 0) return res.status(400).json({ message: '2FA no está activado' });

        const decrypted = decrypt(result.rows[0].secret);

        // 2. Verificar TOTP
        const isTotpValid = speakeasy.totp.verify({
            secret: decrypted,
            encoding: SPEAKEASY_CONFIG.encoding,
            token: code,
            window: 1,
            digits: SPEAKEASY_CONFIG.digits,
            step: SPEAKEASY_CONFIG.step
        });

        let valid = isTotpValid;

        // 3. Si no es TOTP, verificar si es código de recuperación
        if (!valid) {
            const recovery = await db.query(`
                SELECT * FROM recovery_codes
                WHERE user_id = $1 AND code = $2 AND used = FALSE
            `, [userId, code]);

            if (recovery.rowCount > 0) {
                valid = true;
                await db.query(`UPDATE recovery_codes SET used = TRUE WHERE id = $1`, [recovery.rows[0].id]);
            }
        }

        // 4. Si ninguno fue válido, rechazar
        if (!valid) {
            return res.status(401).json({ message: 'Código o código de recuperación inválido' });
        }

        // 5. Desactivar 2FA
        await db.query('DELETE FROM user_2fa WHERE user_id = $1', [userId]);
        await db.query('DELETE FROM recovery_codes WHERE user_id = $1', [userId]);

        res.json({ message: '2FA desactivado correctamente' });
    } catch (err) {
        next(err);
    }
}

export const check2FAStatus = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const result = await db.query('SELECT enabled FROM user_2fa WHERE user_id = $1', [userId]);
        res.json({ enabled: result.rows[0]?.enabled || false });
    } catch (err) {
        next(err);
    }
}

export const loginVerify2FALastStep = async (req, res, next) => {
    const { userId, code } = req.body;
    try {
        const result = await db.query('SELECT secret FROM user_2fa WHERE user_id = $1 AND enabled = TRUE', [userId]);
        if (result.rowCount === 0) return res.status(400).json({ message: '2FA no requerido' });

        const decrypted = decrypt(result.rows[0].secret);

        const verified = speakeasy.totp.verify({
            secret: decrypted,
            encoding: SPEAKEASY_CONFIG.encoding,
            token: code,
            window: 1,
            digits: SPEAKEASY_CONFIG.digits,
            step: SPEAKEASY_CONFIG.step
        });

        // Si no válido, intentar como código de recuperación
        if (!verified) {
            const rec = await db.query(`
            SELECT * FROM recovery_codes
            WHERE user_id = $1 AND code = $2 AND used = FALSE
            `, [userId, code]);

            if (rec.rowCount === 0) return res.status(400).json({ message: 'Código inválido' });

            await db.query(`UPDATE recovery_codes SET used = TRUE WHERE id = $1`, [rec.rows[0].id]);
        }

        res.status(200).json({ message: '2FA verificado correctamente' });
    } catch (err) {
        next(err);
    }
}

// const hasProfilePicture = async (userId) => {
//     const result = await db.query(`
//         SELECT 1 FROM user_photos
//         WHERE user_id = $1 AND position = 1
//         LIMIT 1
//     `, [userId]);

//     return result.rows.length > 0;
// };