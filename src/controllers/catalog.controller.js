import db from '../models/db.js';
import { localizedCatalogSql, resolveCatalogLanguage, toLocalizedCatalogItem } from '../utils/catalogLocalization.js';

const geographyNameSql = (kind, localePosition) => {
    const table = kind === 'country' ? 'countries' : kind === 'region' ? 'regions' : 'cities';
    const translation = `${kind}_name_translations`;
    const foreignKey = `${kind}_id`;
    return `
        SELECT item.id, COALESCE(requested.name, fallback.name) AS name,
               item.latitude, item.longitude,
               ARRAY(SELECT DISTINCT aliases.normalized_name
                     FROM ${translation} aliases
                     WHERE aliases.${foreignKey} = item.id) AS aliases
        FROM ${table} item
        JOIN supported_languages fallback_language ON fallback_language.code = 'es'
        LEFT JOIN supported_languages requested_language ON requested_language.code = $${localePosition}
        LEFT JOIN ${translation} requested ON requested.${foreignKey} = item.id AND requested.language_id = requested_language.id
        LEFT JOIN ${translation} fallback ON fallback.${foreignKey} = item.id AND fallback.language_id = fallback_language.id
    `;
};

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

export const getCountries = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const result = await db.query(
            `${geographyNameSql('country', 1)} ORDER BY name ASC`,
            [locale],
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

export const getRegions = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const result = await db.query(
            `${geographyNameSql('region', 2)} WHERE item.country_id = $1 ORDER BY name ASC`,
            [req.params.countryId, locale],
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

export const getCities = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const query = String(req.query.query ?? '').trim();
        const result = await db.query(
            `${geographyNameSql('city', 3)}
             WHERE item.region_id = $1
               AND ($2 = '' OR EXISTS (
                   SELECT 1 FROM city_name_translations search_names
                   WHERE search_names.city_id = item.id
                     AND search_names.normalized_name LIKE '%' || lower($2) || '%'
               ))
             ORDER BY item.population DESC NULLS LAST, name ASC
             LIMIT 50`,
            [req.params.regionId, query, locale],
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

export const getProfileOptions = async (req, res, next) => {
    try {
        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const catalogQuery = (table, transTable, idCol, labelCol = 'label') => `
            SELECT item.id, item.code, COALESCE(t_req.${labelCol}, t_es.${labelCol}) AS ${labelCol}
            FROM ${table} item
            JOIN supported_languages fallback_language ON fallback_language.code = 'es'
            LEFT JOIN supported_languages requested_language ON requested_language.code = $1
            LEFT JOIN ${transTable} t_req ON t_req.${idCol} = item.id AND t_req.language_id = requested_language.id
            LEFT JOIN ${transTable} t_es ON t_es.${idCol} = item.id AND t_es.language_id = fallback_language.id
            ORDER BY item.created_at ASC
        `;

        const [
            goals, family, religions, zodiac, political, smoking, drinking, sexual, education, languages, prompts,
        ] = await Promise.all([
            db.query(catalogQuery('relationship_goals', 'relationship_goal_translations', 'goal_id'), [locale]),
            db.query(catalogQuery('family_options', 'family_option_translations', 'option_id'), [locale]),
            db.query(catalogQuery('religions', 'religion_translations', 'religion_id'), [locale]),
            db.query(catalogQuery('zodiac_signs', 'zodiac_sign_translations', 'sign_id'), [locale]),
            db.query(catalogQuery('political_stances', 'political_stance_translations', 'stance_id'), [locale]),
            db.query(catalogQuery('smoking_habits', 'smoking_habit_translations', 'habit_id'), [locale]),
            db.query(catalogQuery('drinking_habits', 'drinking_habit_translations', 'habit_id'), [locale]),
            db.query(catalogQuery('sexual_orientations', 'sexual_orientation_translations', 'orientation_id'), [locale]),
            db.query(catalogQuery('education_levels', 'education_level_translations', 'level_id'), [locale]),
            db.query(catalogQuery('spoken_languages', 'spoken_language_translations', 'language_item_id'), [locale]),
            db.query(catalogQuery('profile_prompts', 'profile_prompt_translations', 'prompt_id', 'question'), [locale]),
        ]);

        return res.json({
            relationship_goals: goals.rows,
            family_options: family.rows,
            religions: religions.rows,
            zodiac_signs: zodiac.rows,
            political_stances: political.rows,
            smoking_habits: smoking.rows,
            drinking_habits: drinking.rows,
            sexual_orientations: sexual.rows,
            education_levels: education.rows,
            spoken_languages: languages.rows,
            prompts: prompts.rows,
        });
    } catch (error) {
        return next(error);
    }
};
