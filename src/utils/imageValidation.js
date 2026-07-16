import { AppError } from '../errors/AppError.js';

const types = [
    {
        mime: 'image/jpeg',
        extension: '.jpg',
        matches: buffer => buffer.length >= 3
            && buffer[0] === 0xff
            && buffer[1] === 0xd8
            && buffer[2] === 0xff,
    },
    {
        mime: 'image/png',
        extension: '.png',
        matches: buffer => buffer.length >= 8
            && buffer.subarray(0, 8).equals(Buffer.from([
                0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
            ])),
    },
    {
        mime: 'image/webp',
        extension: '.webp',
        matches: buffer => buffer.length >= 12
            && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
            && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
    },
];

export function detectImageType(buffer) {
    const type = types.find(candidate => candidate.matches(buffer));
    return type ? { mime: type.mime, extension: type.extension } : null;
}

export function validateImage(file) {
    const detected = detectImageType(file.buffer);
    if (!detected) {
        throw new AppError({
            status: 415,
            code: 'INVALID_IMAGE_SIGNATURE',
            message: 'The file does not have an allowed image signature',
        });
    }
    if (file.mimetype !== detected.mime) {
        throw new AppError({
            status: 415,
            code: 'IMAGE_CONTENT_TYPE_MISMATCH',
            message: 'The declared content type does not match the image content',
        });
    }
    return detected;
}
