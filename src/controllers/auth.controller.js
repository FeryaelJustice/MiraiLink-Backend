import bcrypt from 'bcrypt';
import { randomBytes, randomInt } from 'node:crypto';
import speakeasy from 'speakeasy';
import db from '../models/db.js';
import {
    createAccessToken,
    createTwoFactorChallenge,
    decodeTokenExpiry,
    verifyTwoFactorChallenge,
} from '../services/tokenService.js';
import { hashRecoveryCodes, useRecoveryCode, verifyTotp } from '../services/twoFactorService.js';
import { encrypt } from '../utils/cryptoUtils.js';
import { sendVerificationEmail } from '../utils/mailer.js';

const neutralEmailResponse = { message: 'If the account is eligible, a code will be sent' };
const generateCode = () => randomInt(100000, 1000000).toString();
const rounds = () => Number(process.env.SALT_ROUNDS ?? 12);

async function withTransaction(work) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const existing = await db.query(
            'SELECT 1 FROM users WHERE username = $1 OR email = $2 LIMIT 1',
            [username, email],
        );
        if (existing.rowCount > 0) {
            return res.status(409).json({ code: 'ACCOUNT_EXISTS', message: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, rounds());
        const result = await db.query(
            `INSERT INTO users (username, email, password_hash, auth_provider, nickname)
             VALUES ($1, $2, $3, 'email', $1)
             RETURNING id, username, email`,
            [username, email, passwordHash],
        );
        const user = result.rows[0];
        return res.status(201).json({
            message: 'User created',
            userId: user.id,
            token: createAccessToken(user),
        });
    } catch (error) {
        return next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const result = await db.query(
            `SELECT u.id, u.username, u.password_hash, u.is_deleted,
                    COALESCE(f.enabled, FALSE) AS two_fa_enabled
             FROM users u
             LEFT JOIN user_2fa f ON f.user_id = u.id
             WHERE ($1::text IS NOT NULL AND u.email = $1)
                OR ($2::text IS NOT NULL AND u.username = $2)
             LIMIT 1`,
            [email ?? null, username ?? null],
        );
        const user = result.rows[0];
        const passwordValid = user?.password_hash
            ? await bcrypt.compare(password, user.password_hash)
            : false;

        if (!user || !passwordValid || user.is_deleted) {
            return res.status(401).json({
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid credentials',
            });
        }
        if (user.two_fa_enabled) {
            return res.json({
                requires2FA: true,
                challengeToken: createTwoFactorChallenge(user),
                expiresIn: 300,
            });
        }
        return res.json({ token: createAccessToken(user), userId: user.id });
    } catch (error) {
        return next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        const expiresAt = decodeTokenExpiry(req.token);
        await db.query(
            `INSERT INTO token_blacklist (token, expires_at)
             VALUES ($1, $2)
             ON CONFLICT (token) DO NOTHING`,
            [req.token, expiresAt],
        );
        return res.json({ message: 'Logged out successfully' });
    } catch (error) {
        return next(error);
    }
};

export const autoLogin = (req, res) => res.json({
    userId: req.user.id ?? req.user.sub,
    message: 'Authenticated',
});

export const requestPasswordReset = async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT id, email FROM users WHERE email = $1 AND is_deleted = FALSE LIMIT 1',
            [req.body.email],
        );
        if (result.rowCount > 0) {
            const user = result.rows[0];
            const code = generateCode();
            const hash = await bcrypt.hash(code, rounds());
            await withTransaction(async client => {
                await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
                await client.query(
                    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                     VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
                    [user.id, hash],
                );
            });
            await sendVerificationEmail(user.email, code);
        }
        return res.json(neutralEmailResponse);
    } catch (error) {
        return next(error);
    }
};

export const confirmPasswordReset = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT p.id, p.user_id, p.token_hash
             FROM password_reset_tokens p
             JOIN users u ON u.id = p.user_id
             WHERE u.email = $1 AND u.is_deleted = FALSE AND p.expires_at > NOW()
             ORDER BY p.created_at DESC LIMIT 1`,
            [req.body.email],
        );
        const reset = result.rows[0];
        if (!reset || !await bcrypt.compare(req.body.token, reset.token_hash)) {
            return res.status(400).json({ code: 'INVALID_CODE', message: 'Invalid or expired code' });
        }
        const passwordHash = await bcrypt.hash(req.body.newPassword, rounds());
        await withTransaction(async client => {
            await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, reset.user_id]);
            await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [reset.user_id]);
        });
        return res.json({ message: 'Password updated' });
    } catch (error) {
        return next(error);
    }
};

export const checkIsVerified = async (req, res, next) => {
    try {
        const userId = req.user.id ?? req.user.sub;
        const result = await db.query('SELECT is_verified FROM users WHERE id = $1', [userId]);
        return res.json({ isVerified: result.rows[0]?.is_verified ?? false });
    } catch (error) {
        return next(error);
    }
};

export const requestVerificationCode = async (req, res, next) => {
    try {
        const userId = req.user.id ?? req.user.sub;
        const result = await db.query(
            'SELECT email FROM users WHERE id = $1 AND is_verified = FALSE',
            [userId],
        );
        if (result.rowCount > 0 && req.body.type === 'email') {
            const code = generateCode();
            const hash = await bcrypt.hash(code, rounds());
            await withTransaction(async client => {
                await client.query(
                    'DELETE FROM verification_tokens WHERE user_id = $1 AND type = $2',
                    [userId, req.body.type],
                );
                await client.query(
                    `INSERT INTO verification_tokens (user_id, token_hash, type, expires_at)
                     VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')`,
                    [userId, hash, req.body.type],
                );
            });
            await sendVerificationEmail(result.rows[0].email, code);
        }
        return res.json(neutralEmailResponse);
    } catch (error) {
        return next(error);
    }
};

export const confirmVerificationCode = async (req, res, next) => {
    try {
        const userId = req.user.id ?? req.user.sub;
        const result = await db.query(
            `SELECT id, token_hash FROM verification_tokens
             WHERE user_id = $1 AND type = $2 AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [userId, req.body.type],
        );
        const verification = result.rows[0];
        if (!verification || !await bcrypt.compare(req.body.token, verification.token_hash)) {
            return res.status(400).json({ code: 'INVALID_CODE', message: 'Invalid or expired code' });
        }
        await withTransaction(async client => {
            await client.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [userId]);
            await client.query('DELETE FROM verification_tokens WHERE user_id = $1', [userId]);
        });
        return res.json({ message: 'Account verified' });
    } catch (error) {
        return next(error);
    }
};

export const setup2FA = async (req, res, next) => {
    try {
        const userId = req.user.id ?? req.user.sub;
        const secret = speakeasy.generateSecret({ name: `MiraiLink:${req.user.username ?? userId}` });
        const recoveryCodes = Array.from({ length: 8 }, () => randomBytes(8).toString('hex'));
        const codeHashes = await hashRecoveryCodes(recoveryCodes);
        await withTransaction(async client => {
            await client.query(
                `INSERT INTO user_2fa (user_id, secret, enabled)
                 VALUES ($1, $2, FALSE)
                 ON CONFLICT (user_id) DO UPDATE SET secret = EXCLUDED.secret, enabled = FALSE`,
                [userId, encrypt(secret.base32)],
            );
            await client.query('DELETE FROM recovery_codes WHERE user_id = $1', [userId]);
            for (const codeHash of codeHashes) {
                await client.query(
                    'INSERT INTO recovery_codes (user_id, code_hash, used) VALUES ($1, $2, FALSE)',
                    [userId, codeHash],
                );
            }
        });
        return res.json({ otpauthUrl: secret.otpauth_url, recoveryCodes });
    } catch (error) {
        return next(error);
    }
};

export const verify2FA = async (req, res, next) => {
    try {
        const userId = req.user.id ?? req.user.sub;
        const result = await db.query('SELECT secret FROM user_2fa WHERE user_id = $1', [userId]);
        if (!result.rows[0] || !verifyTotp(result.rows[0].secret, req.body.token)) {
            return res.status(400).json({ code: 'INVALID_CODE', message: 'Invalid code' });
        }
        await db.query('UPDATE user_2fa SET enabled = TRUE WHERE user_id = $1', [userId]);
        return res.json({ message: '2FA enabled' });
    } catch (error) {
        return next(error);
    }
};

export const disable2FA = async (req, res, next) => {
    try {
        const userId = req.user.id ?? req.user.sub;
        const result = await db.query('SELECT secret FROM user_2fa WHERE user_id = $1 AND enabled = TRUE', [userId]);
        if (!result.rows[0]) {
            return res.status(400).json({ code: 'TWO_FACTOR_DISABLED', message: '2FA is not enabled' });
        }
        const totpValid = verifyTotp(result.rows[0].secret, req.body.code);
        const recoveryValid = totpValid ? false : await withTransaction(client => useRecoveryCode(client, userId, req.body.code));
        if (!totpValid && !recoveryValid) {
            return res.status(401).json({ code: 'INVALID_CODE', message: 'Invalid code' });
        }
        await withTransaction(async client => {
            await client.query('DELETE FROM user_2fa WHERE user_id = $1', [userId]);
            await client.query('DELETE FROM recovery_codes WHERE user_id = $1', [userId]);
        });
        return res.json({ message: '2FA disabled' });
    } catch (error) {
        return next(error);
    }
};

export const check2FAStatus = async (req, res, next) => {
    try {
        const userId = req.user.id ?? req.user.sub;
        const result = await db.query('SELECT enabled FROM user_2fa WHERE user_id = $1', [userId]);
        return res.json({ enabled: result.rows[0]?.enabled ?? false });
    } catch (error) {
        return next(error);
    }
};

export const loginVerify2FALastStep = async (req, res, next) => {
    try {
        const challenge = verifyTwoFactorChallenge(req.body.challengeToken);
        const result = await db.query(
            `SELECT u.id, u.username, f.secret
             FROM users u JOIN user_2fa f ON f.user_id = u.id
             WHERE u.id = $1 AND f.enabled = TRUE AND u.is_deleted = FALSE`,
            [challenge.sub],
        );
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ code: 'INVALID_CHALLENGE', message: 'Invalid or expired challenge' });
        }
        const totpValid = /^\d{6}$/.test(req.body.code) && verifyTotp(user.secret, req.body.code);
        const recoveryValid = totpValid ? false : await withTransaction(client => useRecoveryCode(client, user.id, req.body.code));
        if (!totpValid && !recoveryValid) {
            return res.status(401).json({ code: 'INVALID_CODE', message: 'Invalid code' });
        }
        return res.json({ token: createAccessToken(user), userId: user.id });
    } catch (_error) {
        return res.status(401).json({ code: 'INVALID_CHALLENGE', message: 'Invalid or expired challenge' });
    }
};
