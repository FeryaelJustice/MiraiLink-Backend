import jwt from 'jsonwebtoken';
import db from '../models/db.js';

function unauthorized(res, code, message) {
    return res.status(401).json({ code, message });
}

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
            'SELECT is_verified, is_deleted FROM users WHERE id = $1',
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
        req.user = { ...decoded, id: userId };
        req.token = token;
        return next();
    } catch (_error) {
        return unauthorized(res, 'INVALID_TOKEN', 'Invalid or expired token');
    }
};
