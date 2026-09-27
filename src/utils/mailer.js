import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        return null;
    }
    transporter ??= nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
        port: Number(process.env.EMAIL_PORT || 587),
        secure: process.env.EMAIL_SECURE === 'true',
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

export async function sendGenericEmail({ to, subject, html, text, logData = {} }) {
    const transport = getTransporter();

    // Si no esta configurado SMTP, simular en consola de forma limpia
    if (!transport) {
        printSimulatorLog({ to, subject, ...logData });
        return { success: true, simulated: true };
    }

    try {
        await transport.sendMail({
            from: `"MiraiLink" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html,
        });
        return { success: true, simulated: false };
    } catch (error) {
        // En caso de fallo de red o SMTP caido, registrar advertencia y simular sin romper la app
        console.warn(`[Mailer Warning] No se pudo enviar el correo a ${to}:`, error.message);
        printSimulatorLog({ to, subject, ...logData, additional: { fallbackReason: error.message } });
        return { success: false, error: error.message, simulated: true };
    }
}

export async function sendVerificationEmail(to, code, token, userId) {
    const APP_BASE_URL = process.env.APP_BASE_URL || 'https://mirailink.xyz';
    const verificationToken = token || code;
    const userParam = userId ? `&userId=${encodeURIComponent(userId)}` : '';
    const deepLink = `mirailink://verify?token=${encodeURIComponent(verificationToken)}${userParam}`;
    const webLink = `${APP_BASE_URL}/verify?token=${encodeURIComponent(verificationToken)}${userParam}`;
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
            <a href="${deepLink}" class="btn">Abrir en la App</a>
            <p style="font-size:12px; margin-top:10px;"><a href="${webLink}" style="color:#38BDF8;">Enlace web: ${webLink}</a></p>
        </div>
        <p style="font-size:13px; color:#94A3B8; text-align:center; margin-top:20px;">
            Este codigo expirara en 15 minutos por motivos de seguridad.
        </p>
    `;

    const text = `Tu codigo de verificacion de MiraiLink es: ${code}\nApp Link: ${deepLink}\nWeb Link: ${webLink}\nEste codigo expira en 15 minutos.`;

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
    const APP_BASE_URL = process.env.APP_BASE_URL || 'https://mirailink.xyz';
    const resetToken = token || code;
    const deepLink = `mirailink://reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(to)}`;
    const webLink = `${APP_BASE_URL}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(to)}`;
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
            <a href="${deepLink}" class="btn">Restablecer en la App</a>
            <p style="font-size:12px; margin-top:10px;"><a href="${webLink}" style="color:#38BDF8;">Enlace web: ${webLink}</a></p>
        </div>
        <p style="font-size:13px; color:#94A3B8; text-align:center; margin-top:20px;">
            Este codigo expira en 5 minutos. Si no has solicitado este cambio, puedes ignorar este correo.
        </p>
    `;

    const text = `Tu codigo para restablecer contrasena en MiraiLink es: ${code}\nApp Link: ${deepLink}\nWeb Link: ${webLink}\nEste codigo expira en 5 minutos.`;

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
