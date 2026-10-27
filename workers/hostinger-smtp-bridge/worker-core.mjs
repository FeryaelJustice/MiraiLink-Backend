/* global TextEncoder, TextDecoder, btoa, Response */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function safeEqual(a, b) {
    const aa = encoder.encode(a); const bb = encoder.encode(b);
    if (aa.length !== bb.length) return false;
    let diff = 0;
    for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
    return diff === 0;
}
function validAddress(value) {
    return typeof value === 'string' && value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
}
function b64(value) {
    return btoa(Array.from(encoder.encode(value), byte => String.fromCharCode(byte)).join(''));
}

export async function handleRequest(request, env, openSocket) {
    const reply = (status, result) => Response.json(result, { status, headers: { 'Cache-Control': 'no-store' } });
    if (request.method !== 'POST') return reply(405, { ok: false });
    if (typeof env.BRIDGE_KEY !== 'string' || env.BRIDGE_KEY.length < 32 || !safeEqual(request.headers.get('Authorization') || '', `Bearer ${env.BRIDGE_KEY}`)) return reply(401, { ok: false });
    if (!validAddress(env.SMTP_USER) || typeof env.SMTP_PASSWORD !== 'string' || !env.SMTP_PASSWORD) return reply(503, { ok: false, code: 'NOT_CONFIGURED' });
    const length = Number(request.headers.get('Content-Length'));
    if (length > 300_000) return reply(413, { ok: false });
    let body;
    try {
        const reader = request.body?.getReader();
        if (!reader) return reply(400, { ok: false });
        const chunks = []; let total = 0;
        while (true) {
            const part = await reader.read();
            if (part.done) break;
            total += part.value.byteLength;
            if (total > 300_000) { await reader.cancel(); return reply(413, { ok: false }); }
            chunks.push(part.value);
        }
        const bytes = new Uint8Array(total); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        body = JSON.parse(new TextDecoder().decode(bytes));
    } catch { return reply(400, { ok: false }); }
    if (!body || !['verify', 'send'].includes(body.action)) return reply(400, { ok: false });
    if (body.action === 'send' && (!validAddress(body.to) || typeof body.message !== 'string' || encoder.encode(body.message).length > 200_000)) return reply(400, { ok: false });
    let socket;
    try {
        socket = openSocket();
        const reader = socket.readable.getReader();
        const writer = socket.writable.getWriter();
        let buffer = '';
        async function response(expected) {
            while (true) {
                const end = buffer.indexOf('\n');
                if (end >= 0) {
                    const line = buffer.slice(0, end).replace(/\r$/, ''); buffer = buffer.slice(end + 1);
                    const match = /^(\d{3})([ -])/.exec(line);
                    if (!match) throw Error('BAD_SMTP_RESPONSE');
                    if (match[2] === ' ') {
                        if (!expected.includes(Number(match[1]))) throw Error('SMTP_REJECTED');
                        return;
                    }
                } else {
                    const next = await reader.read();
                    if (next.done) throw Error('SMTP_CLOSED');
                    buffer += decoder.decode(next.value, { stream: true });
                    if (buffer.length > 65_536) throw Error('SMTP_RESPONSE_TOO_LONG');
                }
            }
        }
        async function command(text, expected) { await writer.write(encoder.encode(`${text}\r\n`)); await response(expected); }
        await response([220]);
        await command('EHLO mirailink.local', [250]);
        await command('AUTH LOGIN', [334]);
        await command(b64(env.SMTP_USER), [334]);
        await command(b64(env.SMTP_PASSWORD), [235]);
        if (body.action === 'send') {
            await command(`MAIL FROM:<${env.SMTP_USER}>`, [250]);
            await command(`RCPT TO:<${body.to}>`, [250, 251]);
            await command('DATA', [354]);
            const message = body.message.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..').replace(/\r\n$/, '');
            await writer.write(encoder.encode(`${message}\r\n.\r\n`));
            await response([250]);
        }
        await command('QUIT', [221]).catch(() => {});
        return reply(200, { ok: true });
    } catch {
        return reply(502, { ok: false, code: 'SMTP_FAILED' });
    } finally {
        if (socket) await socket.close().catch(() => {});
    }
}
