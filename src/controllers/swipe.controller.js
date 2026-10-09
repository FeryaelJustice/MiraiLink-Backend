import db from '../models/db.js';
import { ensureContact,pairLock } from '../services/affinity-service.js';
import { capsuleTransaction, createMatchCapsule, cancelMatchCapsule, requireCapsulesEnabled } from '../services/capsule-service.js';
import { likeWithMode, verifySwipeMode } from '../services/capsule-matching.js';
import { PUBLIC_USER_SQL_COLUMNS, toPublicUser, toPublicUsers } from '../dto/user.dto.js';
import { AppError } from '../errors/AppError.js';
import { localizedInterestSql, resolveCatalogLanguage, toLocalizedCatalogItem } from '../utils/catalogLocalization.js';
import { candidateCoordinateSql, resolveUserCoordinates } from '../utils/geoSearch.js';
import { localizedResidenceColumns, localizedResidenceJoins } from '../utils/geographyLocalization.js';
import { localizedAttributeColumns, localizedAttributeJoins, profileExtras } from './user.controller.js';
import { invalidateUserCountCache } from '../services/explore.service.js';
import { FREE_DAILY_LIKES_LIMIT, SUBSCRIPTION_PRODUCTS, UNDO_DAILY_LIMITS } from '../consts/subscriptionConsts.js';

async function targetExists(userId) {
    const result = await db.query(
        'SELECT 1 FROM users WHERE id = $1 AND is_deleted = FALSE LIMIT 1',
        [userId],
    );
    return result.rowCount > 0;
}

export const getFeed = async (req, res, next) => {
    try {
        const { limit = 10, offset = 0 } = req.query;

        const currentUserResult = await db.query(
            `SELECT u.gender, u.residence_country_id, u.residence_latitude, u.residence_longitude,
                    u.current_latitude, u.current_longitude, u.last_location_updated_at,
                    p.search_radius_km, p.search_scope, p.search_target_country_id, p.search_match_live_location,
                    p.search_gender, p.discovery_mode,
                    s.product_id AS subscription_product_id, s.status AS subscription_status, s.expires_at AS subscription_expires_at
             FROM users u
             LEFT JOIN user_search_preferences p ON p.user_id = u.id
             LEFT JOIN user_subscriptions s ON s.user_id = u.id AND s.provider_verified = TRUE
             WHERE u.id = $1`,
            [req.user.id],
        );
        const currentUser = currentUserResult.rows[0];

        const isNotExpired = !currentUser?.subscription_expires_at || new Date(currentUser.subscription_expires_at) > new Date();
        const isActive = currentUser?.subscription_status === 'active' && isNotExpired;
        const isPlus = isActive && (currentUser?.subscription_product_id === SUBSCRIPTION_PRODUCTS.PLUS || currentUser?.subscription_product_id === SUBSCRIPTION_PRODUCTS.PREMIUM);

        const requestedGender = req.query.gender ?? currentUser?.search_gender;
        const effectiveGender = (isPlus && (requestedGender === 'male' || requestedGender === 'female'))
            ? requestedGender
            : 'all';

        const storedScope = currentUser?.search_scope ?? 'radius';
        const scope = req.query.scope ?? storedScope;
        const radiusKm = req.query.radius_km !== undefined
            ? Number(req.query.radius_km)
            : (currentUser?.search_radius_km ?? 40);
        const legacyMatchLiveLocation = currentUser?.search_match_live_location ?? false;
        const normalizedScope = scope === 'radius'
            ? (legacyMatchLiveLocation ? 'radius_active' : 'radius_residence')
            : scope;
        const useActiveLocation = normalizedScope === 'radius_active';
        const targetCountryId = req.query.target_country_id ?? currentUser?.search_target_country_id;
        const params = [req.user.id, limit, offset];
        const origin = resolveUserCoordinates(currentUser, useActiveLocation);
        const candidateCoordinates = candidateCoordinateSql(useActiveLocation);

        let distanceSql = 'NULL::numeric';
        if (origin) {
            params.push(origin.latitude, origin.longitude);
            const originLatParam = `$${params.length - 1}`;
            const originLngParam = `$${params.length}`;
            distanceSql = `ROUND((6371 * acos(
                LEAST(1.0, GREATEST(-1.0,
                    cos(radians(${originLatParam})) * cos(radians(candidate_latitude))
                    * cos(radians(candidate_longitude) - radians(${originLngParam}))
                    + sin(radians(${originLatParam})) * sin(radians(candidate_latitude))
                ))
            ))::numeric, 1)`;
        }

        let scopeFilter = 'TRUE';
        let geographyKnownSql = 'TRUE';
        if (normalizedScope === 'radius_residence' || normalizedScope === 'radius_active') {
            if (!origin) {
                throw new AppError({
                    status: 422,
                    code: 'LOCATION_REQUIRED',
                    message: useActiveLocation
                        ? 'A fresh active location is required for active radius search'
                        : 'A residence location is required for residence radius search',
                });
            }
            params.push(radiusKm);
            scopeFilter = `(distance_km IS NULL OR distance_km <= $${params.length})`;
            geographyKnownSql = 'distance_km IS NOT NULL';
        } else if (normalizedScope === 'country') {
            if (!currentUser?.residence_country_id) {
                throw new AppError({
                    status: 422,
                    code: 'RESIDENCE_COUNTRY_REQUIRED',
                    message: 'A residence country is required for country search',
                });
            }
            params.push(currentUser.residence_country_id);
            scopeFilter = `(residence_country_id IS NULL OR residence_country_id = $${params.length})`;
            geographyKnownSql = 'residence_country_id IS NOT NULL';
        } else if (normalizedScope === 'specific_country') {
            if (!targetCountryId) {
                throw new AppError({
                    status: 422,
                    code: 'TARGET_COUNTRY_REQUIRED',
                    message: 'A target country is required for passport search',
                });
            }
            params.push(targetCountryId);
            scopeFilter = `(residence_country_id IS NULL OR residence_country_id = $${params.length})`;
            geographyKnownSql = 'residence_country_id IS NOT NULL';
        } else if (origin) {
            geographyKnownSql = 'distance_km IS NOT NULL';
        }

        // A user is a traveler only when their live position is meaningfully
        // away from their registered residence. The distance threshold avoids
        // treating normal GPS noise within the same city as travel.
        const isTravelerSql = `(
                u.current_latitude IS NOT NULL
                AND u.current_longitude IS NOT NULL
                AND u.residence_latitude IS NOT NULL
                AND u.residence_longitude IS NOT NULL
                AND u.last_location_updated_at >= NOW() - INTERVAL '24 hours'
                AND (6371 * acos(
                    LEAST(1.0, GREATEST(-1.0,
                        cos(radians(u.residence_latitude)) * cos(radians(u.current_latitude)) * cos(radians(u.current_longitude) - radians(u.residence_longitude))
                        + sin(radians(u.residence_latitude)) * sin(radians(u.current_latitude))
                    ))
                )) > 10
            )`;

        const locale = resolveCatalogLanguage(req.get('accept-language'));
        params.push(locale);
        const residenceLocalePosition = params.length;

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
                   ${candidateCoordinates.latitude} AS candidate_latitude,
                   ${candidateCoordinates.longitude} AS candidate_longitude,
                   ${isTravelerSql} AS is_traveler,
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
              AND NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.user_id=$1 AND b.target_id=u.id) OR (b.user_id=u.id AND b.target_id=$1))
              AND ${genderFilterSql}
              AND u.id NOT IN (
                  SELECT to_user_id FROM likes WHERE from_user_id = $1 AND origin = 'discovery'
                  UNION SELECT to_user_id FROM dislikes WHERE from_user_id = $1
              )
              AND NOT EXISTS (
                  SELECT 1 FROM likes incoming
                  WHERE incoming.from_user_id=u.id AND incoming.to_user_id=$1 AND incoming.origin='discovery'
              )
              AND NOT EXISTS (
                  SELECT 1 FROM matches m
                  WHERE m.user1_id = LEAST($1::uuid, u.id) AND m.user2_id = GREATEST($1::uuid, u.id)
              )
            ), scored_candidates AS (
                SELECT *, ${distanceSql} AS distance_km
                FROM candidate_geo
            ), ranked_candidates AS (
                SELECT *, ${geographyKnownSql} AS geography_known
                FROM scored_candidates
                WHERE ${scopeFilter}
            )
            SELECT ranked_candidates.id, ranked_candidates.username, ranked_candidates.nickname, ranked_candidates.bio,
                   ranked_candidates.gender, ranked_candidates.birthdate,
                   ${localizedResidenceColumns('ranked_candidates')},
                   ${localizedAttributeColumns('ranked_candidates')},
                   ranked_candidates.distance_km, ranked_candidates.is_traveler,
                   ranked_candidates.common_interests, ranked_candidates.created_at
            FROM ranked_candidates
            ${localizedResidenceJoins('ranked_candidates', residenceLocalePosition)}
            ${localizedAttributeJoins('ranked_candidates', residenceLocalePosition)}
            ORDER BY
                geography_known DESC,
                (common_interests * 15.0 +
                 CASE WHEN distance_km IS NOT NULL THEN 40.0 / (1.0 + distance_km / 10.0) ELSE 10.0 END +
                 random() * 10.0) DESC,
                created_at DESC
            LIMIT $2 OFFSET $3`;

        const usersResult = await db.query(queryText, params);
        const users = toPublicUsers(usersResult.rows);
        const userIds = users.map(user => user.id);
        if (userIds.length === 0) {
            return res.json([]);
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

        return res.json(users.map(user => ({
            ...user,
            photos: photoMap[user.id] ?? [],
            animes: (animeMap[user.id] ?? []).map(row => toLocalizedCatalogItem(row, req)),
            games: (gameMap[user.id] ?? []).map(row => toLocalizedCatalogItem(row, req)),
            relationship_goals: goalMap[user.id] ?? [],
            family_options: familyMap[user.id] ?? [],
            spoken_languages: languageMap[user.id] ?? [],
            prompts: promptMap[user.id] ?? [],
        })));
    } catch (error) {
        return next(error);
    }
};

export const likeUser = async (req, res, next) => {
    try {
        const fromUserId = req.user.id;
        const { toUserId } = req.body;
        if (fromUserId === toUserId) {
            return res.status(400).json({ code: 'SELF_ACTION', message: 'Cannot like your own profile' });
        }
        if (!await targetExists(toUserId)) {
            return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        }

        // Comprobar el estado Plus/Premium local para aplicar el límite de likes
        const subResult = await db.query(
            `SELECT product_id, status, expires_at
             FROM user_subscriptions
             WHERE user_id = $1 AND provider_verified = TRUE
             LIMIT 1`,
            [fromUserId],
        );
        const sub = subResult.rows[0];
        const isNotExpired = !sub?.expires_at || new Date(sub.expires_at) > new Date();
        const hasActiveSub = sub?.status === 'active' && isNotExpired &&
            (sub.product_id === SUBSCRIPTION_PRODUCTS.PREMIUM || sub.product_id === SUBSCRIPTION_PRODUCTS.PLUS);

        if (!hasActiveSub) {
            const countResult = await db.query(
                `SELECT COUNT(*)::int AS count
                 FROM likes
                 WHERE from_user_id = $1
                   AND created_at >= NOW() - INTERVAL '24 hours'`,
                [fromUserId],
            );
            const dailyLikesCount = countResult.rows[0]?.count ?? 0;
            if (dailyLikesCount >= FREE_DAILY_LIKES_LIMIT) {
                return res.status(403).json({
                    code: 'DAILY_LIKES_LIMIT_REACHED',
                    message: `Has alcanzado el límite diario de ${FREE_DAILY_LIKES_LIMIT} likes. Pásate a MiraiLink Plus o Premium para likes ilimitados.`,
                    limit: FREE_DAILY_LIKES_LIMIT,
                });
            }
        }

        const matched=await capsuleTransaction(async client=>{
            await pairLock(client,fromUserId,toUserId);
            await ensureContact(client,fromUserId,toUserId);
            let mode=req.body.discoveryMode ?? 'classic';
            const receivedLikeId=req.body.receivedLikeId ?? null;
            if(receivedLikeId) {
                const incoming=await client.query("SELECT discovery_mode FROM likes WHERE id=$1 AND from_user_id=$2 AND to_user_id=$3 AND origin='discovery'",[receivedLikeId,toUserId,fromUserId]);
                if(!incoming.rows.length) throw new AppError({status:404,code:'LIKE_NOT_FOUND'});
                mode=incoming.rows[0].discovery_mode ?? 'classic';
            }
            if(mode==='capsule') requireCapsulesEnabled(req);
            return likeWithMode(client,fromUserId,toUserId,mode,createMatchCapsule,receivedLikeId);
        });
        invalidateUserCountCache(fromUserId);
        return res.json({ message: 'Liked', match: matched });
    } catch (error) {
        return next(error);
    }
};

export const dislikeUser = async (req, res, next) => {
    try {
        const fromUserId = req.user.id;
        const { toUserId } = req.body;
        if (fromUserId === toUserId) {
            return res.status(400).json({ code: 'SELF_ACTION', message: 'Cannot dislike your own profile' });
        }
        if (!await targetExists(toUserId)) {
            return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
        }
        const mode=req.body.discoveryMode ?? 'classic';
        if(mode==='capsule') requireCapsulesEnabled(req);
        await capsuleTransaction(async client=>{
            await verifySwipeMode(client,fromUserId,toUserId,mode);
            await client.query('INSERT INTO dislikes (from_user_id,to_user_id,discovery_mode) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[fromUserId,toUserId,mode]);
        });
        invalidateUserCountCache(fromUserId);
        return res.json({ message: 'Disliked' });
    } catch (error) {
        return next(error);
    }
};

export const getReceivedLikes = async (req, res, next) => {
    try {
        if (!req.user.subscription?.isPremium) throw new AppError({status:403,code:'PREMIUM_REQUIRED'});
        const { limit = 20, offset = 0 } = req.query;
        const locale = resolveCatalogLanguage(req.get('accept-language'));

        const queryText = `
            SELECT l.id AS like_id, l.created_at AS liked_at, l.discovery_mode,
                   u.id, u.username, u.nickname, u.bio, u.gender,
                   TO_CHAR(u.birthdate, 'YYYY-MM-DD') AS birthdate,
                   ${localizedResidenceColumns('u')}
            FROM likes l
            JOIN users u ON u.id = l.from_user_id
            ${localizedResidenceJoins('u', 4)}
            WHERE l.to_user_id = $1
              AND l.origin = 'discovery'
              AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.user1_id=LEAST($1::uuid,l.from_user_id) AND m.user2_id=GREATEST($1::uuid,l.from_user_id))
              AND NOT EXISTS (SELECT 1 FROM user_blocks b WHERE (b.user_id=$1 AND b.target_id=l.from_user_id) OR (b.user_id=l.from_user_id AND b.target_id=$1))
              AND u.is_deleted = FALSE
              AND NOT EXISTS (
                  SELECT 1 FROM likes reciprocal
                  WHERE reciprocal.from_user_id = $1 AND reciprocal.to_user_id = l.from_user_id AND reciprocal.origin = 'discovery'
              )
              AND NOT EXISTS (
                  SELECT 1 FROM dislikes d
                  WHERE d.from_user_id = $1 AND d.to_user_id = l.from_user_id
              )
            ORDER BY l.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(queryText, [req.user.id, limit, offset, locale]);
        const userIds = result.rows.map(row => row.id);
        if (userIds.length === 0) {
            return res.json([]);
        }

        const photosResult = await db.query(
            'SELECT id, user_id, url, position FROM user_photos WHERE user_id = ANY($1::uuid[]) ORDER BY position ASC',
            [userIds],
        );
        const photoMap = Object.groupBy(photosResult.rows, p => p.user_id);

        const likes = result.rows.map(row => ({
            likeId: row.like_id,
            discoveryMode: row.discovery_mode ?? 'classic',
            likedAt: row.liked_at,
            user: {
                ...toPublicUser(row),
                photos: photoMap[row.id] ?? [],
            },
        }));

        return res.json(likes);
    } catch (error) {
        return next(error);
    }
};

/**
 * Resuelve el nivel de suscripcion activo del usuario comprobando el estado
 * y la fecha de expiracion contra la hora actual del servidor (UTC).
 *
 * @param {string} userId - UUID del usuario autenticado.
 * @returns {Promise<'free' | 'plus' | 'premium'>} Nivel de suscripcion efectivo.
 */
export async function getUserSubscriptionTier(userId) {
    const subResult = await db.query(
        `SELECT product_id, status, expires_at
         FROM user_subscriptions
         WHERE user_id = $1 AND provider_verified = TRUE
         LIMIT 1`,
        [userId],
    );
    const sub = subResult.rows[0];
    const isNotExpired = !sub?.expires_at || new Date(sub.expires_at) > new Date();
    const isActive = sub?.status === 'active' && isNotExpired;

    if (isActive && sub.product_id === SUBSCRIPTION_PRODUCTS.PREMIUM) {
        return 'premium';
    }
    if (isActive && sub.product_id === SUBSCRIPTION_PRODUCTS.PLUS) {
        return 'plus';
    }
    return 'free';
}

/**
 * Mapea el nivel de suscripcion al limite diario de deshaceres permitidos.
 * Cuotas: Free = 1, Plus = 3, Premium = 6 deshaceres por ventana de 24 horas.
 *
 * @param {'free' | 'plus' | 'premium'} tier - Nivel de suscripcion.
 * @returns {number} Limite maximo de deshaceres por ventana.
 */
function getTierUndoLimit(tier) {
    if (tier === 'premium') return UNDO_DAILY_LIMITS.PREMIUM;
    if (tier === 'plus') return UNDO_DAILY_LIMITS.PLUS;
    return UNDO_DAILY_LIMITS.FREE;
}

/**
 * Obtiene la cuota disponible de deshacer votos para el usuario autenticado.
 *
 * Calcula los deshaceres consumidos en una ventana deslizante de 24 horas
 * (`NOW() - INTERVAL '24 hours'`), determina la fecha ISO de recuperacion del proximo
 * deshacer (`resetsAt`) y comprueba si existen interacciones reversibles en `likes` o `dislikes`.
 *
 * @route GET /api/swipe/undo-quota
 */
export const getUndoQuota = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const tier = await getUserSubscriptionTier(userId);
        const maxUndos = getTierUndoLimit(tier);

        const countResult = await db.query(
            `SELECT COUNT(*)::int AS count, MIN(created_at) AS oldest_undo
             FROM user_swipe_undos
             WHERE user_id = $1
               AND created_at >= NOW() - INTERVAL '24 hours'`,
            [userId],
        );
        const usedUndos = countResult.rows[0]?.count ?? 0;
        const oldestUndo = countResult.rows[0]?.oldest_undo;
        const remainingUndos = Math.max(0, maxUndos - usedUndos);
        const resetsAt = oldestUndo
            ? new Date(new Date(oldestUndo).getTime() + 24 * 60 * 60 * 1000).toISOString()
            : null;

        const undoableCheck = await db.query(
            `SELECT 1 FROM likes WHERE from_user_id = $1 AND origin = 'discovery'
             UNION ALL
             SELECT 1 FROM dislikes WHERE from_user_id = $1
             LIMIT 1`,
            [userId],
        );
        const hasUndoableSwipe = undoableCheck.rowCount > 0;
        const canUndo = remainingUndos > 0 && hasUndoableSwipe;

        return res.json({
            tier,
            maxUndos,
            usedUndos,
            remainingUndos,
            resetsAt,
            hasUndoableSwipe,
            canUndo,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Revierte el ultimo voto de interaccion (like o dislike) del usuario autenticado.
 *
 * Flujo:
 * 1. Verifica la cuota consumida en la ventana deslizante de 24 horas; si excede el limite
 *    del plan, responde con 403 `DAILY_UNDO_LIMIT_REACHED`.
 * 2. Identifica el ultimo voto emitido (por targetUserId opcional o por orden cronologico
 *    descendente). Permite deshacer interacciones de sesiones pasadas.
 * 3. Ejecuta una transaccion atomica (BEGIN/COMMIT):
 *    - Si fue 'like', elimina el registro de `likes` y el posible `matches` bidireccional.
 *    - Si fue 'dislike', elimina el registro de `dislikes`.
 *    - Inserta un registro de auditoria en `user_swipe_undos`.
 * 4. Invalida la cache de conteos del usuario y reconstruye el perfil publico completo
 *    (con fotos, idiomas, preguntas, objetivos) para que el frontend pueda restaurar la tarjeta.
 *
 * @route POST /api/swipe/undo
 */
export const undoSwipe = async (req, res, next) => {
    let client;
    try {
        const fromUserId = req.user.id;
        const targetUserId = req.body?.targetUserId;

        const tier = await getUserSubscriptionTier(fromUserId);
        const maxUndos = getTierUndoLimit(tier);

        const countResult = await db.query(
            `SELECT COUNT(*)::int AS count, MIN(created_at) AS oldest_undo
             FROM user_swipe_undos
             WHERE user_id = $1
               AND created_at >= NOW() - INTERVAL '24 hours'`,
            [fromUserId],
        );
        const usedUndos = countResult.rows[0]?.count ?? 0;
        const oldestUndo = countResult.rows[0]?.oldest_undo;
        const resetsAt = oldestUndo
            ? new Date(new Date(oldestUndo).getTime() + 24 * 60 * 60 * 1000).toISOString()
            : null;

        if (usedUndos >= maxUndos) {
            return res.status(403).json({
                code: 'DAILY_UNDO_LIMIT_REACHED',
                message: `Has alcanzado el límite diario de ${maxUndos} deshaceres para tu plan (${tier}). Pásate a MiraiLink Plus o Premium para más deshaceres.`,
                limit: maxUndos,
                remaining: 0,
                resetsAt,
            });
        }

        let swipeResult;
        if (targetUserId) {
            swipeResult = await db.query(
                `SELECT 'like' AS action, to_user_id, created_at FROM likes WHERE origin = 'discovery' AND from_user_id = $1 AND to_user_id = $2
                 UNION ALL
                 SELECT 'dislike' AS action, to_user_id, created_at FROM dislikes WHERE from_user_id = $1 AND to_user_id = $2
                 ORDER BY created_at DESC LIMIT 1`,
                [fromUserId, targetUserId],
            );
        } else {
            swipeResult = await db.query(
                `SELECT 'like' AS action, to_user_id, created_at FROM likes WHERE origin = 'discovery' AND from_user_id = $1
                 UNION ALL
                 SELECT 'dislike' AS action, to_user_id, created_at FROM dislikes WHERE from_user_id = $1
                 ORDER BY created_at DESC LIMIT 1`,
                [fromUserId],
            );
        }

        if (swipeResult.rowCount === 0) {
            return res.status(404).json({
                code: 'NO_SWIPE_TO_UNDO',
                message: 'No se encontraron votos recientes para deshacer',
            });
        }

        const { action, to_user_id: undoneUserId } = swipeResult.rows[0];

        client = await db.connect();
        await client.query('BEGIN');

        if (action === 'like') {
            await cancelMatchCapsule(client, fromUserId, undoneUserId);
            await client.query(
                "DELETE FROM likes WHERE origin='discovery' AND from_user_id = $1 AND to_user_id = $2",
                [fromUserId, undoneUserId],
            );
            await client.query(
                'DELETE FROM matches WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)',
                [fromUserId, undoneUserId],
            );
        } else {
            await client.query(
                'DELETE FROM dislikes WHERE from_user_id = $1 AND to_user_id = $2',
                [fromUserId, undoneUserId],
            );
        }

        await client.query(
            'INSERT INTO user_swipe_undos (user_id, target_user_id, action_undone, created_at) VALUES ($1, $2, $3, NOW())',
            [fromUserId, undoneUserId, action],
        );

        await client.query('COMMIT');
        client.release();
        client = null;

        invalidateUserCountCache(fromUserId);

        const locale = resolveCatalogLanguage(req.get('accept-language'));
        const userQuery = `
            SELECT u.id, u.username, u.nickname, u.bio, u.gender,
                   TO_CHAR(u.birthdate, 'YYYY-MM-DD') AS birthdate,
                   ${localizedResidenceColumns('u')},
                   ${localizedAttributeColumns('u')}
            FROM users u
            ${localizedResidenceJoins('u', 2)}
            ${localizedAttributeJoins('u', 2)}
            WHERE u.id = $1 AND u.is_deleted = FALSE
        `;
        const userRes = await db.query(userQuery, [undoneUserId, locale]);
        let userDto = null;
        if (userRes.rows[0]) {
            const rawUser = userRes.rows[0];
            const extras = await profileExtras(rawUser.id, req);
            userDto = { ...toPublicUser(rawUser), ...extras };
        }

        const newUsed = usedUndos + 1;
        const newRemaining = Math.max(0, maxUndos - newUsed);
        const calculatedResetsAt = resetsAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const remainingCheck = await db.query(
            `SELECT 1 FROM likes WHERE from_user_id = $1 AND origin = 'discovery'
             UNION ALL
             SELECT 1 FROM dislikes WHERE from_user_id = $1
             LIMIT 1`,
            [fromUserId],
        );
        const hasUndoableSwipe = remainingCheck.rowCount > 0;
        const canUndo = newRemaining > 0 && hasUndoableSwipe;

        return res.json({
            message: 'Swipe reverted successfully',
            actionUndone: action,
            user: userDto,
            quota: {
                tier,
                maxUndos,
                usedUndos: newUsed,
                remainingUndos: newRemaining,
                resetsAt: calculatedResetsAt,
                hasUndoableSwipe,
                canUndo,
            },
        });
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK').catch(() => {});
            client.release();
        }
        return next(error);
    }
};
