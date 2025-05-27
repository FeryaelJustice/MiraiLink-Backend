import jwt from 'jsonwebtoken';
import db from '../models/db.js';

export const authenticateToken = (allowUnverified = false) => {
    return async (req, res, next) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (!token) return res.status(401).json({ message: 'No token provided' });

        try {
            // Verifica que NO esté en blacklist
            const check = await db.query('SELECT 1 FROM token_blacklist WHERE token = $1', [token]);
            if (check.rows.length > 0) {
                await db.query('DELETE FROM token_blacklist WHERE token = $1', [token]);
                return res.status(401).json({ message: 'Token has been invalidated' });
            }

            // Decodifica el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await db.query('SELECT is_verified, is_deleted FROM users WHERE id = $1', [decoded.id]);

            if (user.rowCount === 0 || user.rows[0].is_deleted) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            if (!user.rows[0].is_verified && !allowUnverified) {
                return res.status(403).json({ message: 'Cuenta no verificada' });
            }

            // Si todo está bien, agrega el usuario decodificado al request
            req.user = decoded;
            next();
        } catch (err) {
            res.status(401).json({ message: 'Invalid token', error: err });
        }
    }
};