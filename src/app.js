import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from './errors/AppError.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestId } from './middleware/requestId.middleware.js';
import appRoutes from './routes/app.routes.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import chatRoutes from './routes/chat.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import matchRoutes from './routes/match.routes.js';
import reportRoutes from './routes/report.routes.js';
import swipeRoutes from './routes/swipe.routes.js';
import userRoutes from './routes/user.routes.js';
import userPhotoRoutes from './routes/userphotos.routes.js';
import usersRoutes from './routes/users.routes.js';

const API_PREFIX = '/api';
const __dirname = dirname(fileURLToPath(import.meta.url));

function createCorsOptions() {
    const allowedOrigins = (process.env.ORIGIN ?? '').split(',').map(value => value.trim()).filter(Boolean);
    return {
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new AppError({ status: 403, code: 'CORS_REJECTED', message: 'Origin is not allowed' }));
        },
    };
}

export function createApp({ uploadRoot = join(__dirname, 'assets'), enableRateLimits = true } = {}) {
    const app = express();
    app.disable('x-powered-by');
    app.locals.enableRateLimits = enableRateLimits;
    app.use(requestId);
    app.use(cors(createCorsOptions()));
    app.use(express.json({ limit: '100kb' }));
    app.use(compression());
    app.use(helmet());
    app.use('/static', express.static(join(__dirname, 'public'), { dotfiles: 'deny', index: false }));
    app.use('/assets', (_req, res, next) => {
        res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'");
        res.set('X-Content-Type-Options', 'nosniff');
        next();
    }, express.static(uploadRoot, { dotfiles: 'deny', index: false, fallthrough: false }));

    app.get('/', (_req, res) => res.json({ service: 'mirailink-backend' }));
    app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
    app.use(`${API_PREFIX}/app`, appRoutes);
    app.use(`${API_PREFIX}/auth`, authRoutes);
    app.use(`${API_PREFIX}/user/photos`, userPhotoRoutes);
    app.use(`${API_PREFIX}/user`, userRoutes);
    app.use(`${API_PREFIX}/users`, usersRoutes);
    app.use(`${API_PREFIX}/swipe`, swipeRoutes);
    app.use(`${API_PREFIX}/match`, matchRoutes);
    app.use(`${API_PREFIX}/chats`, chatRoutes);
    app.use(`${API_PREFIX}/catalog`, catalogRoutes);
    app.use(`${API_PREFIX}/report`, reportRoutes);
    app.use(`${API_PREFIX}/feedback`, feedbackRoutes);
    app.use((_req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Resource not found' }));
    app.use(errorHandler);
    return app;
}

export default createApp;
