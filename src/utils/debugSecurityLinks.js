import { createHash, timingSafeEqual } from 'node:crypto';

// This capability is for a private test build and an explicit test account list only.
export function mayReturnDebugLink(req, email, env = process.env) {
    if (env.DEBUG_SECURITY_LINKS !== 'true' || !email || !env.DEBUG_SECURITY_LINK_KEY || env.DEBUG_SECURITY_LINK_KEY.length < 32) return false;
    const allowed = (env.DEBUG_SECURITY_LINK_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(email.trim().toLowerCase())) return false;
    const supplied = req.get('X-MiraiLink-Debug-Key') || '';
    const hash = value => createHash('sha256').update(value).digest();
    return timingSafeEqual(hash(supplied), hash(env.DEBUG_SECURITY_LINK_KEY));
}
