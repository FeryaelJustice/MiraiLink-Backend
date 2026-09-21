import { describe, expect, it } from 'vitest';
import {
    calculateDistanceKm,
    candidateCoordinateSql,
    isActiveLocationFresh,
    resolveUserCoordinates,
} from '../../../src/utils/geoSearch.js';

const now = new Date('2026-09-21T12:00:00.000Z');

describe('geoSearch', () => {
    it('calculates realistic distances between Toulouse, Paris and Mallorca', () => {
        expect(calculateDistanceKm(43.6047, 1.4442, 48.8566, 2.3522)).toBeGreaterThan(580);
        expect(calculateDistanceKm(43.6047, 1.4442, 48.8566, 2.3522)).toBeLessThan(600);
        expect(calculateDistanceKm(39.5696, 2.6502, 43.6047, 1.4442)).toBeGreaterThan(450);
    });

    it('accepts active locations up to 24 hours old', () => {
        expect(isActiveLocationFresh('2026-09-20T12:00:00.000Z', now)).toBe(true);
        expect(isActiveLocationFresh('2026-09-20T11:59:59.999Z', now)).toBe(false);
    });

    it('selects the approved source without silently falling back from active location', () => {
        const user = {
            current_latitude: 43.6047,
            current_longitude: 1.4442,
            last_location_updated_at: '2026-09-21T11:00:00.000Z',
            residence_latitude: 48.8566,
            residence_longitude: 2.3522,
        };
        expect(resolveUserCoordinates(user, true, now)).toEqual({ latitude: 43.6047, longitude: 1.4442 });
        expect(resolveUserCoordinates(user, false, now)).toEqual({ latitude: 48.8566, longitude: 2.3522 });
        expect(resolveUserCoordinates({ ...user, last_location_updated_at: '2026-09-19T11:00:00.000Z' }, true, now))
            .toBeNull();
    });

    it('builds only fixed candidate column expressions', () => {
        expect(candidateCoordinateSql(false)).toEqual({
            latitude: 'u.residence_latitude',
            longitude: 'u.residence_longitude',
        });
        expect(candidateCoordinateSql(true).latitude).toContain("INTERVAL '24 hours'");
    });
});
