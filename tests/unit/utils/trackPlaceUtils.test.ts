import { findTrackMiddlePoint, findOptimalMiddlePoint, calculateTotalTrackDistance, findPointAtDistance, interpolatePoint } from '@/utils/trackPlaceUtils';
import type { Track, Place } from '@/types';
import { jest, describe, it, expect } from '@jest/globals';

// Mock Leaflet
jest.mock('leaflet', () => {
    return {
        latLng: (a: any, b?: any) => {
             let lat: number, lng: number;
             if (Array.isArray(a)) {
                 lat = a[0];
                 lng = a[1];
             } else if (typeof a === 'object' && 'lat' in a) {
                 lat = a.lat;
                 lng = a.lng;
             } else {
                 lat = a;
                 lng = b;
             }
             return {
                 lat,
                 lng,
                 distanceTo: function(this: any, other: any) {
                     // Simple euclidean distance for testing (approx 1 degree = 111km)
                     const dx = (other.lat - this.lat) * 111000;
                     const dy = (other.lng - this.lng) * 111000;
                     return Math.sqrt(dx * dx + dy * dy);
                 }
             };
        }
    };
});

describe('trackPlaceUtils', () => {
    const mockTrack: Track = {
        id: 't1',
        name: 'Test',
        points: [[0, 0], [0, 1]], // 1 degree longitude distance
        length: 111, // km
        isVisible: true,
        activityType: 'run'
    };

    it('interpolates points correctly', () => {
        const p1: [number, number] = [0, 0];
        const p2: [number, number] = [0, 10];
        expect(interpolatePoint(p1, p2, 0.5)).toEqual([0, 5]);
        expect(interpolatePoint(p1, p2, 0.1)).toEqual([0, 1]);
    });

    it('calculates total distance correctly', () => {
        // If track.length is present, it returns it
        expect(calculateTotalTrackDistance(mockTrack)).toBe(111);

        // Recalculate if length is 0? The function says: if (track.length > 0) return track.length
        const t2 = { ...mockTrack, length: 0 };
        // distance between (0,0) and (0,1) is approx 111km
        const dist = calculateTotalTrackDistance(t2);
        expect(dist).toBeCloseTo(111, 0);
    });

    it('finds point at distance', () => {
        // Track: (0,0) -> (0,1) (111km)
        // Find point at 55.5km (middle)
        const t2 = { ...mockTrack, length: 0 }; // force recalc or use geometry
        const mid = findPointAtDistance(t2, 55.5);
        expect(mid).not.toBeNull();
        if (mid) {
            expect(mid[0]).toBeCloseTo(0);
            expect(mid[1]).toBeCloseTo(0.5);
        }
    });

    it('finds middle point', () => {
         const t2 = { ...mockTrack, length: 0 };
         const mid = findTrackMiddlePoint(t2);
         expect(mid[0]).toBeCloseTo(0);
         expect(mid[1]).toBeCloseTo(0.5);
    });

    it('finds optimal middle point avoiding places', () => {
        // Track: (0,0) to (0,1). Middle is (0, 0.5)
        const t2 = { ...mockTrack, length: 0 };

        // Existing place at exact middle
        const place: Place = {
            id: 'p1',
            latitude: 0,
            longitude: 0.5,
            title: 'Existing',
            createdAt: 0,
            source: 'manual',
            isVisible: true,
            showIcon: true,
            iconStyle: 'pin'
        };

        const optimal = findOptimalMiddlePoint(t2, [place]);

        // Should move away from 0.5
        // Search range is 0.33 to 0.66
        // Candidates will be tested.
        // 0.33 is far from 0.5 (dist 0.17)
        // 0.66 is far from 0.5 (dist 0.16)

        expect(optimal[1]).not.toBeCloseTo(0.5);
        expect(optimal[1]).toBeGreaterThanOrEqual(0.33);
        expect(optimal[1]).toBeLessThanOrEqual(0.66);
    });
});
