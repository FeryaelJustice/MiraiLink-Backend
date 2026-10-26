import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { photoStorageConfig } from '../config/photoStorage.js';
import { AppError } from '../errors/AppError.js';

const unavailable = () => new AppError({ status: 503, code: 'PHOTO_STORAGE_UNAVAILABLE', message: 'Photo storage is temporarily unavailable' });

function options() {
    const config = photoStorageConfig({ ...process.env, PHOTO_STORAGE_PROVIDER: 'cloudinary' });
    return { cloud_name: config.cloud_name, api_key: config.api_key, api_secret: config.api_secret, timeout: 20_000, secure: true };
}

export async function uploadCloudPhoto(buffer, userId, prepare = async () => {}) {
    const config = photoStorageConfig({ ...process.env, PHOTO_STORAGE_PROVIDER: 'cloudinary' });
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw unavailable();
    const publicId = `${config.folder}/${userId}/${randomUUID()}`;
    const planned = {
        url: `https://res.cloudinary.com/${config.cloud_name}/image/upload/${publicId}`,
        provider: 'cloudinary', cloud_name: config.cloud_name, public_id: publicId,
        resource_type: 'image', delivery_type: 'upload',
    };
    await prepare(planned);
    try {
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                ...options(), public_id: publicId, resource_type: 'image', type: 'upload',
                overwrite: false, allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            }, (error, uploaded) => error ? reject(error) : resolve(uploaded));
            stream.on('error', reject);
            stream.end(buffer);
        });
        const url = new URL(result.secure_url);
        if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com'
            || !url.pathname.startsWith(`/${config.cloud_name}/image/upload/`)
            || result.public_id !== publicId || !result.asset_id) throw unavailable();
        return {
            url: result.secure_url, provider: 'cloudinary', cloud_name: config.cloud_name,
            asset_id: result.asset_id, public_id: result.public_id,
            resource_type: 'image', delivery_type: 'upload', format: result.format, plannedUrl: planned.url,
        };
    } catch {
        // The caller persists the planned ID before the request, including uncertain outcomes.
        throw unavailable();
    }
}

export async function destroyCloudPhoto(photo) {
    if (photo.cloud_name !== process.env.CLOUDINARY_CLOUD_NAME || photo.resource_type !== 'image'
        || photo.delivery_type !== 'upload' || !photo.public_id) throw unavailable();
    try {
        const result = await cloudinary.uploader.destroy(photo.public_id, {
            ...options(), resource_type: 'image', type: 'upload', invalidate: true,
        });
        if (!['ok', 'not found'].includes(result.result)) throw unavailable();
    } catch { throw unavailable(); }
}
