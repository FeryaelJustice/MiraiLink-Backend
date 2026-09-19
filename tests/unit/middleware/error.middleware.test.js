import { describe, expect, it } from 'vitest';
import { describeUploadError } from '../../../src/middleware/error.middleware.js';

describe('describeUploadError', () => {
    it('identifies an unexpected multipart field without implying content moderation', () => {
        expect(describeUploadError({ code: 'LIMIT_UNEXPECTED_FILE', field: 'photo_0' }))
            .toEqual({
                code: 'UPLOAD_FIELD_UNEXPECTED',
                message: 'Unexpected upload field: photo_0',
            });
    });
});
