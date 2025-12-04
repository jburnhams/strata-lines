import { describe, it, expect } from '@jest/globals';
import L from 'leaflet';
import {
  interpolatePoint,
  calculateTotalTrackDistance,
  findTrackMiddlePoint,
  findOptimalMiddlePoint
} from '@/utils/trackPlaceUtils';
import type { Track, Point, Place } from '@/types';

// Helper to create a simple straight track
const createStraightTrack = (points: Point[]): Track => ({
  id: 'test-track',
  name: 'Test Track',
  points,
  length: 0, // Calculated dynamically in test if needed, or by function
  isVisible: true,
  activityType: 'run'
});

describe('trackPlaceUtils', () => {
  describe('interpolatePoint', () => {
    it('interpolates correctly at 0%', () => {
      const p1: Point = [0, 0];
      const p2: Point = [10, 10];
      const result = interpolatePoint(p1, p2, 0);
      expect(result).toEqual([0, 0]);
    });

    it('interpolates correctly at 100%', () => {
      const p1: Point = [0, 0];
      const p2: Point = [10, 10];
      const result = interpolatePoint(p1, p2, 1);
      expect(result).toEqual([10, 10]);
    });

    it('interpolates correctly at 50%', () => {
      const p1: Point = [0, 0];
      const p2: Point = [10, 10];
      const result = interpolatePoint(p1, p2, 0.5);
      expect(result).toEqual([5, 5]);
    });
  });

  describe('calculateTotalTrackDistance', () => {
    it('calculates distance correctly', () => {
      // 1 degree lat is approx 111km
      const points: Point[] = [[0, 0], [1, 0]];
      const track = createStraightTrack(points);
      const dist = calculateTotalTrackDistance(track);

      // Expected: ~111.19 km
      expect(dist).toBeCloseTo(111.19, 1);
    });

    it('uses track.length if available', () => {
      const track: Track = {
        ...createStraightTrack([[0, 0], [1, 0]]),
        length: 50
      };
      expect(calculateTotalTrackDistance(track)).toBe(50);
    });
  });

  describe('findTrackMiddlePoint', () => {
    it('finds middle point of straight line', () => {
      const points: Point[] = [[0, 0], [2, 0]]; // 2 degrees apart
      const track = createStraightTrack(points);
      const mid = findTrackMiddlePoint(track);

      expect(mid[0]).toBeCloseTo(1, 3);
      expect(mid[1]).toBeCloseTo(0, 3);
    });

    it('finds middle point of multi-segment line', () => {
      // 0,0 -> 1,0 -> 3,0
      // Total dist ~ 3 degrees. Midpoint at 1.5 degrees.
      // Segment 1: 1 deg. Segment 2: 2 degs.
      // Midpoint is 0.5 degs into segment 2.
      // Segment 2 goes from 1,0 to 3,0. 0.5 degs is 0.25 of the way (0.5/2).
      // Interpolation: 1 + (3-1)*0.25 = 1.5.

      const points: Point[] = [[0, 0], [1, 0], [3, 0]];
      const track = createStraightTrack(points);
      const mid = findTrackMiddlePoint(track);

      expect(mid[0]).toBeCloseTo(1.5, 3);
      expect(mid[1]).toBeCloseTo(0, 3);
    });
  });

  describe('findOptimalMiddlePoint', () => {
    it('returns exact middle if no existing places', () => {
      const points: Point[] = [[0, 0], [2, 0]];
      const track = createStraightTrack(points);
      const mid = findOptimalMiddlePoint(track, []);

      expect(mid[0]).toBeCloseTo(1, 3);
      expect(mid[1]).toBeCloseTo(0, 3);
    });

    it('avoids existing place at exact middle', () => {
        // Track from 0,0 to 10,0. Middle is 5,0.
        // Middle third is approx 3.3 to 6.6.
        // Place at 5,0.
        // Algorithm should pick something far from 5,0 within range.
        const points: Point[] = [[0, 0], [10, 0]];
        const track = createStraightTrack(points);

        const existingPlace: Place = {
            id: 'p1',
            latitude: 5,
            longitude: 0,
            title: 'Middle',
            createdAt: 0,
            source: 'manual',
            isVisible: true,
            showIcon: true,
            iconStyle: 'pin'
        };

        const optimal = findOptimalMiddlePoint(track, [existingPlace]);

        // Should not be 5,0
        expect(Math.abs(optimal[0] - 5)).toBeGreaterThan(0.1);

        // Should be within middle third (approx 3.3 to 6.6)
        expect(optimal[0]).toBeGreaterThanOrEqual(3.3);
        expect(optimal[0]).toBeLessThanOrEqual(6.7);
    });
  });
});
