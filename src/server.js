import { createApp } from './app.js';
import { parseEnv } from './config/env.js';
import { syncCatalog } from './services/catalogSyncService.js';

const env = parseEnv();
const app = createApp({ uploadRoot: env.uploadRoot, trustProxy: env.trustProxy });
const server = app.listen(env.port, () => console.log(`Server running on port ${env.port}`));
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 5_000;
server.on('error', error => console.error('HTTP server error', error));

let syncInterval = null;
if (env.nodeEnv !== 'test') {
    const syncIntervalMs = (env.catalogSyncIntervalHours || 24) * 60 * 60 * 1000;
    // Ejecucion diferida 10 segundos tras el arranque
    setTimeout(() => {
        syncCatalog().catch(err => console.error('Error en sincronizacion inicial de catalogo:', err.message));
    }, 10_000);

    syncInterval = setInterval(() => {
        syncCatalog().catch(err => console.error('Error en sincronizacion periodica de catalogo:', err.message));
    }, syncIntervalMs);
    syncInterval.unref?.();
}

function shutdown(signal) {
    console.log(`Received ${signal}, closing HTTP server`);
    if (syncInterval) clearInterval(syncInterval);
    server.close(error => {
        if (error) {
            console.error('Failed to close HTTP server', error);
            process.exitCode = 1;
        }
    });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

