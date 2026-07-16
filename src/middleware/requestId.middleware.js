import { randomUUID } from 'node:crypto';

export function requestId(req, res, next) {
    const incoming = req.get('x-request-id');
    req.id = incoming && incoming.length <= 128 ? incoming : randomUUID();
    res.set('x-request-id', req.id);
    next();
}
