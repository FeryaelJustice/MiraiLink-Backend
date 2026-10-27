/* global Request, ReadableStream, WritableStream, TextEncoder, TextDecoder */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { handleRequest } from './worker-core.mjs';

const key = 'test-key-012345678901234567890123456789';
const env = { BRIDGE_KEY: key, SMTP_USER: 'sender@example.com', SMTP_PASSWORD: 'test-password' };
const request = (body, auth = key) => new Request('https://bridge.example/', { method: 'POST', headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function fakeSocket(transcript, failAuth = false) {
    const replies = ['220 ready\r\n', '250-server\r\n250 AUTH LOGIN\r\n', '334 username\r\n', '334 password\r\n', failAuth ? '535 rejected\r\n' : '235 accepted\r\n', '250 ok\r\n', '250 ok\r\n', '354 go\r\n', '250 queued\r\n', '221 bye\r\n'];
    let idx = 0; let controller;
    const readable = new ReadableStream({ start(c) { controller = c; c.enqueue(new TextEncoder().encode(replies[idx++])); } });
    const writable = new WritableStream({ write(chunk) { transcript.push(new TextDecoder().decode(chunk)); if (replies[idx]) controller.enqueue(new TextEncoder().encode(replies[idx++])); } });
    return { readable, writable, async close() {} };
}

test('rejects invalid key and never opens socket', async () => {
    let opened = false;
    const res = await handleRequest(request({ action: 'verify' }, 'wrong'), env, () => { opened = true; });
    assert.equal(res.status, 401); assert.equal(opened, false);
});
test('sends mail with SMTP authentication and escapes leading dots', async () => {
    const transcript = [];
    const res = await handleRequest(request({ action: 'send', to: 'user@example.com', message: 'Subject: test\r\n\r\n.test\r\n' }), env, () => fakeSocket(transcript));
    assert.equal(res.status, 200);
    assert.ok(transcript.includes('MAIL FROM:<sender@example.com>\r\n'));
    assert.ok(transcript.includes('RCPT TO:<user@example.com>\r\n'));
    assert.ok(transcript.some(value => value.includes('\r\n..test\r\n.\r\n')));
});
test('does not claim success when SMTP authentication fails', async () => {
    const res = await handleRequest(request({ action: 'verify' }), env, () => fakeSocket([], true));
    assert.equal(res.status, 502);
});
test('rejects injected recipient and never opens socket', async () => {
    let opened = false;
    const res = await handleRequest(request({ action: 'send', to: 'user@example.com\r\nRCPT TO:evil@example.com', message: 'test' }), env, () => { opened = true; });
    assert.equal(res.status, 400); assert.equal(opened, false);
});
test('rejects oversized bodies even without a content length', async () => {
    let opened = false;
    const res = await handleRequest(request({ action: 'send', to: 'user@example.com', message: 'x'.repeat(300_001) }), env, () => { opened = true; });
    assert.equal(res.status, 413); assert.equal(opened, false);
});
