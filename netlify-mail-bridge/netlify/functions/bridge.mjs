/* global Response, Netlify, Buffer */
import nodemailer from 'nodemailer';
import { timingSafeEqual } from 'node:crypto';
const address = s => typeof s === 'string' && s.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s);
const reply = (status, data) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export default async request => {
  if (request.method !== 'POST') return reply(405, { ok: false });
  const key = Netlify.env.get('BRIDGE_KEY');
  const supplied = request.headers.get('authorization') || '';
  const expected = `Bearer ${key || ''}`;
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  if (!key || key.length < 32 || a.length !== b.length || !timingSafeEqual(a, b)) return reply(401, { ok: false });
  const user = Netlify.env.get('SMTP_USER'), pass = Netlify.env.get('SMTP_PASSWORD');
  if (!address(user) || !pass) return reply(503, { ok: false });
  let body;
  try {
    const reader = request.body?.getReader(); if (!reader) return reply(400, { ok: false });
    let n = 0, chunks = [];
    while (true) { const part = await reader.read(); if (part.done) break; n += part.value.length; if (n > 300000) { await reader.cancel(); return reply(413, { ok: false }); } chunks.push(part.value); }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return reply(400, { ok: false }); }
  if (!body || !['verify','send'].includes(body.action) || (body.action === 'send' && (!address(body.to) || typeof body.message !== 'string' || Buffer.byteLength(body.message) > 200000))) return reply(400, { ok: false });
  const transport = nodemailer.createTransport({ host: 'smtp.hostinger.com', port: 465, secure: true, auth: { user, pass }, connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 7000 });
  try {
    if (body.action === 'verify') await transport.verify();
    else { const info = await transport.sendMail({ envelope: { from: user, to: [body.to] }, raw: body.message }); if (!info.accepted?.length || info.rejected?.length) throw Error('SMTP_REJECTED'); }
    return reply(200, { ok: true });
  } catch { return reply(502, { ok: false, code: 'SMTP_FAILED' }); }
  finally { transport.close(); }
};
