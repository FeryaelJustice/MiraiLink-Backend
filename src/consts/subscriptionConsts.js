/**
 * Constantes y configuracion de suscripciones y planes basicos de Google Play Store.
 */

export const SUBSCRIPTION_PRODUCTS = {
    PLUS: 'mirailink_plus',
    PREMIUM: 'mirailink_premium',
};

export const BASE_PLANS = {
    WEEKLY: 'weekly-autorenew',
    MONTHLY: 'monthly-autorenew',
    THREE_MONTHS: 'three-month-autorenew',
    THREEE_MONTHS: 'threee-month-autorenew',
};

/**
 * Limite de likes diarios (ultimas 24 horas) para usuarios del plan gratuito.
 */
export const FREE_DAILY_LIKES_LIMIT = 50;

/**
 * Restricciones y limites de funcionalidades por nivel de membresia.
 * - FREE: Radio maximo 250 km, sin Modo Pasaporte (solo radio local y pais propio).
 * - PLUS: Radio ampliado hasta 800 km, likes diarios ilimitados, sin anuncios.
 * - PREMIUM: Todo lo de Plus + Modo Pasaporte (especificar pais destino / mundial) + Ver quien te da like.
 */
export const SUBSCRIPTION_FEATURES = {
    FREE_MAX_RADIUS_KM: 250,
    EXTENDED_MAX_RADIUS_KM: 800,
    PASSPORT_SCOPES: ['specific_country', 'world'],
};

/**
 * Mapeo de identificadores o alias de planes basicos a su duracion en SQL INTERVAL.
 */
export const BASE_PLAN_INTERVALS = {
    [BASE_PLANS.WEEKLY]: '7 days',
    [BASE_PLANS.MONTHLY]: '30 days',
    [BASE_PLANS.THREE_MONTHS]: '90 days',
    [BASE_PLANS.THREEE_MONTHS]: '90 days',
};

/**
 * Resuelve el intervalo SQL (ej. '7 days', '30 days', '90 days') segun el basePlanId.
 * @param {string} basePlanId
 * @returns {string}
 */
export const resolvePlanInterval = (basePlanId) => {
    if (!basePlanId) return '30 days';

    // Coincidencia directa con constantes
    if (BASE_PLAN_INTERVALS[basePlanId]) {
        return BASE_PLAN_INTERVALS[basePlanId];
    }

    const lower = basePlanId.toLowerCase();
    if (lower.includes('week')) {
        return '7 days';
    }
    if (
        lower.includes('three-month') ||
        lower.includes('threee-month') ||
        lower.includes('3-month') ||
        lower.includes('3month') ||
        lower.includes('quarter')
    ) {
        return '90 days';
    }

    return '30 days';
};

export const PLAY_STORE_URLS = {
    SUBSCRIPTIONS_BASE: 'https://play.google.com/store/account/subscriptions',
    APP_PACKAGE_NAME: 'com.feryaeljustice.mirailink',
};
