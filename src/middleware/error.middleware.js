import multer from 'multer';
import { AppError } from '../errors/AppError.js';

export function describeUploadError(error) {
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return {
            code: 'UPLOAD_FIELD_UNEXPECTED',
            message: `Unexpected upload field: ${error.field ?? 'unknown'}`,
        };
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
        return {
            code: 'UPLOAD_FILE_TOO_LARGE',
            message: 'The uploaded file exceeds the allowed size',
        };
    }
    return {
        code: 'UPLOAD_REJECTED',
        message: 'The uploaded file violates the upload policy',
    };
}

export const errorHandler = (err, req, res, _next) => {
    const uploadError = err instanceof multer.MulterError;
    const operational = err instanceof AppError;
    const status = uploadError ? 400 : operational ? err.status : 500;
    const uploadPayload = uploadError ? describeUploadError(err) : null;
    const payload = {
        code: uploadPayload?.code ?? (operational ? err.code : 'INTERNAL_ERROR'),
        message: uploadPayload?.message ?? (operational ? err.message : 'An unexpected error occurred'),
        requestId: req.id,
    };
    if (operational && err.details !== undefined) payload.details = err.details;
    if (!operational && !uploadError) console.error(err);
    res.status(status).json(payload);
};
