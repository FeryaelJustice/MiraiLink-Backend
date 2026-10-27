/* global Request, console */
import assert from 'node:assert/strict';
import handler from './netlify/functions/bridge.mjs';
const values = { BRIDGE_KEY: 'x'.repeat(64), SMTP_USER: 'sender@example.com', SMTP_PASSWORD: 'test' };
globalThis.Netlify = { env: { get: k => values[k] } };
const request = (authorization, body) => new Request('https://example.test', { method: 'POST', headers: { authorization }, body });
assert.equal((await handler(new Request('https://example.test'))).status, 405);
assert.equal((await handler(request('Bearer wrong', '{}'))).status, 401);
assert.equal((await handler(request('Bearer '+values.BRIDGE_KEY, '{'))).status, 400);
assert.equal((await handler(request('Bearer '+values.BRIDGE_KEY, JSON.stringify({ action: 'send', to: 'bad\r\naddress', message: 'x' })))).status, 400);
assert.equal((await handler(request('Bearer '+values.BRIDGE_KEY, 'x'.repeat(300001)))).status, 413);
console.log('Bridge request validation passed');
