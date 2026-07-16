import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import { decrypt } from '../utils/cryptoUtils.js';

const TOTP_OPTIONS = {
    digits: 6,
    encoding: 'base32',
    step: 30,
    window: 1,
};

export function verifyTotp(encryptedSecret, token) {
    return speakeasy.totp.verify({
        ...TOTP_OPTIONS,
        secret: decrypt(encryptedSecret),
        token,
    });
}

export function hashRecoveryCodes(codes) {
    const rounds = Number(process.env.SALT_ROUNDS ?? 12);
    return Promise.all(codes.map(code => bcrypt.hash(code, rounds)));
}

export async function useRecoveryCode(client, userId, candidate) {
    const result = await client.query(
        `SELECT id, code_hash FROM recovery_codes
         WHERE user_id = $1 AND used = FALSE
         FOR UPDATE`,
        [userId],
    );

    for (const recovery of result.rows) {
        if (await bcrypt.compare(candidate, recovery.code_hash)) {
            const update = await client.query(
                `UPDATE recovery_codes SET used = TRUE
                 WHERE id = $1 AND used = FALSE`,
                [recovery.id],
            );
            return update.rowCount === 1;
        }
    }

    return false;
}
