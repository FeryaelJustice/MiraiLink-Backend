import { describe, expect, it } from 'vitest';
import { detectImageType, validateImage } from '../../../src/utils/imageValidation.js';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const webp = Buffer.from('RIFF0000WEBP', 'ascii');

describe('imageValidation', () => {
    it.each([
        [jpeg, 'image/jpeg', '.jpg'],
        [png, 'image/png', '.png'],
        [webp, 'image/webp', '.webp'],
    ])('detects allowlisted signatures', (buffer, mime, extension) => {
        expect(detectImageType(buffer)).toEqual({ mime, extension });
    });

    it('rejects an executable with a spoofed image MIME type', () => {
        expect(() => validateImage({
            buffer: Buffer.from('MZ executable'),
            mimetype: 'image/jpeg',
        })).toThrow(/signature/i);
    });

    it('rejects a MIME type that disagrees with the content', () => {
        expect(() => validateImage({ buffer: png, mimetype: 'image/jpeg' }))
            .toThrow(/content type/i);
    });
});
