import { securityLink } from '../config/appLinks.js';
import nodemailer from 'nodemailer';
import { verifyBridge, sendViaBridge } from './workerMailTransport.js';

let transporter = null;

function smtpDiagnostic(error) {
    const allowedCodes = new Set(['ETIMEDOUT', 'ESOCKET', 'ECONNECTION', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'EAUTH', 'EENVELOPE', 'EMESSAGE', 'EDNS', 'ESTREAM']);
    const command = String(error?.command || '').split(' ')[0];
    return {
        event: 'email_delivery_failed',
        code: allowedCodes.has(error?.code) ? error.code : 'SMTP_ERROR',
        ...(new Set(['CONN', 'AUTH', 'EHLO', 'HELO', 'MAIL', 'RCPT', 'DATA', 'STARTTLS']).has(command) ? { phase: command } : {}),
        ...(Number.isInteger(error?.responseCode) ? { responseCode: error.responseCode } : {}),
    };
}

export async function verifyEmailTransport() {
    if (process.env.MAIL_BRIDGE_URL) {
        try { await verifyBridge(); return { success: true }; }
        catch { console.warn('[Mailer Warning]', JSON.stringify({ event: 'email_delivery_failed', code: 'BRIDGE_FAILED' })); return { success: false, code: 'BRIDGE_FAILED' }; }
    }
    const transport = getTransporter();
    if (!transport) {
        console.warn('[Mailer Warning]', JSON.stringify({ event: 'email_delivery_failed', code: 'EMAIL_NOT_CONFIGURED' }));
        return { success: false, code: 'EMAIL_NOT_CONFIGURED' };
    }
    try {
        await transport.verify();
        return { success: true };
    } catch (error) {
        const diagnostic = smtpDiagnostic(error);
        console.warn('[Mailer Warning]', JSON.stringify(diagnostic));
        return { success: false, ...diagnostic };
    }
}


function getTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        return null;
    }
    const port = Number(process.env.EMAIL_PORT || 587);
    transporter ??= nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
        port,
        secure: process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : port === 465,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 8000,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    });
    return transporter;
}

export function renderEmailShell({ title, preheader, contentHtml }) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC; }
        .wrapper { width: 100%; max-width: 600px; margin: 0 auto; padding: 24px 16px; box-sizing: border-box; }
        .card { background-color: #1E293B; border-radius: 16px; border: 1px solid #334155; padding: 32px 24px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3); }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 26px; font-weight: 800; color: #38BDF8; letter-spacing: -0.5px; }
        .code-box { background: #0F172A; border: 1px dashed #38BDF8; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0; }
        .code-text { font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #38BDF8; margin: 0; font-family: monospace; }
        .btn { display: inline-block; background-color: #38BDF8; color: #0F172A; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 28px; border-radius: 10px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94A3B8; line-height: 1.5; }
    </style>
</head>
<body>
    <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${preheader || title}
    </div>
    <div class="wrapper">
        <div class="card">
            <div class="header">
                <div class="logo">MiraiLink</div>
            </div>
            ${contentHtml}
        </div>
        <div class="footer">
            <p>Este es un correo automatico de seguridad enviado por MiraiLink. Si no has solicitado esta accion, por favor ignora este mensaje.</p>
            <p>&copy; ${new Date().getFullYear()} MiraiLink. Todos los derechos reservados.</p>
        </div>
    </div>
</body>
</html>`;
}

export function printSimulatorLog({ to, subject, type, code, deepLink, webLink, expiresIn, additional }) {
    console.log('\n======================================================');
    console.log(`📧 [DEV EMAIL SIMULATOR] - ${type || 'Notificacion'}`);
    console.log(`Para:       ${to}`);
    console.log(`Asunto:     ${subject}`);
    if (code) console.log(`Codigo:     >>> ${code} <<<`);
    if (deepLink) console.log(`Deep Link:  >>> ${deepLink} <<<`);
    if (webLink)  console.log(`Web Link:   >>> ${webLink} <<<`);
    if (expiresIn) console.log(`Expiracion: ${expiresIn}`);
    if (additional) console.log(`Detalles:   ${JSON.stringify(additional)}`);
    console.log('======================================================\n');
}

/**
 * Sends through Nodemailer with bounded SMTP timeouts. Production never simulates delivery.
 * Diagnostics expose only a stable code and protocol phase, without recipient or secrets.
 */
export async function sendGenericEmail({ to, subject, html, text, logData = {} }) {
    if (process.env.MAIL_BRIDGE_URL) {
        try { await sendViaBridge({ to, subject, html, text }); return { success: true, simulated: false }; }
        catch { console.warn('[Mailer Warning]', JSON.stringify({ event: 'email_delivery_failed', code: 'BRIDGE_FAILED' })); return { success: false, simulated: false, code: 'BRIDGE_FAILED' }; }
    }
    const transport = getTransporter();

    // Si no esta configurado SMTP, simular en consola de forma limpia
    if (!transport) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('[Mailer Warning]', JSON.stringify({ event: 'email_delivery_failed', code: 'EMAIL_NOT_CONFIGURED' }));
            return { success: false, simulated: false, code: 'EMAIL_NOT_CONFIGURED' };
        }
        printSimulatorLog({ to, subject, ...logData });
        return { success: true, simulated: true };
    }

    try {
        const info = await transport.sendMail({
            from: `"MiraiLink" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });
        if (Array.isArray(info?.accepted) && info.accepted.length === 0) {
            console.warn('[Mailer Warning]', JSON.stringify({ event: 'email_delivery_failed', code: 'RECIPIENT_REJECTED' }));
            return { success: false, simulated: false, code: 'RECIPIENT_REJECTED' };
        }
        return { success: true, simulated: false };
    } catch (error) {
        // En caso de fallo de red o SMTP caido, registrar advertencia y simular sin romper la app
        const diagnostic = smtpDiagnostic(error);
        console.warn('[Mailer Warning]', JSON.stringify(diagnostic));
        if (process.env.NODE_ENV !== 'production') printSimulatorLog({ to, subject, ...logData });
        return { success: false, code: diagnostic.code, simulated: process.env.NODE_ENV !== 'production' };
    }
}

export async function sendVerificationEmail(to, code, token, userId) {
    const verificationToken = token || code;
    const userParam = userId ? `&userId=${encodeURIComponent(userId)}` : '';
    const deepLink = `mirailink://verify?token=${encodeURIComponent(verificationToken)}${userParam}`;
    const webLink = securityLink('/verify', { token: verificationToken, userId });
    const subject = 'Verifica tu cuenta en MiraiLink';

    const contentHtml = `
        <h2 style="margin-top:0; color:#F8FAFC; text-align:center;">Verifica tu correo electronico</h2>
        <p style="font-size:15px; line-height:1.6; color:#CBD5E1; text-align:center;">
            ¡Gracias por unirte a MiraiLink! Introduce el siguiente codigo en la aplicacion para completar tu registro:
        </p>
        <div class="code-box">
            <p class="code-text">${code}</p>
        </div>
        <div style="text-align:center;">
            <p style="font-size:14px; color:#94A3B8;">O si estas en tu dispositivo movil, pulsa en el boton directo:</p>
            <a href="${webLink}" class="btn">Abrir en la App</a>
            <p style="font-size:12px; margin-top:10px;"><a href="${webLink}" style="color:#38BDF8;">Enlace web: ${webLink}</a></p>
        </div>
        <p style="font-size:13px; color:#94A3B8; text-align:center; margin-top:20px;">
            Este codigo expirara en 15 minutos por motivos de seguridad.
        </p>
    `;

    const text = `Tu codigo de verificacion de MiraiLink es: ${code}\nApp Link: ${webLink}\nWeb Link: ${webLink}\nEste codigo expira en 15 minutos.`;

    return sendGenericEmail({
        to,
        subject,
        html: renderEmailShell({ title: subject, preheader: `Tu codigo es ${code}`, contentHtml }),
        text,
        logData: {
            type: 'Verificacion de cuenta',
            code,
            deepLink,
            webLink,
            expiresIn: '15 minutos',
        },
    });
}

export async function sendPasswordResetEmail(to, code, token) {
    const resetToken = token || code;
    const deepLink = `mirailink://reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(to)}`;
    const webLink = securityLink('/reset-password', { token: resetToken, email: to });
    const subject = 'Restablece tu contrasena en MiraiLink';

    const contentHtml = `
        <h2 style="margin-top:0; color:#F8FAFC; text-align:center;">Restablecimiento de contrasena</h2>
        <p style="font-size:15px; line-height:1.6; color:#CBD5E1; text-align:center;">
            Hemos recibido una solicitud para restablecer la contrasena de tu cuenta en MiraiLink.
        </p>
        <div class="code-box">
            <p class="code-text">${code}</p>
        </div>
        <div style="text-align:center;">
            <p style="font-size:14px; color:#94A3B8;">Tambien puedes pulsar en el siguiente boton para abrir la app:</p>
            <a href="${webLink}" class="btn">Restablecer en la App</a>
            <p style="font-size:12px; margin-top:10px;"><a href="${webLink}" style="color:#38BDF8;">Enlace web: ${webLink}</a></p>
        </div>
        <p style="font-size:13px; color:#94A3B8; text-align:center; margin-top:20px;">
            Este codigo expira en 5 minutos. Si no has solicitado este cambio, puedes ignorar este correo.
        </p>
    `;

    const text = `Tu codigo para restablecer contrasena en MiraiLink es: ${code}\nApp Link: ${webLink}\nWeb Link: ${webLink}\nEste codigo expira en 5 minutos.`;

    return sendGenericEmail({
        to,
        subject,
        html: renderEmailShell({ title: subject, preheader: `Tu codigo es ${code}`, contentHtml }),
        text,
        logData: {
            type: 'Restablecimiento de contrasena',
            code,
            deepLink,
            webLink,
            expiresIn: '5 minutos',
        },
    });
}

export async function sendTwoFactorEmail(to, code, action) {
    const verb = action === 'enable' ? 'activar' : 'desactivar';
    const subject = 'Codigo para ' + verb + ' el doble factor de MiraiLink';
    const contentHtml = '<h2>' + subject + '</h2><p>Introduce este codigo en MiraiLink:</p>' +
        '<div class="code-box"><p class="code-text">' + code + '</p></div>' +
        '<p>Caduca en 5 minutos. Si no solicitaste esta accion, no compartas el codigo.</p>';
    if (process.env.NODE_ENV === 'production' && !getTransporter()) {
        return { success: false, simulated: false };
    }
    return sendGenericEmail({
        to, subject,
        html: renderEmailShell({ title: subject, contentHtml }),
        text: subject + ': ' + code + '. Caduca en 5 minutos.',
        logData: { type: 'Confirmacion de doble factor' },
    });
}
