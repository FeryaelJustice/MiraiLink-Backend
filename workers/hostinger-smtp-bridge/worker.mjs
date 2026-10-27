import { connect } from 'cloudflare:sockets';
import { handleRequest } from './worker-core.mjs';

export default {
    fetch(request, env) {
        return handleRequest(request, env, () => connect({ hostname: 'smtp.hostinger.com', port: 465 }, { secureTransport: 'on' }));
    },
};
