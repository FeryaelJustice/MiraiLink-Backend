import multer from 'multer';
import { AppError } from '../errors/AppError.js';

export const errorHandler = (err, req, res, _next) => {
    const uploadError = err instanceof multer.MulterError;
    const operational = err instanceof AppError;
    const status = uploadError ? 400 : operational ? err.status : 500;
    const payload = {
        code: uploadError ? 'UPLOAD_REJECTED' : operational ? err.code : 'INTERNAL_ERROR',
        message: uploadError ? 'The uploaded files violate the upload policy'
            : operational ? err.message : 'An unexpected error occurred',
        requestId: req.id,
    };
    if (operational && err.details !== undefined) payload.details = err.details;
    if (!operational && !uploadError) console.error(err);
    res.status(status).json(payload);
};
