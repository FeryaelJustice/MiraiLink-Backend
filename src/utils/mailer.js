import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        throw new Error('Email provider is not configured');
    }
    transporter ??= nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
        port: Number(process.env.EMAIL_PORT || 587),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    });
    return transporter;
}

export async function sendVerificationEmail(to, code) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.log(`\n========================================`);
        console.log(`📧 [DEV EMAIL SIMULATOR]`);
        console.log(`Para: ${to}`);
        console.log(`Asunto: Código de verificación`);
        console.log(`Código: >>> ${code} <<<`);
        console.log(`========================================\n`);
        return;
    }

    await getTransporter().sendMail({
        from: `"MiraiLink" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Código de verificación',
        text: `Tu código de verificación es: ${code}`,
        html: `<p>Tu código de verificación es:</p><h2>${code}</h2>`,
    });
}
