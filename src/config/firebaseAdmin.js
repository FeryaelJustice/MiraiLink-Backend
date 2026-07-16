import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let messagingPromise;

function resolveServiceAccountPath() {
    const configured = process.env.FIREBASE_SERVICE_ACCOUNT_FILE_NAME;
    if (!configured) {
        return fileURLToPath(new URL('../serviceAccountKey.json', import.meta.url));
    }

    return isAbsolute(configured) ? configured : resolve(configured);
}

async function initializeMessaging() {
    const serviceAccountPath = resolveServiceAccountPath();
    const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
    const app = getApps()[0] ?? initializeApp({
        credential: cert(serviceAccount),
    });

    return getMessaging(app);
}

export function getFcm() {
    messagingPromise ??= initializeMessaging();
    return messagingPromise;
}

export function resetFirebaseForTests() {
    messagingPromise = undefined;
}
