// utils/mailer.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
    port: process.env.EMAIL_PORT || 587, // Default SMTP port
    secure: process.env.EMAIL_SECURE == 'true', // cuidado, viene como string
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

export const sendVerificationEmail = (to, code) => {
    try {
        const mailOptions = {
            from: `"MiraiLink" <${process.env.EMAIL_USER}>`,
            to,
            subject: 'Código de verificación',
            text: `Tu código de verificación es: ${code}`,
            html: `<p>Tu código de verificación es:</p><h2>${code}</h2>`
        };

        transporter.sendMail(mailOptions).then(() => console.log('Enviado'))
            .catch(err => console.error('Error:', err));
    } catch (error) {
        console.error('Error enviando correo de verificación:', error);
    }
};
