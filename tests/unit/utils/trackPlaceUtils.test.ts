import { describe, it, expect, jest } from '@jest/globals';
import L from 'leaflet';
import {
  interpolatePoint,
  calculateTotalTrackDistance,
  calculateDistanceAlongTrack,
  findTrackMiddlePoint,
  findOptimalMiddlePoint
} from '@/utils/trackPlaceUtils';
import type { Track, Place, Point } from '@/types';

// Helper to create a simple straight track (Northwards)
// 1 degree lat is approx 111km
const createStraightTrack = (pointsCount: number): Track => {
  const points: Point[] = [];
  for (let i = 0; i < pointsCount; i++) {
    points.push([i, 0]);
  }
  return {
    id: 'test-track',
    name: 'Test Track',
    points,
    length: 0, // Should be calculated
    isVisible: true,
    activityType: 'run'
  };
};

describe('trackPlaceUtils', () => {
  describe('interpolatePoint', () => {
    it('interpolates midpoint correctly', () => {
      const p1: Point = [0, 0];
      const p2: Point = [10, 10];
      const result = interpolatePoint(p1, p2, 0.5);
      expect(result).toEqual([5, 5]);
    });

    it('interpolates start point (fraction 0)', () => {
      const p1: Point = [0, 0];
      const p2: Point = [10, 10];
      const result = interpolatePoint(p1, p2, 0);
      expect(result).toEqual([0, 0]);
    });

    it('interpolates end point (fraction 1)', () => {
      const p1: Point = [0, 0];
      const p2: Point = [10, 10];
      const result = interpolatePoint(p1, p2, 1);
      expect(result).toEqual([10, 10]);
    });
  });

  describe('calculateTotalTrackDistance', () => {
    it('returns 0 for empty track', () => {
      const track: Track = { ...createStraightTrack(0), points: [] };
      expect(calculateTotalTrackDistance(track)).toBe(0);
    });

    it('returns pre-calculated length if > 0', () => {
      const track: Track = { ...createStraightTrack(2), length: 123 };
      expect(calculateTotalTrackDistance(track)).toBe(123);
    });

    it('calculates distance if length is 0', () => {
      const track = createStraightTrack(2); // [0,0] to [1,0]
      track.length = 0;
      const dist = calculateTotalTrackDistance(track);
      // 1 degree lat is approx 111 km
      expect(dist).toBeGreaterThan(110);
      expect(dist).toBeLessThan(112);
    });
  });

  describe('calculateDistanceAlongTrack', () => {
    it('returns 0 for first point', () => {
      const track = createStraightTrack(3);
      expect(calculateDistanceAlongTrack(track, 0)).toBe(0);
    });

    it('calculates distance to second point', () => {
      const track = createStraightTrack(3);
      const dist = calculateDistanceAlongTrack(track, 1);
      expect(dist).toBeGreaterThan(110); // 1 degree
    });

    it('calculates distance to last point', () => {
      const track = createStraightTrack(3);
      const dist = calculateDistanceAlongTrack(track, 2);
      expect(dist).toBeGreaterThan(220); // 2 degrees
    });

    it('handles index out of bounds (clamps to max)', () => {
      const track = createStraightTrack(3);
      const dist = calculateDistanceAlongTrack(track, 100);
      expect(dist).toBeGreaterThan(220);
    });
  });

  describe('findTrackMiddlePoint', () => {
    it('finds middle point of 2-point track', () => {
      const track = createStraightTrack(2); // [0,0] to [1,0]
      track.length = 0; // force recalc
      const mid = findTrackMiddlePoint(track);
      expect(mid[0]).toBeCloseTo(0.5, 3);
      expect(mid[1]).toBeCloseTo(0, 3);
    });

    it('finds middle point of 3-point track (exact middle point)', () => {
      const track = createStraightTrack(3); // [0,0], [1,0], [2,0]
      track.length = 0;
      const mid = findTrackMiddlePoint(track);
      expect(mid[0]).toBeCloseTo(1.0, 3);
    });

    it('interpolates middle point in segment', () => {
      // 0,0 -> 10,0. Middle is 5,0.
      const track = createStraightTrack(2);
      track.points = [[0,0], [10,0]];
      track.length = 0;
      const mid = findTrackMiddlePoint(track);
      expect(mid[0]).toBeCloseTo(5.0, 3);
    });
  });

  describe('findOptimalMiddlePoint', () => {
    it('returns simple middle if no existing places', () => {
      const track = createStraightTrack(3);
      track.length = 0;
      const mid = findTrackMiddlePoint(track);
      const optimal = findOptimalMiddlePoint(track, []);
      expect(optimal).toEqual(mid);
    });

    it('avoids existing place at middle', () => {
      // Track: [0,0] -> [10,0]. Middle is [5,0].
      // Place at [5,0].
      const track = createStraightTrack(2);
      track.points = [[0,0], [10,0]];
      track.length = 0;

      const existingPlace: Place = {
        id: 'p1',
        latitude: 5.0,
        longitude: 0.0,
        title: 'Collision',
        createdAt: 0,
        source: 'manual',
        isVisible: true,
        showIcon: true,
        iconStyle: 'pin'
      };

      const optimal = findOptimalMiddlePoint(track, [existingPlace]);

      // Should pick something away from 5.0
      // Search range is 3.3 to 6.6
      // Since 5.0 is taken, it should find something else within that range
      // that is furthest from 5.0.
      // Likely 3.3 or 6.6

      expect(optimal[0]).not.toBeCloseTo(5.0, 1);
      expect(optimal[0]).toBeGreaterThanOrEqual(3.3);
      expect(optimal[0]).toBeLessThanOrEqual(6.7);
    });
  });
});
