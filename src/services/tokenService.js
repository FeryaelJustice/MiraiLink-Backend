import jwt from 'jsonwebtoken';

const ALGORITHM = 'HS256';

function secret() {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must contain at least 32 characters');
    }
    return process.env.JWT_SECRET;
}

/**
 * Emite JWT de acceso HS256 durante 24h con purpose access.
 * Su consumidor debe validar blacklist y estado actual de la cuenta además de la firma.
 */
export function createAccessToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, purpose: 'access' },
        secret(),
        { algorithm: ALGORITHM, expiresIn: '24h', subject: user.id },
    );
}

/**
 * Emite challenge de 5 minutos con purpose 2fa-login; no concede acceso a recursos API.
 * Solo el último paso 2FA puede canjearlo por access token tras comprobar código.
 */
export function createTwoFactorChallenge(user) {
    return jwt.sign(
        { purpose: '2fa-login' },
        secret(),
        { algorithm: ALGORITHM, expiresIn: '5m', subject: user.id },
    );
}

export function verifyTwoFactorChallenge(token) {
    const payload = jwt.verify(token, secret(), { algorithms: [ALGORITHM] });
    if (payload.purpose !== '2fa-login' || typeof payload.sub !== 'string') {
        throw new Error('Invalid 2FA challenge');
    }
    return payload;
}

/**
 * Obtiene exp de un token ya autenticado para registrar revocación.
 * jwt.decode no valida firma; no usar este helper como guarda de autorización.
 */
export function decodeTokenExpiry(token) {
    const payload = jwt.decode(token);
    if (!payload || typeof payload.exp !== 'number') {
        throw new Error('Token has no expiry');
    }
    return new Date(payload.exp * 1000);
}
