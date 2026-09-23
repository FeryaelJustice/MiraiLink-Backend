import { rateLimit } from 'express-rate-limit';

function limiter({ windowMs, limit }) {
    const middleware = rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        skip: req => req.app.locals.enableRateLimits === false,
        handler: (_req, res) => res.status(429).json({
            code: 'RATE_LIMITED',
            message: 'Too many requests, try again later',
        }),
    });
    return middleware;
}

export const authLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 10 });
export const emailLimiter = limiter({ windowMs: 60 * 60 * 1000, limit: 5 });
export const writeLimiter = limiter({ windowMs: 60 * 1000, limit: 30 });

export const globalApiLimiter = (options = {}) => limiter({
    windowMs: options.windowMs ?? (Number(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000),
    limit: options.limit ?? (Number(process.env.GLOBAL_RATE_LIMIT_MAX) || 1000),
});
