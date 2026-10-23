import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, join, resolve } from 'node:path';
import { UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';
import {
    deleteFromR2,
    isR2Url,
    uploadToR2,
} from '../services/r2StorageService.js';

export function getStorageDriver() {
    if (process.env.STORAGE_DRIVER) {
        return process.env.STORAGE_DRIVER.toLowerCase();
    }
    if (process.env.R2_BUCKET_NAME && process.env.R2_ENDPOINT) {
        return 'r2';
    }
    return 'local';
}

export function profileUploadRoot() {
    return process.env.UPLOAD_ROOT
        ? resolve(process.env.UPLOAD_ROOT)
        : resolve('src', UPLOAD_DIR_PROFILES_STRING);
}

/**
 * Escribe imagen validada en staging exclusivo (local con UUID y permisos 0600 o Cloudflare R2).
 * El caller promueve o limpia el archivo: este paso no confirma una fila PostgreSQL.
 */
export async function stagePhoto(userId, file, root = profileUploadRoot()) {
    if (getStorageDriver() === 'r2') {
        const extension = file.detectedType?.extension ?? '.jpg';
        const filename = `${Date.now()}-${randomUUID()}${extension}`;
        const key = `profiles/${userId}/${filename}`;
        const url = await uploadToR2(userId, file, key);
        return {
            driver: 'r2',
            key,
            filename,
            url,
        };
    }

    const directory = join(root, userId);
    await fs.mkdir(directory, { recursive: true });
    const extension = file.detectedType?.extension ?? '.jpg';
    const filename = `${randomUUID()}${extension}`;
    const stagingPath = join(directory, `.staging-${filename}`);
    const finalPath = join(directory, filename);
    await fs.writeFile(stagingPath, file.buffer, { flag: 'wx', mode: 0o600 });
    return {
        driver: 'local',
        filename,
        stagingPath,
        finalPath,
        url: `${UPLOAD_DIR_PROFILES_STRING}/${userId}/${filename}`,
    };
}

export async function finalizePhoto(staged) {
    if (!staged || staged.driver === 'r2') {
        return;
    }
    if (staged.stagingPath && staged.finalPath) {
        await fs.rename(staged.stagingPath, staged.finalPath);
    }
}

export async function removePhotoFile(url, root = profileUploadRoot()) {
    if (!url || typeof url !== 'string') {
        return;
    }
    if (isR2Url(url)) {
        await deleteFromR2(url).catch(() => {});
        return;
    }

    const userId = url.split('/').at(-2);
    const filename = basename(url);
    if (!userId || filename !== basename(filename)) {
        return;
    }
    await fs.unlink(join(root, userId, filename)).catch(error => {
        if (error.code !== 'ENOENT') throw error;
    });
}

/**
 * Limpia staging y destino como compensacion de un fallo de upload.
 * Ignora ENOENT o errores de borrado, pero no convierte storage en una transaccion PostgreSQL.
 */
export async function cleanupStagedPhoto(staged) {
    if (!staged) {
        return;
    }
    if (staged.driver === 'r2') {
        if (staged.key) {
            await deleteFromR2(staged.key).catch(() => {});
        }
        return;
    }
    const paths = [staged.stagingPath, staged.finalPath].filter(Boolean);
    await Promise.all(paths.map(path =>
        fs.unlink(path).catch(error => {
            if (error.code !== 'ENOENT') throw error;
        })));
}

export { uploadToR2 };
