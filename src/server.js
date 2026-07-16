import { createApp } from './app.js';
import { parseEnv } from './config/env.js';

const env = parseEnv();
const app = createApp({ uploadRoot: env.uploadRoot });
const server = app.listen(env.port, () => console.log(`Server running on port ${env.port}`));
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 5_000;
server.on('error', error => console.error('HTTP server error', error));

function shutdown(signal) {
    console.log(`Received ${signal}, closing HTTP server`);
    server.close(error => {
        if (error) {
            console.error('Failed to close HTTP server', error);
            process.exitCode = 1;
        }
    });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
