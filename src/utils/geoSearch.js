const EARTH_RADIUS_KM = 6371;
export const ACTIVE_LOCATION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if ([lat1, lon1, lat2, lon2].some(value => value == null || !Number.isFinite(Number(value)))) {
        return null;
    }
    const toRadians = value => Number(value) * Math.PI / 180;
    const dLat = toRadians(Number(lat2) - Number(lat1));
    const dLon = toRadians(Number(lon2) - Number(lon1));
    const originLat = toRadians(lat1);
    const destinationLat = toRadians(lat2);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(dLon / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isActiveLocationFresh(updatedAt, now = new Date()) {
    if (!updatedAt) return false;
    const updatedTime = new Date(updatedAt).getTime();
    return Number.isFinite(updatedTime)
        && now.getTime() - updatedTime >= 0
        && now.getTime() - updatedTime <= ACTIVE_LOCATION_MAX_AGE_MS;
}

export function resolveUserCoordinates(user, useActiveLocation, now = new Date()) {
    if (
        useActiveLocation
        && user?.current_latitude != null
        && user?.current_longitude != null
        && isActiveLocationFresh(user?.last_location_updated_at, now)
    ) {
        return { latitude: Number(user.current_latitude), longitude: Number(user.current_longitude) };
    }
    if (!useActiveLocation && user?.residence_latitude != null && user?.residence_longitude != null) {
        return { latitude: Number(user.residence_latitude), longitude: Number(user.residence_longitude) };
    }
    return null;
}

export function candidateCoordinateSql(useActiveLocation) {
    if (!useActiveLocation) {
        return {
            latitude: 'u.residence_latitude',
            longitude: 'u.residence_longitude',
        };
    }
    const fresh = "u.last_location_updated_at >= NOW() - INTERVAL '24 hours'";
    return {
        latitude: `CASE WHEN ${fresh} AND u.current_latitude IS NOT NULL AND u.current_longitude IS NOT NULL THEN u.current_latitude ELSE NULL END`,
        longitude: `CASE WHEN ${fresh} AND u.current_latitude IS NOT NULL AND u.current_longitude IS NOT NULL THEN u.current_longitude ELSE NULL END`,
    };
}
