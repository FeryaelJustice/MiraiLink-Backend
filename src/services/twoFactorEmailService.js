import bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { AppError } from '../errors/AppError.js';

export async function lockTwoFactorUser(client, userId) {
    const result = await client.query(
        'SELECT id, email, is_verified FROM users WHERE id = $1 AND is_deleted = FALSE FOR UPDATE',
        [userId],
    );
    if (!result.rows[0]?.is_verified) {
        throw new AppError({ status: 403, code: 'FORBIDDEN', message: 'A verified account is required' });
    }
    return result.rows[0];
}

export async function storeEmailChallenge(client, userId, action) {
    const user = await lockTwoFactorUser(client, userId);
    const result = await client.query('SELECT enabled FROM user_2fa WHERE user_id = $1', [userId]);
    const factor = result.rows[0];
    if (!factor || (action === 'enable' ? factor.enabled : !factor.enabled)) {
        throw new AppError({ status: 400, code: 'INVALID_INPUT', message: 'Two factor state does not allow this action' });
    }
    const code = randomInt(100000, 1000000).toString();
    const hash = await bcrypt.hash(code, Number(process.env.SALT_ROUNDS ?? 12));
    await client.query(
        `INSERT INTO two_factor_email_challenges (user_id, action, token_hash, expires_at, attempts, ready)
         VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes', 0, FALSE)
         ON CONFLICT (user_id, action) DO UPDATE
         SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at,
             attempts = 0, ready = FALSE, created_at = NOW()`,
        [userId, action, hash],
    );
    return { email: user.email, code, hash };
}

// Caller holds the user row lock and commits even when this returns false.
export async function consumeEmailChallenge(client, userId, action, code, extraValid = true) {
    const result = await client.query(
        `SELECT token_hash, attempts, ready, expires_at > NOW() AS valid
         FROM two_factor_email_challenges WHERE user_id = $1 AND action = $2 FOR UPDATE`,
        [userId, action],
    );
    const challenge = result.rows[0];
    if (!challenge) return false;
    if (!challenge.ready || !challenge.valid || challenge.attempts >= 5) return false;
    const matches = await bcrypt.compare(code, challenge.token_hash);
    if (!matches || !extraValid) {
        await client.query(
            'UPDATE two_factor_email_challenges SET attempts = attempts + 1 WHERE user_id = $1 AND action = $2',
            [userId, action],
        );
        return false;
    }
    await client.query('DELETE FROM two_factor_email_challenges WHERE user_id = $1 AND action = $2', [userId, action]);
    return true;
}
