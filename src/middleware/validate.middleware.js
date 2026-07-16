import { AppError } from '../errors/AppError.js';

const requestSections = ['params', 'query', 'body'];

function replaceRequestSection(req, section, value) {
    Object.defineProperty(req, section, {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
    });
}

export function validate(schemas) {
    return (req, _res, next) => {
        const parsedSections = {};
        const details = [];

        for (const section of requestSections) {
            const schema = schemas[section];
            if (!schema) {
                continue;
            }

            const result = schema.safeParse(req[section] ?? {});
            if (!result.success) {
                details.push(...result.error.issues.map((issue) => ({
                    code: issue.code,
                    field: [section, ...issue.path].join('.'),
                    message: issue.message,
                })));
                continue;
            }

            parsedSections[section] = result.data;
        }

        if (details.length > 0) {
            next(new AppError({
                status: 400,
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed',
                details,
            }));
            return;
        }

        for (const [section, value] of Object.entries(parsedSections)) {
            replaceRequestSection(req, section, value);
        }

        next();
    };
}
