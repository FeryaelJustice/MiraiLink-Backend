import db from '../models/db.js';

export const checkAndroidAppVersion = async (req, res, next) => {
    try {
        const { rows } = await db.query('SELECT * FROM app_versions WHERE platform = $1 ORDER BY updated_at DESC', ['android']);
        if (rows.length === 0) return res.status(404).json({ message: 'Not configured' });

        const v = rows[0];
        res.set('Cache-Control', 'public, max-age=300'); // 5 min
        return res.json({
            platform: 'android',
            minVersionCode: v.min_supported_version_code,
            latestVersionCode: v.latest_version_code,
            message: v.message,
            playStoreUrl: v.play_store_url
        });
    } catch (e) { next(e); }
};
