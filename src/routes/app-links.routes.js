import { Router } from 'express';
import { ANDROID_PACKAGE, appLinksConfig } from '../config/appLinks.js';

const escapeHtml = value => value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const router = Router();

router.get('/.well-known/assetlinks.json', (_req, res) => {
    res.json([{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
            namespace: 'android_app',
            package_name: ANDROID_PACKAGE,
            sha256_cert_fingerprints: appLinksConfig().fingerprints,
        },
    }]);
});

for (const path of ['/verify', '/verification', '/reset-password', '/recover_password', '/recover-password']) {
    router.get(path, (req, res) => {
        res.set('Cache-Control', 'no-store');
        res.set('Referrer-Policy', 'no-referrer');
        const verify = path === '/verify' || path === '/verification';
        const permitted = verify ? ['token', 'userId', 'user_id'] : ['token', 'email'];
        if (Object.entries(req.query).some(([key, value]) =>
            !permitted.includes(key) || typeof value !== 'string' || value.length > 254 ||
            Array.from(value).some(char => char.charCodeAt(0) < 32)) ||
            (req.query.userId && req.query.user_id)) {
            return res.status(400).json({ code: 'INVALID_INPUT', message: 'Invalid link parameters' });
        }
        const query = new URLSearchParams(req.query).toString();
        const destination = 'mirailink://' + (verify ? 'verify' : 'reset-password') + (query ? '?' + query : '');
        const title = verify ? 'Verifica tu cuenta' : 'Recupera tu contrasena';
        return res.type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} - MiraiLink</title></head>
<body><main><h1>${title}</h1><p>Continua en MiraiLink para completar esta operacion.</p>
<p><a href="${escapeHtml(destination)}">Abrir MiraiLink</a></p>
<p><a href="https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}">Instalar desde Google Play</a></p>
<p>Si el enlace no abre la app, abre MiraiLink e introduce el codigo del correo.
El codigo puede caducar; solicita uno nuevo desde la app si es necesario.</p>
<p>Abrir esta pagina no confirma ni cambia tu cuenta.</p></main></body></html>`);
    });
}
export default router;
