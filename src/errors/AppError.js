export class AppError extends Error {
    constructor({
        status = 500,
        code = 'INTERNAL_ERROR',
        message = 'An unexpected error occurred',
        details,
        cause,
    } = {}) {
        super(message, { cause });
        this.name = 'AppError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
