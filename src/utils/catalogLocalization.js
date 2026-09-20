const FALLBACK_LANGUAGE = 'es';

export function resolveCatalogLanguage(header) {
    const candidates = String(header ?? '')
        .split(',')
        .map(value => value.trim().split(';')[0].toLowerCase())
        .flatMap(value => [value, value.split('-')[0]])
        .filter(Boolean);
    return candidates.find(value => ['es', 'en'].includes(value)) ?? FALLBACK_LANGUAGE;
}

export function resolvePublicMediaUrl(value, req) {
    if (!value || /^https?:\/\//i.test(value)) return value ?? null;
    const origin = process.env.PUBLIC_ORIGIN ?? `${req.protocol}://${req.get('host')}`;
    return new URL(value.startsWith('/') ? value : `/${value}`, origin).toString();
}

export function localizedCatalogSql(kind, localePosition) {
    const singular = kind === 'anime' ? 'anime' : 'game';
    const table = kind === 'anime' ? 'animes' : 'games';
    return `
        SELECT item.id, item.catalog_key,
               COALESCE(requested_name.name, fallback_name.name) AS name,
               COALESCE(requested_biography.biography, fallback_biography.biography, '') AS biography,
               item.image_path
        FROM ${table} item
        JOIN supported_languages fallback_language ON fallback_language.code = 'es'
        LEFT JOIN supported_languages requested_language ON requested_language.code = $${localePosition}
        LEFT JOIN ${singular}_name_translations requested_name
          ON requested_name.${singular}_id = item.id AND requested_name.language_id = requested_language.id
        LEFT JOIN ${singular}_name_translations fallback_name
          ON fallback_name.${singular}_id = item.id AND fallback_name.language_id = fallback_language.id
        LEFT JOIN ${singular}_biography_translations requested_biography
          ON requested_biography.${singular}_id = item.id AND requested_biography.language_id = requested_language.id
        LEFT JOIN ${singular}_biography_translations fallback_biography
          ON fallback_biography.${singular}_id = item.id AND fallback_biography.language_id = fallback_language.id
    `;
}

export function localizedInterestSql(kind, filterSql, localePosition, includeUserId = false) {
    const singular = kind === 'anime' ? 'anime' : 'game';
    const table = kind === 'anime' ? 'animes' : 'games';
    const interests = kind === 'anime' ? 'user_anime_interests' : 'user_game_interests';
    return `
        SELECT ${includeUserId ? 'i.user_id, ' : ''}item.id, item.catalog_key,
               COALESCE(requested_name.name, fallback_name.name) AS name,
               COALESCE(requested_biography.biography, fallback_biography.biography, '') AS biography,
               item.image_path
        FROM ${interests} i
        JOIN ${table} item ON item.id = i.${singular}_id
        JOIN supported_languages fallback_language ON fallback_language.code = 'es'
        LEFT JOIN supported_languages requested_language ON requested_language.code = $${localePosition}
        LEFT JOIN ${singular}_name_translations requested_name ON requested_name.${singular}_id = item.id AND requested_name.language_id = requested_language.id
        LEFT JOIN ${singular}_name_translations fallback_name ON fallback_name.${singular}_id = item.id AND fallback_name.language_id = fallback_language.id
        LEFT JOIN ${singular}_biography_translations requested_biography ON requested_biography.${singular}_id = item.id AND requested_biography.language_id = requested_language.id
        LEFT JOIN ${singular}_biography_translations fallback_biography ON fallback_biography.${singular}_id = item.id AND fallback_biography.language_id = fallback_language.id
        WHERE ${filterSql}
    `;
}

export function toLocalizedCatalogItem(row, req) {
    return {
        id: row.id,
        catalog_key: row.catalog_key,
        name: row.name,
        biography: row.biography,
        image_url: resolvePublicMediaUrl(row.image_path, req),
    };
}
