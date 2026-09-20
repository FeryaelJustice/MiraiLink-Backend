import db from '../models/db.js';
import { localizedCatalogSql, resolveCatalogLanguage, toLocalizedCatalogItem } from '../utils/catalogLocalization.js';

export const getAllAnimes = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const result = await db.query(`${localizedCatalogSql('anime', 1)} ORDER BY name ASC`, [locale]);
        res.json(result.rows.map(row => toLocalizedCatalogItem(row, req)));
    } catch (err) {
        next(err);
    }
};

export const getAllGames = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const result = await db.query(`${localizedCatalogSql('game', 1)} ORDER BY name ASC`, [locale]);
        res.json(result.rows.map(row => toLocalizedCatalogItem(row, req)));
    } catch (err) {
        next(err);
    }
};
