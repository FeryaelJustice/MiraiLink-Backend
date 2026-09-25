import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from './errors/AppError.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestId } from './middleware/requestId.middleware.js';
import { globalApiLimiter } from './middleware/rateLimit.middleware.js';
import appRoutes from './routes/app.routes.js';
import authRoutes from './routes/auth.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import chatRoutes from './routes/chat.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import matchRoutes from './routes/match.routes.js';
import reportRoutes from './routes/report.routes.js';
import swipeRoutes from './routes/swipe.routes.js';
import exploreRoutes from './routes/explore.routes.js';
import userRoutes from './routes/user.routes.js';
import userPhotoRoutes from './routes/userphotos.routes.js';
import usersRoutes from './routes/users.routes.js';

const API_PREFIX = '/api';
const __dirname = dirname(fileURLToPath(import.meta.url));

function createCorsOptions() {
    const rawOrigins = (process.env.ORIGIN ?? '').split(',').map(value => value.trim()).filter(Boolean);
    const allowAll = rawOrigins.includes('*');
    const regexPattern = process.env.ORIGIN_REGEX ? new RegExp(process.env.ORIGIN_REGEX) : null;
    const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';

    const defaultDevPattern = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|10\.0\.3\.2)(:\d+)?$/;
    const cloudflareTunnelPattern = /^https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com$/;

    return {
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        origin(origin, callback) {
            // Permitir peticiones sin cabecera origin (clientes moviles nativos, curl, etc.)
            if (!origin || allowAll) {
                callback(null, true);
                return;
            }

            // Comprobar coincidencia exacta con lista configurada
            if (rawOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            // Comprobar expresion regular configurada en ORIGIN_REGEX
            if (regexPattern && regexPattern.test(origin)) {
                callback(null, true);
                return;
            }

            // En desarrollo y pruebas, permitir automaticamente localhost, emuladores y tuneles Cloudflare
            if (isDev && (defaultDevPattern.test(origin) || cloudflareTunnelPattern.test(origin))) {
                callback(null, true);
                return;
            }

            callback(new AppError({ status: 403, code: 'CORS_REJECTED', message: 'Origin is not allowed' }));
        },
    };
}

export function createApp({ uploadRoot, enableRateLimits = true, trustProxy = 'loopback' } = {}) {
    const resolvedProfileUploadRoot =
        (uploadRoot && uploadRoot.trim().length > 0)
            ? uploadRoot
            : join(__dirname, 'assets', 'img', 'profiles');
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', trustProxy);
    app.locals.enableRateLimits = enableRateLimits;
    app.use(requestId);
    app.use(cors(createCorsOptions()));
    app.use(express.json({ limit: '100kb' }));
    app.use(compression());
    app.use(helmet());
    app.use('/static', express.static(join(__dirname, 'public'), { dotfiles: 'deny', index: false }));
    app.use('/assets/img/profiles', (_req, res, next) => {
        res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'");
        res.set('X-Content-Type-Options', 'nosniff');
        next();
    }, express.static(resolvedProfileUploadRoot, { dotfiles: 'deny', index: false, fallthrough: false }));

    app.get('/', (_req, res) => res.json({ service: 'mirailink-backend' }));
    app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));
    app.use(API_PREFIX, globalApiLimiter());
    app.use(`${API_PREFIX}/app`, appRoutes);
    app.use(`${API_PREFIX}/auth`, authRoutes);
    app.use(`${API_PREFIX}/user/photos`, userPhotoRoutes);
    app.use(`${API_PREFIX}/user`, userRoutes);
    app.use(`${API_PREFIX}/users`, usersRoutes);
    app.use(`${API_PREFIX}/swipe`, swipeRoutes);
    app.use(`${API_PREFIX}/explore`, exploreRoutes);
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
