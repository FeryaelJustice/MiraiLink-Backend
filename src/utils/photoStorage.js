import fs from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { join, resolve, sep } from 'node:path';
import { UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';
import { photoStorageConfig } from '../config/photoStorage.js';
import db from '../models/db.js';
import { uploadCloudPhoto, destroyCloudPhoto } from '../services/cloudinary-photos.js';
import { detectImageType } from './imageValidation.js';
import { AppError } from '../errors/AppError.js';

export const photoDigest = buffer => createHash('sha256').update(buffer).digest('hex');

async function assertLocalDirectory(root, directory) {
    const realRoot = await fs.realpath(root);
    const realDirectory = await fs.realpath(directory);
    if (realDirectory !== realRoot && !realDirectory.startsWith(realRoot + sep)) throw new Error('Photo directory escapes root');
}

export function localPhotoPath(url, root = profileUploadRoot()) {
    const normalized = url.startsWith('/') ? url.slice(1) : url;
    const prefixes = [`${UPLOAD_DIR_PROFILES_STRING}/`, 'img/profiles/'];
    const prefix = prefixes.find(value => normalized.startsWith(value));
    if (!prefix) throw new Error('Unsupported local photo reference');
    const relative = normalized.slice(prefix.length);
    if (!relative || relative.split('/').some(part => !/^[a-zA-Z0-9_.-]+$/.test(part) || ['.', '..'].includes(part))) {
        throw new Error('Invalid local photo path');
    }
    const target = resolve(root, relative);
    if (!target.startsWith(resolve(root) + sep)) throw new Error('Invalid local photo path');
    return target;
}

export async function recordPhoto(photo, queryable = db) {
    await queryable.query(`INSERT INTO photo_storage_objects
        (url,provider,cloud_name,asset_id,public_id,resource_type,delivery_type,format,bytes,sha256)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (url) DO NOTHING`, [
        photo.url, photo.provider, photo.cloud_name ?? null, photo.asset_id ?? null, photo.public_id ?? null,
        photo.resource_type ?? 'image', photo.delivery_type ?? 'upload', photo.format ?? null,
        photo.bytes ?? null, photo.sha256 ?? null,
    ]);
}

export function profileUploadRoot() {
    return process.env.UPLOAD_ROOT
        ? resolve(process.env.UPLOAD_ROOT)
        : resolve('src', UPLOAD_DIR_PROFILES_STRING);
}

/**
 * Escribe imagen validada en staging exclusivo con UUID y permisos 0600.
 * El caller promueve o limpia el archivo: este paso no confirma una fila PostgreSQL.
 */
export async function stagePhoto(userId, file, root = profileUploadRoot(), queryable = db) {
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new Error('Invalid photo owner');
    const detected = detectImageType(file.buffer);
    if (!detected) throw new AppError({ status: 415, code: 'INVALID_IMAGE_SIGNATURE' });
    if (file.buffer.length > Number(process.env.UPLOAD_MAX_BYTES || 5 * 1024 * 1024)) {
        throw new AppError({ status: 413, code: 'LIMIT_FILE_SIZE' });
    }
    if (photoStorageConfig().provider === 'cloudinary') {
        const uploaded = await uploadCloudPhoto(file.buffer, userId, async planned => {
            await recordPhoto(planned, queryable);
            await queryable.query(`INSERT INTO photo_cleanup_jobs(url,next_attempt_at) VALUES ($1,NOW()+INTERVAL '1 hour') ON CONFLICT DO NOTHING`, [planned.url]);
        });
        const photo = { ...uploaded, bytes: file.buffer.length, sha256: photoDigest(file.buffer) };
        await recordPhoto(photo, queryable);
        return photo;
    }
    const directory = join(root, userId);
    await fs.mkdir(directory, { recursive: true });
    await assertLocalDirectory(root, directory);
    const filename = `${randomUUID()}${detected.extension}`;
    const stagingPath = join(directory, `.staging-${filename}`);
    const finalPath = join(directory, filename);
    await fs.writeFile(stagingPath, file.buffer, { flag: 'wx', mode: 0o600 });
    return {
        provider: 'local',
        filename,
        stagingPath,
        finalPath,
        url: `${UPLOAD_DIR_PROFILES_STRING}/${userId}/${filename}`,
    };
}

export async function finalizePhoto(staged) {
    if (staged.provider === 'cloudinary') return;
    await fs.rename(staged.stagingPath, staged.finalPath);
}

export async function removePhotoFile(url, root = profileUploadRoot(), queryable = db) {
    if (/^https?:\/\//i.test(url)) {
        const photo = (await queryable.query('SELECT * FROM photo_storage_objects WHERE url=$1', [url])).rows[0];
        if (!photo || photo.provider !== 'cloudinary') return;
        const referenced = await queryable.query(`SELECT 1 FROM user_photos p JOIN photo_storage_objects o ON o.url=p.url
            WHERE o.cloud_name=$1 AND o.public_id=$2 LIMIT 1`, [photo.cloud_name, photo.public_id]);
        if (referenced.rows.length) return;
        await destroyCloudPhoto(photo);
        await queryable.query('DELETE FROM photo_storage_objects WHERE cloud_name=$1 AND public_id=$2', [photo.cloud_name, photo.public_id]);
        return;
    }
    const path = localPhotoPath(url, root);
    if (resolve(path, '..') === resolve(root)) return;
    try { await assertLocalDirectory(root, resolve(path, '..')); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    await fs.unlink(path).catch(error => {
        if (error.code !== 'ENOENT') throw error;
    });
}

/**
 * Limpia staging y destino como compensación de un fallo de upload.
 * Ignora ENOENT, pero no convierte filesystem en una transacción PostgreSQL.
 */
export async function cleanupStagedPhoto(staged, queryable = db) {
    if (staged.provider === 'cloudinary') {
        await removePhotoFile(staged.url, undefined, queryable);
        return;
    }
    // A failed COMMIT acknowledgement can still mean the SQL transaction succeeded.
    const referenced = await queryable.query('SELECT 1 FROM user_photos WHERE url=$1 LIMIT 1', [staged.url]);
    if (referenced.rows.length) return;
    await Promise.all([staged.stagingPath, staged.finalPath].map(path =>
        fs.unlink(path).catch(error => {
            if (error.code !== 'ENOENT') throw error;
        })));
}
