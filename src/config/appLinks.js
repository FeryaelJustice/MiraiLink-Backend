export const PLAY_FINGERPRINT = '16:A5:40:D3:FA:11:EE:8D:E0:D9:77:C2:93:AA:7D:DA:4B:0F:68:14:97:78:D3:81:C5:28:34:B5:C2:90:0A:6E';
export const ANDROID_PACKAGE = 'com.feryaeljustice.mirailink';

export function appLinksConfig(env = process.env) {
    const base = new URL(env.APP_BASE_URL || 'https://mirailink-backend.onrender.com');
    if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
        throw new Error('APP_BASE_URL must be an HTTPS origin');
    }
    const fingerprints = (env.ANDROID_APP_SHA256_FINGERPRINTS || PLAY_FINGERPRINT)
        .split(',').map(value => value.trim().toUpperCase());
    if (fingerprints.some(value => !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value))) {
        throw new Error('ANDROID_APP_SHA256_FINGERPRINTS must contain SHA-256 fingerprints');
    }
    return { origin: base.origin, fingerprints: [...new Set(fingerprints)] };
}

export function securityLink(path, params) {
    const url = new URL(path, appLinksConfig().origin);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') url.searchParams.set(key, value);
    }
    return url.href;
}
