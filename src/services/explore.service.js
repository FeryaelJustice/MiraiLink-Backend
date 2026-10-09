import db from '../models/db.js';
import { PUBLIC_USER_SQL_COLUMNS, toPublicUsers } from '../dto/user.dto.js';
import { AppError } from '../errors/AppError.js';
import { candidateCoordinateSql, resolveUserCoordinates } from '../utils/geoSearch.js';
import { localizedResidenceColumns, localizedResidenceJoins } from '../utils/geographyLocalization.js';
import { localizedInterestSql, toLocalizedCatalogItem } from '../utils/catalogLocalization.js';
import { localizedAttributeColumns, localizedAttributeJoins } from '../controllers/user.controller.js';
import { SUBSCRIPTION_FEATURES, SUBSCRIPTION_PRODUCTS } from '../consts/subscriptionConsts.js';

// Cache de conteos agregados por usuario y categoria con TTL de 5 minutos
const COUNT_CACHE_TTL_MS = 5 * 60 * 1000;
const countsCache = new Map();

export function clearCountCache() {
    countsCache.clear();
}

export function invalidateUserCountCache(userId) {
    for (const key of countsCache.keys()) {
        if (key.startsWith(`${userId}:`)) {
            countsCache.delete(key);
        }
    }
}

function getCachedCount(userId, categoryId, radiusKm, gender = 'default', mode = 'classic') {
    const key = `${userId}:${categoryId}:${radiusKm}:${gender}:${mode}`;
    const entry = countsCache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
        return entry.count;
    }
    return null;
}

function setCachedCount(userId, categoryId, radiusKm, gender = 'default', count, mode = 'classic') {
    const key = `${userId}:${categoryId}:${radiusKm}:${gender}:${mode}`;
    countsCache.set(key, { count, expiresAt: Date.now() + COUNT_CACHE_TTL_MS });
}

/**
 * Construye filtros desde categorías internas y adapta códigos de metas.
 * Anime/game comprueban existencia de intereses; no filtran por cada subgénero de filter_value.
 */
function buildCategoryFilterSql(filterType, filterValue) {
    switch (filterType) {
        case 'anime':
            return `EXISTS (SELECT 1 FROM user_anime_interests uai WHERE uai.user_id = u.id)`;
        case 'game':
            return `EXISTS (SELECT 1 FROM user_game_interests ugi WHERE ugi.user_id = u.id)`;
        case 'relationship_goal':
            if (filterValue) {
                // Mapeo flexible para sincronizar codigos de categorias con codigos de la tabla relationship_goals
                const goalCode = filterValue === 'long_term' ? 'relationship'
                    : filterValue === 'friendship' ? 'friends'
                    : filterValue;
                return `EXISTS (
                    SELECT 1 FROM user_relationship_goals urg
                    JOIN relationship_goals rg ON rg.id = urg.goal_id
                    WHERE urg.user_id = u.id AND (rg.code = '${goalCode.replace(/'/g, "''")}' OR rg.code = '${filterValue.replace(/'/g, "''")}')
                )`;
            }
            return `EXISTS (SELECT 1 FROM user_relationship_goals urg WHERE urg.user_id = u.id)`;
        default:
            return 'TRUE';
    }
}

export async function getExploreSectionsWithCategories(userId, locale = 'es') {
    // 1. Obtener datos de ubicacion y preferencias del usuario actual
    const userResult = await db.query(
        `SELECT u.id, u.gender, u.residence_latitude, u.residence_longitude,
                u.current_latitude, u.current_longitude, u.last_location_updated_at,
                p.search_radius_km, p.search_scope, p.search_match_live_location, p.search_gender, p.discovery_mode,
                us.product_id AS subscription_product_id, us.status AS subscription_status, us.expires_at AS subscription_expires_at
         FROM users u
         LEFT JOIN user_search_preferences p ON p.user_id = u.id
         LEFT JOIN user_subscriptions us ON us.user_id = u.id AND us.provider_verified = TRUE AND us.status = 'active'
         WHERE u.id = $1`,
        [userId],
    );
    const currentUser = userResult.rows[0];
    const defaultRadius = currentUser?.search_radius_km ?? 40;
    const useActiveLocation = currentUser?.search_scope === 'radius_active'
        || (currentUser?.search_scope === 'radius' && currentUser?.search_match_live_location);
    const origin = resolveUserCoordinates(currentUser, useActiveLocation);

    // Validar estado de suscripcion Plus o Premium
    const isNotExpired = !currentUser?.subscription_expires_at || new Date(currentUser.subscription_expires_at) > new Date();
    const isActive = currentUser?.subscription_status === 'active' && isNotExpired;
    const isPlus = isActive && (currentUser?.subscription_product_id === SUBSCRIPTION_PRODUCTS.PLUS || currentUser?.subscription_product_id === SUBSCRIPTION_PRODUCTS.PREMIUM);

    const userGender = currentUser?.gender;
    const defaultGender = userGender === 'male' ? 'female' : (userGender === 'female' ? 'male' : 'all');

    // 2. Obtener todas las categorias con traducciones para el locale y preferencias guardadas
    const categoriesResult = await db.query(
        `SELECT c.id, c.code, c.section_group, c.icon_key, c.filter_type, c.filter_value, c.sort_order,
                COALESCE(t_req.title, t_es.title, c.code) AS title,
                COALESCE(t_req.description, t_es.description, '') AS description,
                COALESCE(ucp.radius_km, $3) AS user_radius_km,
                ucp.target_gender AS user_target_gender
         FROM explore_categories c
         JOIN supported_languages fallback_lang ON fallback_lang.code = 'es'
         LEFT JOIN supported_languages req_lang ON req_lang.code = $2
         LEFT JOIN explore_category_translations t_req ON t_req.category_id = c.id AND t_req.language_id = req_lang.id
         LEFT JOIN explore_category_translations t_es ON t_es.category_id = c.id AND t_es.language_id = fallback_lang.id
         LEFT JOIN user_category_preferences ucp ON ucp.category_id = c.id AND ucp.user_id = $1
         ORDER BY c.sort_order ASC, c.code ASC`,
        [userId, locale, defaultRadius],
    );

    const categories = categoriesResult.rows;

    // 3. Calcular o recuperar conteo de personas para cada categoria
    for (const cat of categories) {
        const radius = Number(cat.user_radius_km);
        const effectiveGender = isPlus
            ? (cat.user_target_gender ?? currentUser?.search_gender ?? defaultGender)
            : defaultGender;

        cat.user_effective_gender = effectiveGender;
        const cached = getCachedCount(userId, cat.id, radius, effectiveGender, currentUser?.discovery_mode ?? 'classic');
        if (cached !== null) {
            cat.active_count = cached;
            continue;
        }

        try {
            const categoryFilter = buildCategoryFilterSql(cat.filter_type, cat.filter_value);
            const candidateCoords = candidateCoordinateSql(useActiveLocation);

            let distanceFilter = 'TRUE';
            const countParams = [userId, effectiveGender];

            if (origin) {
                countParams.push(origin.latitude, origin.longitude, radius);
                const latParam = `$${countParams.length - 2}`;
                const lngParam = `$${countParams.length - 1}`;
                const radParam = `$${countParams.length}`;

                const distExpr = `(6371 * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(${latParam})) * cos(radians(${candidateCoords.latitude}))
                        * cos(radians(${candidateCoords.longitude}) - radians(${lngParam}))
                        + sin(radians(${latParam})) * sin(radians(${candidateCoords.latitude}))
                    ))
                ))`;
                distanceFilter = `(${candidateCoords.latitude} IS NOT NULL AND ${distExpr} <= ${radParam})`;
            }

            const countQuery = `
                SELECT COUNT(*)::int AS total
                FROM users u
                WHERE u.id != $1 AND u.is_deleted = FALSE
                  AND ${categoryFilter}
                  AND (
                      $2 = 'all' OR
                      ($2 = 'female' AND u.gender = 'female') OR
                      ($2 = 'male' AND u.gender = 'male')
                  )
                  AND ${distanceFilter}
                  AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.user_id=$1 AND b.target_id=u.id) OR (b.user_id=u.id AND b.target_id=$1))
                  AND NOT EXISTS(SELECT 1 FROM matches m WHERE m.user1_id=LEAST($1::uuid,u.id) AND m.user2_id=GREATEST($1::uuid,u.id))
                  AND NOT EXISTS(SELECT 1 FROM likes l WHERE l.from_user_id=u.id AND l.to_user_id=$1 AND l.origin='discovery')
                  AND u.id NOT IN (
                      SELECT to_user_id FROM likes WHERE from_user_id = $1 AND origin = 'discovery'
                      UNION SELECT to_user_id FROM dislikes WHERE from_user_id = $1
                  )
            `;

            const countRes = await db.query(countQuery, countParams);
            const total = countRes.rows[0]?.total ?? 0;
            setCachedCount(userId, cat.id, radius, effectiveGender, total, currentUser?.discovery_mode ?? 'classic');
            cat.active_count = total;
        } catch {
            // Fallback ante entornos de test o geometrias incompletas
            cat.active_count = 0;
        }
    }

    // 4. Agrupar por section_group y preparar recomendaciones
    const sectionNames = {
        otaku: locale === 'ja' ? 'アニメ＆マンガ' : locale === 'en' ? 'Anime & Manga' : 'Otaku & Anime',
        gaming: locale === 'ja' ? 'ゲーム＆eスポーツ' : locale === 'en' ? 'Gaming & Esports' : 'Videojuegos & Gaming',
        connections: locale === 'ja' ? '出会い＆目的' : locale === 'en' ? 'Dating & Goals' : 'Conexiones & Metas',
    };

    const grouped = {};
    for (const cat of categories) {
        if (!grouped[cat.section_group]) {
            grouped[cat.section_group] = [];
        }
        grouped[cat.section_group].push({
            id: cat.id,
            code: cat.code,
            sectionGroup: cat.section_group,
            iconKey: cat.icon_key,
            title: cat.title,
            description: cat.description,
            activeCount: cat.active_count,
            radiusKm: Number(cat.user_radius_km),
        });
    }

    const sections = Object.entries(grouped).map(([group, catList]) => ({
        group,
        title: sectionNames[group] ?? group,
        categories: catList,
    }));

    // Seleccion destacada de recomendaciones para el carrusel superior (ej. primeras 3 con mas afinidad)
    const recommendations = categories.slice(0, 4).map(cat => ({
        id: cat.id,
        code: cat.code,
        sectionGroup: cat.section_group,
        iconKey: cat.icon_key,
        title: cat.title,
        description: cat.description,
        activeCount: cat.active_count,
        radiusKm: Number(cat.user_radius_km),
    }));

    return {
        recommendations,
        sections,
    };
}

export async function getCategoryFeedUsers(userId, categoryId, { limit = 20, offset = 0, radiusKmOverride, genderOverride, locale = 'es', req } = {}) {
    // 1. Verificar categoria
    const catResult = await db.query(
        `SELECT c.id, c.code, c.section_group, c.icon_key, c.filter_type, c.filter_value,
                COALESCE(t_req.title, t_es.title, c.code) AS title
         FROM explore_categories c
         JOIN supported_languages fallback_lang ON fallback_lang.code = 'es'
         LEFT JOIN supported_languages req_lang ON req_lang.code = $2
         LEFT JOIN explore_category_translations t_req ON t_req.category_id = c.id AND t_req.language_id = req_lang.id
         LEFT JOIN explore_category_translations t_es ON t_es.category_id = c.id AND t_es.language_id = fallback_lang.id
         WHERE c.id = $1`,
        [categoryId, locale],
    );

    if (catResult.rowCount === 0) {
        throw new AppError({ status: 404, code: 'CATEGORY_NOT_FOUND', message: 'Explore category not found' });
    }
    const category = catResult.rows[0];

    // 2. Obtener radio y genero guardados de esta categoria para el usuario
    const prefResult = await db.query(
        'SELECT radius_km, target_gender FROM user_category_preferences WHERE user_id = $1 AND category_id = $2',
        [userId, categoryId],
    );
    const radiusKm = radiusKmOverride ?? prefResult.rows[0]?.radius_km ?? 40;

    // 3. Resolver coordenadas del usuario y suscripcion
    const userResult = await db.query(
        `SELECT u.id, u.gender, u.residence_country_id, u.residence_latitude, u.residence_longitude,
                u.current_latitude, u.current_longitude, u.last_location_updated_at,
                p.search_scope, p.search_match_live_location, p.search_gender,
                s.product_id AS subscription_product_id, s.status AS subscription_status, s.expires_at AS subscription_expires_at
         FROM users u
         LEFT JOIN user_search_preferences p ON p.user_id = u.id
         LEFT JOIN user_subscriptions s ON s.user_id = u.id AND s.provider_verified = TRUE
         WHERE u.id = $1`,
        [userId],
    );
    const currentUser = userResult.rows[0];

    const isNotExpired = !currentUser?.subscription_expires_at || new Date(currentUser.subscription_expires_at) > new Date();
    const isActive = currentUser?.subscription_status === 'active' && isNotExpired;
    const isPlus = isActive && (currentUser?.subscription_product_id === SUBSCRIPTION_PRODUCTS.PLUS || currentUser?.subscription_product_id === SUBSCRIPTION_PRODUCTS.PREMIUM);

    const categoryTargetGender = genderOverride ?? prefResult.rows[0]?.target_gender ?? currentUser?.search_gender;
    const effectiveGender = (isPlus && (categoryTargetGender === 'male' || categoryTargetGender === 'female'))
        ? categoryTargetGender
        : 'all';

    const useActiveLocation = currentUser?.search_scope === 'radius_active'
        || (currentUser?.search_scope === 'radius' && currentUser?.search_match_live_location);
    const origin = resolveUserCoordinates(currentUser, useActiveLocation);
    const candidateCoords = candidateCoordinateSql(useActiveLocation);

    const categoryFilter = buildCategoryFilterSql(category.filter_type, category.filter_value);
    const params = [userId, limit, offset];

    let distanceSql = 'NULL::numeric';
    let distanceFilter = 'TRUE';
    if (origin) {
        params.push(origin.latitude, origin.longitude, radiusKm);
        const originLatParam = `$${params.length - 2}`;
        const originLngParam = `$${params.length - 1}`;
        const radiusParam = `$${params.length}`;

        distanceSql = `ROUND((6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
                cos(radians(${originLatParam})) * cos(radians(candidate_latitude))
                * cos(radians(candidate_longitude) - radians(${originLngParam}))
                + sin(radians(${originLatParam})) * sin(radians(candidate_latitude))
            ))
        ))::numeric, 1)`;

        distanceFilter = `(distance_km IS NOT NULL AND distance_km <= ${radiusParam})`;
    }

    params.push(locale);
    const localePos = params.length;

    let genderFilterSql = 'TRUE';
    if (effectiveGender === 'female' || effectiveGender === 'male') {
        params.push(effectiveGender);
        genderFilterSql = `u.gender = $${params.length}`;
    }

    const queryText = `
        WITH candidate_geo AS (
            SELECT ${PUBLIC_USER_SQL_COLUMNS},
                   u.created_at,
                   u.profession, u.religion_id, u.zodiac_sign_id, u.political_stance_id,
                   u.smoking_habit_id, u.drinking_habit_id, u.sexual_orientation_id, u.education_level_id,
                   ${candidateCoords.latitude} AS candidate_latitude,
                   ${candidateCoords.longitude} AS candidate_longitude,
                   COALESCE((
                       SELECT COUNT(*) FROM user_anime_interests ai
                       WHERE ai.user_id = u.id AND ai.anime_id IN (
                           SELECT anime_id FROM user_anime_interests WHERE user_id = $1
                       )
                   ), 0) +
                   COALESCE((
                       SELECT COUNT(*) FROM user_game_interests gi
                       WHERE gi.user_id = u.id AND gi.game_id IN (
                           SELECT game_id FROM user_game_interests WHERE user_id = $1
                       )
                   ), 0) AS common_interests
            FROM users u
            WHERE u.id != $1 AND u.is_deleted = FALSE

              AND ${categoryFilter}
              AND ${genderFilterSql}
              AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.user_id=$1 AND b.target_id=u.id) OR (b.user_id=u.id AND b.target_id=$1))
              AND NOT EXISTS(SELECT 1 FROM matches m WHERE m.user1_id=LEAST($1::uuid,u.id) AND m.user2_id=GREATEST($1::uuid,u.id))
              AND NOT EXISTS(SELECT 1 FROM likes l WHERE l.from_user_id=u.id AND l.to_user_id=$1 AND l.origin='discovery')
              AND u.id NOT IN (
                  SELECT to_user_id FROM likes WHERE from_user_id = $1 AND origin = 'discovery'
                  UNION SELECT to_user_id FROM dislikes WHERE from_user_id = $1
              )
        ), scored_candidates AS (
            SELECT *, ${distanceSql} AS distance_km
            FROM candidate_geo
        )
        SELECT ranked_candidates.id, ranked_candidates.username, ranked_candidates.nickname, ranked_candidates.bio,
               ranked_candidates.gender, ranked_candidates.birthdate,
               ${localizedResidenceColumns('ranked_candidates')},
               ${localizedAttributeColumns('ranked_candidates')},
               ranked_candidates.distance_km, FALSE AS is_traveler,
               ranked_candidates.common_interests, ranked_candidates.created_at
        FROM scored_candidates ranked_candidates
        ${localizedResidenceJoins('ranked_candidates', localePos)}
        ${localizedAttributeJoins('ranked_candidates', localePos)}
        WHERE ${distanceFilter}
        ORDER BY
            (common_interests * 15.0 +
             CASE WHEN distance_km IS NOT NULL THEN 40.0 / (1.0 + distance_km / 10.0) ELSE 10.0 END +
             random() * 10.0) DESC,
            created_at DESC
        LIMIT $2 OFFSET $3`;

    const usersResult = await db.query(queryText, params);
    const users = toPublicUsers(usersResult.rows);
    const userIds = users.map(u => u.id);

    if (userIds.length === 0) {
        return [];
    }

    const [photos, animes, games, goals, family, languages, prompts] = await Promise.all([
        db.query('SELECT id, user_id, url, position FROM user_photos WHERE user_id = ANY($1::uuid[]) ORDER BY position', [userIds]),
        db.query(localizedInterestSql('anime', 'i.user_id = ANY($1::uuid[])', 2, true), [userIds, locale]),
        db.query(localizedInterestSql('game', 'i.user_id = ANY($1::uuid[])', 2, true), [userIds, locale]),
        db.query(`
            SELECT urg.user_id, g.id, g.code, COALESCE(t_req.label, t_es.label) AS label
            FROM user_relationship_goals urg
            JOIN relationship_goals g ON g.id = urg.goal_id
            JOIN supported_languages fallback_language ON fallback_language.code = 'es'
            LEFT JOIN supported_languages requested_language ON requested_language.code = $2
            LEFT JOIN relationship_goal_translations t_req ON t_req.goal_id = g.id AND t_req.language_id = requested_language.id
            LEFT JOIN relationship_goal_translations t_es ON t_es.goal_id = g.id AND t_es.language_id = fallback_language.id
            WHERE urg.user_id = ANY($1::uuid[])
        `, [userIds, locale]),
        db.query(`
            SELECT ufo.user_id, f.id, f.code, COALESCE(t_req.label, t_es.label) AS label
            FROM user_family_options ufo
            JOIN family_options f ON f.id = ufo.option_id
            JOIN supported_languages fallback_language ON fallback_language.code = 'es'
            LEFT JOIN supported_languages requested_language ON requested_language.code = $2
            LEFT JOIN family_option_translations t_req ON t_req.option_id = f.id AND t_req.language_id = requested_language.id
            LEFT JOIN family_option_translations t_es ON t_es.option_id = f.id AND t_es.language_id = fallback_language.id
            WHERE ufo.user_id = ANY($1::uuid[])
        `, [userIds, locale]),
        db.query(`
            SELECT usl.user_id, sl.id, sl.code, COALESCE(t_req.label, t_es.label) AS label
            FROM user_spoken_languages usl
            JOIN spoken_languages sl ON sl.id = usl.language_id
            JOIN supported_languages fallback_language ON fallback_language.code = 'es'
            LEFT JOIN supported_languages requested_language ON requested_language.code = $2
            LEFT JOIN spoken_language_translations t_req ON t_req.language_item_id = sl.id AND t_req.language_id = requested_language.id
            LEFT JOIN spoken_language_translations t_es ON t_es.language_item_id = sl.id AND t_es.language_id = fallback_language.id
            WHERE usl.user_id = ANY($1::uuid[])
        `, [userIds, locale]),
        db.query(`
            SELECT upp.user_id, upp.id, upp.prompt_id, upp.answer, p.code, COALESCE(t_req.question, t_es.question) AS question
            FROM user_profile_prompts upp
            JOIN profile_prompts p ON p.id = upp.prompt_id
            JOIN supported_languages fallback_language ON fallback_language.code = 'es'
            LEFT JOIN supported_languages requested_language ON requested_language.code = $2
            LEFT JOIN profile_prompt_translations t_req ON t_req.prompt_id = p.id AND t_req.language_id = requested_language.id
            LEFT JOIN profile_prompt_translations t_es ON t_es.prompt_id = p.id AND t_es.language_id = fallback_language.id
            WHERE upp.user_id = ANY($1::uuid[])
            ORDER BY upp.created_at ASC
        `, [userIds, locale]),
    ]);

    const group = rows => Object.groupBy(rows, row => row.user_id);
    const photoMap = group(photos.rows);
    const animeMap = group(animes.rows);
    const gameMap = group(games.rows);
    const goalMap = group(goals.rows);
    const familyMap = group(family.rows);
    const languageMap = group(languages.rows);
    const promptMap = group(prompts.rows);

    return users.map(user => ({
        ...user,
        photos: photoMap[user.id] ?? [],
        animes: (animeMap[user.id] ?? []).map(row => toLocalizedCatalogItem(row, req)),
        games: (gameMap[user.id] ?? []).map(row => toLocalizedCatalogItem(row, req)),
        relationship_goals: goalMap[user.id] ?? [],
        family_options: familyMap[user.id] ?? [],
        spoken_languages: languageMap[user.id] ?? [],
        prompts: promptMap[user.id] ?? [],
    }));
}

export async function getCategorySettings(userId, categoryId) {
    const checkCat = await db.query('SELECT id, code FROM explore_categories WHERE id = $1', [categoryId]);
    if (checkCat.rowCount === 0) {
        throw new AppError({ status: 404, code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });
    }

    const prefResult = await db.query(
        'SELECT radius_km, target_gender FROM user_category_preferences WHERE user_id = $1 AND category_id = $2',
        [userId, categoryId],
    );

    const result = {
        categoryId,
        radius_km: prefResult.rows[0]?.radius_km ?? 40,
    };
    if (prefResult.rows[0]?.target_gender !== undefined) {
        result.target_gender = prefResult.rows[0].target_gender;
    }
    return result;
}

/**
 * Valida categoría/radio/genero/plan y hace upsert de preferencia usuario-categoría.
 * El radio y genero de categoría no son la preferencia global; la caché se mantiene en memoria de proceso.
 */
export async function updateCategorySettings(userId, categoryId, settingsOrRadius, targetGenderParam) {
    const checkCat = await db.query('SELECT id, code FROM explore_categories WHERE id = $1', [categoryId]);
    if (checkCat.rowCount === 0) {
        throw new AppError({ status: 404, code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });
    }

    const radiusKm = typeof settingsOrRadius === 'object' && settingsOrRadius !== null
        ? settingsOrRadius.radius_km
        : settingsOrRadius;
    const targetGender = typeof settingsOrRadius === 'object' && settingsOrRadius !== null
        ? settingsOrRadius.target_gender
        : targetGenderParam;

    if ((radiusKm !== undefined && Number(radiusKm) > SUBSCRIPTION_FEATURES.FREE_MAX_RADIUS_KM) || (targetGender !== undefined && targetGender !== null)) {
        const subResult = await db.query(
            `SELECT product_id, status, expires_at
             FROM user_subscriptions
             WHERE user_id = $1 AND provider_verified = TRUE
             LIMIT 1`,
            [userId],
        );
        const sub = subResult?.rows?.[0];
        const isNotExpired = !sub?.expires_at || new Date(sub.expires_at) > new Date();
        const isActive = sub?.status === 'active' && isNotExpired;
        const isPlusOrPremium = isActive && (sub?.product_id === SUBSCRIPTION_PRODUCTS.PLUS || sub?.product_id === SUBSCRIPTION_PRODUCTS.PREMIUM);

        if (radiusKm !== undefined && Number(radiusKm) > SUBSCRIPTION_FEATURES.FREE_MAX_RADIUS_KM && !isPlusOrPremium) {
            throw new AppError({
                status: 403,
                code: 'PREMIUM_RADIUS_REQUIRED',
                message: `Un radio superior a ${SUBSCRIPTION_FEATURES.FREE_MAX_RADIUS_KM} km requiere suscripción MiraiLink Plus o Premium.`,
            });
        }

        if (targetGender !== undefined && targetGender !== null && targetGender !== 'all' && !isPlusOrPremium) {
            throw new AppError({
                status: 403,
                code: 'PREMIUM_GENDER_FILTER_REQUIRED',
                message: 'Filtrar específicamente por hombres o mujeres requiere suscripción MiraiLink Plus o Premium.',
            });
        }
    }

    if (targetGender === undefined) {
        await db.query(
            `INSERT INTO user_category_preferences (user_id, category_id, radius_km, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (user_id, category_id)
             DO UPDATE SET radius_km = EXCLUDED.radius_km, updated_at = NOW()`,
            [userId, categoryId, Number(radiusKm)],
        );
    } else {
        await db.query(
            `INSERT INTO user_category_preferences (user_id, category_id, radius_km, target_gender, updated_at)
             VALUES ($1, $2, COALESCE($3, 40), $4, NOW())
             ON CONFLICT (user_id, category_id)
             DO UPDATE SET
                radius_km = COALESCE(EXCLUDED.radius_km, user_category_preferences.radius_km),
                target_gender = EXCLUDED.target_gender,
                updated_at = NOW()`,
            [userId, categoryId, radiusKm !== undefined ? Number(radiusKm) : null, targetGender],
        );
    }

    // Invalidar cache de conteo para este usuario
    invalidateUserCountCache(userId);

    const result = {
        categoryId,
        radius_km: radiusKm !== undefined ? Number(radiusKm) : 40,
    };
    if (targetGender !== undefined) {
        result.target_gender = targetGender;
    }
    return result;
}
