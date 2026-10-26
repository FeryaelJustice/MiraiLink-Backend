import fs from 'node:fs/promises';

/** Load inline credentials first; never hide invalid inline JSON with a file fallback. */
export async function loadServiceAccount(jsonVariable, filePath) {
    const inline = process.env[jsonVariable];
    let raw;
    if (inline !== undefined && inline !== '') {
        raw = inline;
    } else {
        if (!filePath) throw new Error(`Missing service account configuration: ${jsonVariable}`);
        try {
            raw = await fs.readFile(filePath, 'utf8');
        } catch {
            throw new Error(`Cannot read service account file for ${jsonVariable}`);
        }
    }
    try {
        const credentials = JSON.parse(raw);
        if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)
            || typeof credentials.client_email !== 'string' || !credentials.client_email.trim()
            || typeof credentials.private_key !== 'string' || !credentials.private_key.trim()) {
            throw new Error('Invalid service account');
        }
        return credentials;
    } catch {
        throw new Error(`Invalid service account JSON for ${jsonVariable}`);
    }
}
