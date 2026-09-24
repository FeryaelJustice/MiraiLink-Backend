import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const prefixes = {
    'app.routes.js': '/api/app', 'auth.routes.js': '/api/auth',
    'catalog.routes.js': '/api/catalog', 'chat.routes.js': '/api/chats',
    'feedback.routes.js': '/api/feedback', 'match.routes.js': '/api/match',
    'report.routes.js': '/api/report', 'swipe.routes.js': '/api/swipe',
    'explore.routes.js': '/api/explore',
    'user.routes.js': '/api/user', 'userphotos.routes.js': '/api/user/photos',
    'users.routes.js': '/api/users',
};

function openApiPath(expressPath) {
    return expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}').replace(/\/$/, '') || '/';
}

export function collectExpressRoutes(root) {
    const routes = [];
    for (const [filename, prefix] of Object.entries(prefixes)) {
        const source = fs.readFileSync(path.join(root, 'src', 'routes', filename), 'utf8');
        const pattern = /router\.(get|post|put|patch|delete)\(\s*['"]([^'"]*)['"]/g;
        for (const match of source.matchAll(pattern)) {
            routes.push(`${match[1]} ${openApiPath(`${prefix}${match[2]}`)}`);
        }
    }
    return routes.sort();
}

export function validateContract(root) {
    const document = YAML.parse(fs.readFileSync(path.join(root, 'docs', 'openapi.yaml'), 'utf8'));
    const operations = [];
    const operationIds = [];
    for (const [route, pathItem] of Object.entries(document.paths ?? {})) {
        for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
            if (pathItem[method]) {
                operations.push(`${method} ${route.replace(/\/$/, '') || '/'}`);
                operationIds.push(pathItem[method].operationId);
            }
        }
    }
    const missing = collectExpressRoutes(root).filter(route => !operations.includes(route));
    const duplicates = operationIds.filter((id, index) => id && operationIds.indexOf(id) !== index);
    if (missing.length || duplicates.length) {
        throw new Error(`OpenAPI contract mismatch. Missing: ${missing.join(', ') || 'none'}. Duplicate operationIds: ${[...new Set(duplicates)].join(', ') || 'none'}`);
    }
    return { routeCount: operations.length };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
    const result = validateContract(process.cwd());
    console.log(`OpenAPI contract valid: ${result.routeCount} operations documented`);
}
