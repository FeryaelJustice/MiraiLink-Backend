import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

let s3ClientInstance = null;

export function getR2Client() {
    if (!s3ClientInstance) {
        s3ClientInstance = new S3Client({
            region: 'auto',
            endpoint: process.env.R2_ENDPOINT,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
        });
    }
    return s3ClientInstance;
}

export function setR2Client(client) {
    s3ClientInstance = client;
}

export function isR2Url(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    if (url.includes('/assets/img/profiles/')) {
        return false;
    }
    if (process.env.R2_PUBLIC_URL && url.startsWith(process.env.R2_PUBLIC_URL)) {
        return true;
    }
    return url.startsWith('http://') || url.startsWith('https://');
}

export function extractR2Key(keyOrUrl) {
    if (!keyOrUrl || typeof keyOrUrl !== 'string') {
        return null;
    }
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (publicUrl && keyOrUrl.startsWith(publicUrl)) {
        return keyOrUrl.slice(publicUrl.length).replace(/^\/+/, '');
    }
    if (keyOrUrl.includes('://')) {
        try {
            const parsed = new URL(keyOrUrl);
            return parsed.pathname.replace(/^\/+/, '');
        } catch {
            return null;
        }
    }
    return keyOrUrl.replace(/^\/+/, '');
}

/**
 * Sube un buffer de foto a Cloudflare R2 con el cliente S3.
 * Devuelve la URL publica permanente.
 */
export async function uploadToR2(userId, file, customKey = null) {
    const extension = file.detectedType?.extension ?? '.jpg';
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const key = customKey ?? `profiles/${userId}/${filename}`;
    const contentType = file.detectedType?.mime ?? file.mimetype ?? 'image/jpeg';
    const client = getR2Client();

    await client.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
    }));

    const publicBase = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
    return `${publicBase}/${key}`;
}

/**
 * Elimina un objeto de Cloudflare R2 a partir de su key o su URL publica.
 */
export async function deleteFromR2(keyOrUrl) {
    const key = extractR2Key(keyOrUrl);
    if (!key) {
        return;
    }
    const client = getR2Client();
    await client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
    }));
}
