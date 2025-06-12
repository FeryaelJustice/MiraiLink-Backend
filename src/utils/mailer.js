// utils/mailer.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    // secure: false,
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
