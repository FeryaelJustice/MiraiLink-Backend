import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, join, resolve } from 'node:path';
import { UPLOAD_DIR_PROFILES_STRING } from '../consts/photosConsts.js';

export function profileUploadRoot() {
    return process.env.UPLOAD_ROOT
        ? resolve(process.env.UPLOAD_ROOT)
        : resolve('src', UPLOAD_DIR_PROFILES_STRING);
}

export async function stagePhoto(userId, file, root = profileUploadRoot()) {
    const directory = join(root, userId);
    await fs.mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}${file.detectedType.extension}`;
    const stagingPath = join(directory, `.staging-${filename}`);
    const finalPath = join(directory, filename);
    await fs.writeFile(stagingPath, file.buffer, { flag: 'wx', mode: 0o600 });
    return {
        filename,
        stagingPath,
        finalPath,
        url: `${UPLOAD_DIR_PROFILES_STRING}/${userId}/${filename}`,
    };
}

export async function finalizePhoto(staged) {
    await fs.rename(staged.stagingPath, staged.finalPath);
}

export async function removePhotoFile(url, root = profileUploadRoot()) {
    const userId = url.split('/').at(-2);
    const filename = basename(url);
    if (!userId || filename !== basename(filename)) {
        return;
    }
    await fs.unlink(join(root, userId, filename)).catch(error => {
        if (error.code !== 'ENOENT') throw error;
    });
}

export async function cleanupStagedPhoto(staged) {
    await Promise.all([staged.stagingPath, staged.finalPath].map(path =>
        fs.unlink(path).catch(error => {
            if (error.code !== 'ENOENT') throw error;
        })));
}
