import crypto from 'node:crypto';

const CURRENT_VERSION = 'v2';
const CURRENT_ALGORITHM = 'aes-256-gcm';
const LEGACY_ALGORITHM = 'aes-256-cbc';

function keyBuffer(keyHex = process.env.SECRET_2FA_KEY) {
    const key = Buffer.from(keyHex ?? '', 'hex');
    if (key.length !== 32) {
        throw new Error('SECRET_2FA_KEY must contain exactly 32 bytes of hex');
    }
    return key;
}

export function encrypt(text, { keyHex } = {}) {
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(CURRENT_ALGORITHM, keyBuffer(keyHex), nonce);
    const ciphertext = Buffer.concat([
        cipher.update(text, 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
        CURRENT_VERSION,
        nonce.toString('hex'),
        tag.toString('hex'),
        ciphertext.toString('hex'),
    ].join(':');
}

function decryptCurrent(parts, keyHex) {
    const [, nonceHex, tagHex, ciphertextHex] = parts;
    if (!nonceHex || !tagHex || !ciphertextHex) {
        throw new Error('Invalid encrypted payload');
    }

    const decipher = crypto.createDecipheriv(
        CURRENT_ALGORITHM,
        keyBuffer(keyHex),
        Buffer.from(nonceHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    return Buffer.concat([
        decipher.update(Buffer.from(ciphertextHex, 'hex')),
        decipher.final(),
    ]).toString('utf8');
}

function decryptLegacy(encrypted, { keyHex, legacyIvHex }) {
    const iv = Buffer.from(legacyIvHex ?? process.env.SECRET_2FA_IV ?? '', 'hex');
    if (iv.length !== 16) {
        throw new Error('A 16-byte legacy IV is required to decrypt legacy 2FA secrets');
    }

    const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, keyBuffer(keyHex), iv);
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}

export function decrypt(encrypted, options = {}) {
    const parts = encrypted.split(':');
    if (parts[0] === CURRENT_VERSION) {
        return decryptCurrent(parts, options.keyHex);
    }

    return decryptLegacy(encrypted, options);
}

export function isLegacyEncrypted(encrypted) {
    return !encrypted.startsWith(`${CURRENT_VERSION}:`);
}
