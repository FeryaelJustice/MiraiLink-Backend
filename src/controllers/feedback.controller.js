import db from '../models/db.js';

export const sendFeedback = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { feedback } = req.body;

        if (!feedback || feedback.trim().length === 0) {
            return res.status(400).json({ message: 'El mensaje no puede estar vacío.' });
        }

        if (feedback.length > 10000) {
            return res.status(400).json({ message: 'El mensaje excede el límite de 10000 caracteres.' });
        }

        await db.query(
            'INSERT INTO feedback (user_id, message) VALUES ($1, $2)',
            [userId, feedback]
        );

        res.status(201).json({ message: 'Feedback enviado correctamente.' });
    } catch (err) {
        console.error('Error al guardar feedback:', err);
        next(err);
    }
};
