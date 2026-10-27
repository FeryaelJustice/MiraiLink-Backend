import nodemailer from 'nodemailer';

function config() {
    if (!process.env.MAIL_BRIDGE_URL) return null;
    const url = new URL(process.env.MAIL_BRIDGE_URL);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search || !process.env.MAIL_BRIDGE_KEY || process.env.MAIL_BRIDGE_KEY.length < 32 || !process.env.EMAIL_USER) throw Error('BRIDGE_NOT_CONFIGURED');
    return { url: url.href, key: process.env.MAIL_BRIDGE_KEY };
}

async function call(body) {
    const settings = config();
    if (!settings) throw Error('BRIDGE_NOT_CONFIGURED');
    const response = await fetch(settings.url, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(8500),
        headers: { Authorization: `Bearer ${settings.key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!response.ok) throw Error('BRIDGE_FAILED');
    const data = await response.json();
    if (data?.ok !== true) throw Error('BRIDGE_FAILED');
}

export async function verifyBridge() {
    await call({ action: 'verify' });
}

export async function sendViaBridge({ to, subject, html, text }) {
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
    const message = await transport.sendMail({ from: `"MiraiLink" <${process.env.EMAIL_USER}>`, to, subject, html, text });
    if (!Array.isArray(message.envelope.to) || message.envelope.to.length !== 1) throw Error('BRIDGE_INVALID_RECIPIENT');
    await call({ action: 'send', to: message.envelope.to[0], message: message.message.toString('utf8') });
}
