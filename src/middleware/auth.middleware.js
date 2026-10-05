import jwt from 'jsonwebtoken';
import db from '../models/db.js';

function unauthorized(res, code, message) {
    return res.status(401).json({ code, message });
}

/**
 * Exige Bearer access, comprueba revocación y estado actual de usuario en PostgreSQL.
 * allowUnverified se limita a rutas de cuenta; no autoriza pertenencia a recursos como chats.
 */
export const authenticateToken = (allowUnverified = false) => async (req, res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
        return unauthorized(res, 'TOKEN_REQUIRED', 'A Bearer token is required');
    }

    try {
        const revoked = await db.query(
            'SELECT 1 FROM token_blacklist WHERE token = $1 LIMIT 1',
            [token],
        );
        if (revoked.rowCount > 0 || revoked.rows.length > 0) {
            return unauthorized(res, 'TOKEN_REVOKED', 'Token has been invalidated');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (decoded.purpose !== 'access') {
            return unauthorized(res, 'INVALID_TOKEN', 'Invalid or expired token');
        }
        const userId = decoded.id ?? decoded.sub;
        const user = await db.query(
            `SELECT u.is_verified, u.is_deleted,
                    s.product_id AS subscription_product_id,
                    s.status AS subscription_status,
                    s.expires_at AS subscription_expires_at
             FROM users u
             LEFT JOIN user_subscriptions s ON s.user_id = u.id
             WHERE u.id = $1`,
            [userId],
        );
        if (user.rowCount === 0 || user.rows[0].is_deleted) {
            return unauthorized(res, 'INVALID_TOKEN', 'Invalid or expired token');
        }
        if (!user.rows[0].is_verified && !allowUnverified) {
            return res.status(403).json({
                code: 'ACCOUNT_UNVERIFIED',
                message: 'Account is not verified',
                verified: false,
            });
        }

        const userData = user.rows[0];
        const isNotExpired = !userData.subscription_expires_at || new Date(userData.subscription_expires_at) > new Date();
        const isActive = userData.subscription_status === 'active' && isNotExpired;
        const isPremium = isActive && userData.subscription_product_id === 'mirailink_premium';
        const isPlus = isActive && (userData.subscription_product_id === 'mirailink_plus' || isPremium);
        const plan = isActive ? (isPremium ? 'premium' : 'plus') : 'free';

        res.setHeader('X-Subscription-Plan', plan);

        req.user = {
            ...decoded,
            id: userId,
            subscription: {
                isPremium,
                isPlus,
                plan,
            },
        };
        req.token = token;
        return next();
    } catch (_error) {
        return unauthorized(res, 'INVALID_TOKEN', 'Invalid or expired token');
    }
};

/**
 * Añade identidad si firma/purpose son válidos, o continúa sin ella.
 * No repite blacklist ni estado actual del usuario; no sustituye authenticateToken en rutas protegidas.
 */
export const optionalAuthenticateToken = () => async (req, res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
        if (decoded.purpose === 'access') {
            const userId = decoded.id ?? decoded.sub;
            req.user = { ...decoded, id: userId };
            req.token = token;
        }
    } catch (_error) {
        // Continuar sin autenticación si el token es inválido o ha vencido
    }
    return next();
};
