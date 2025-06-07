import db from '../models/db.js';

export const getAllAnimes = async (req, res, next) => {
    try {
        const result = await db.query('SELECT id, name, image_url FROM animes ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
};

export const getAllGames = async (req, res, next) => {
    try {
        const result = await db.query('SELECT id, name, image_url FROM games ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        next(err);
    }
};
