// Import required modules
import express from 'express';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import http from 'http';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import userPhotoRoutes from './routes/userphotos.routes.js';
import usersRoutes from './routes/users.routes.js';
import swipeRoutes from './routes/swipe.routes.js';
import matchRoutes from './routes/match.routes.js';
import chatRoutes from './routes/chat.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { setupSocketIO } from './sockets/socketHandler.js';
import { authenticateToken } from './middleware/auth.middleware.js';

const API_PREFIX = '/api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// Express app instance
const app = express();

// Enable CORS for cross-origin requests
app.use(cors({
    origin: [process.env.ORIGIN],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
}));

// Body parser middleware for JSON payloads
app.use(express.json());

// Compression middleware
app.use(compression());

// Upload directory for mediac
app.use("/static", express.static(join(__dirname + '/public')));
app.use("/assets", express.static(join(__dirname, '/assets')));

// Routes
app.get('/', (req, res) => res.send('Hello, World!'));
app.post(API_PREFIX + "/testAuth", authenticateToken, (req, res) => { res.status(200).json({ message: 'Autenticado correctamente' }) })
app.use(API_PREFIX + '/auth', authRoutes);
app.use(API_PREFIX + '/user', userRoutes);
app.use(API_PREFIX + '/user/photos', userPhotoRoutes);
app.use(API_PREFIX + '/users', usersRoutes);
app.use(API_PREFIX + '/swipe', swipeRoutes);
app.use(API_PREFIX + '/match', matchRoutes);
app.use(API_PREFIX + '/chats', chatRoutes);

// Error middleware al final
app.use(errorHandler);

// Chat y cosas que usen sockets
const server = http.createServer(app);
setupSocketIO(server); // ⬅️ conectar sockets aquí

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));