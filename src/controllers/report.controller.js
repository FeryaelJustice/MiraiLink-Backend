import db from '../models/db.js';

export const reportUser = async (req, res, next) => {
    try {
        const reportedBy = req.user.id;
        const { reportedUser, reason } = req.body;

        if (!reportedUser || !reason || reason.trim().length < 5) {
            return res.status(400).json({ message: 'Debe indicar el usuario y una razón válida.' });
        }

        await db.query(
            'INSERT INTO reports (reported_by, reported_user, reason) VALUES ($1, $2, $3)',
            [reportedBy, reportedUser, reason.trim()]
        );

        res.status(201).json({ message: 'Usuario reportado correctamente' });
    } catch (err) {
        console.error('Error al reportar usuario:', err);
        next(err);
    }
};
