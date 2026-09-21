const FALLBACK_LANGUAGE = 'es';

export function localizedResidenceJoins(userAlias, localePosition) {
    return `
        LEFT JOIN countries residence_country ON residence_country.id = ${userAlias}.residence_country_id
        LEFT JOIN regions residence_region ON residence_region.id = ${userAlias}.residence_region_id
        LEFT JOIN cities residence_city ON residence_city.id = ${userAlias}.residence_city_id
        LEFT JOIN supported_languages residence_fallback_language ON residence_fallback_language.code = '${FALLBACK_LANGUAGE}'
        LEFT JOIN supported_languages residence_requested_language ON residence_requested_language.code = $${localePosition}
        LEFT JOIN country_name_translations residence_country_requested
          ON residence_country_requested.country_id = residence_country.id
         AND residence_country_requested.language_id = residence_requested_language.id
        LEFT JOIN country_name_translations residence_country_fallback
          ON residence_country_fallback.country_id = residence_country.id
         AND residence_country_fallback.language_id = residence_fallback_language.id
        LEFT JOIN region_name_translations residence_region_requested
          ON residence_region_requested.region_id = residence_region.id
         AND residence_region_requested.language_id = residence_requested_language.id
        LEFT JOIN region_name_translations residence_region_fallback
          ON residence_region_fallback.region_id = residence_region.id
         AND residence_region_fallback.language_id = residence_fallback_language.id
        LEFT JOIN city_name_translations residence_city_requested
          ON residence_city_requested.city_id = residence_city.id
         AND residence_city_requested.language_id = residence_requested_language.id
        LEFT JOIN city_name_translations residence_city_fallback
          ON residence_city_fallback.city_id = residence_city.id
         AND residence_city_fallback.language_id = residence_fallback_language.id
    `;
}

export function localizedResidenceColumns(userAlias) {
    return `
        ${userAlias}.residence_country_id,
        ${userAlias}.residence_region_id,
        ${userAlias}.residence_city_id,
        COALESCE(residence_city_requested.name, residence_city_fallback.name) AS residence_city,
        COALESCE(residence_region_requested.name, residence_region_fallback.name) AS residence_region,
        COALESCE(residence_country_requested.name, residence_country_fallback.name) AS residence_country,
        residence_country.iso_code AS residence_country_code
    `;
}
