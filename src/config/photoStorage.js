export function photoStorageConfig(input = process.env) {
    const provider = input.PHOTO_STORAGE_PROVIDER || 'cloudinary';
    if (!['cloudinary', 'local'].includes(provider)) throw new Error('Invalid PHOTO_STORAGE_PROVIDER');
    const folder = input.CLOUDINARY_FOLDER || 'mirailink/profiles';
    if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(folder)) throw new Error('Invalid CLOUDINARY_FOLDER');
    if (provider === 'cloudinary') {
        for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
            if (!input[key]?.trim()) throw new Error(`Missing ${key}`);
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(input.CLOUDINARY_CLOUD_NAME)) throw new Error('Invalid CLOUDINARY_CLOUD_NAME');
    }
    return {
        provider, folder,
        cloud_name: input.CLOUDINARY_CLOUD_NAME,
        api_key: input.CLOUDINARY_API_KEY,
        api_secret: input.CLOUDINARY_API_SECRET,
    };
}
