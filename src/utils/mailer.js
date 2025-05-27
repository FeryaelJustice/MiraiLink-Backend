// utils/mailer.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,       // ejemplo: smtp.gmail.com
    port: process.env.EMAIL_PORT,       // ejemplo: 587 o 465
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,     // ejemplo: your.email@gmail.com
        pass: process.env.EMAIL_PASSWORD  // app password o clave específica
    }
});

export const sendVerificationEmail = async (to, code) => {
    try {
        const mailOptions = {
            from: `"MiraiLink" <${process.env.EMAIL_USER}>`,
            to,
            subject: 'Código de verificación',
            text: `Tu código de verificación es: ${code}`,
            html: `<p>Tu código de verificación es:</p><h2>${code}</h2>`
        };

        await transporter.sendMail(mailOptions);
        console.log(`Correo de verificación enviado a ${to}`);
    } catch (error) {
        console.error('Error enviando correo de verificación:', error);
    }
};
