import { calculateTrackBounds } from '@/services/gpxProcessor';
import type { Point } from '@/types';

describe('gpxProcessor - calculateTrackBounds', () => {
  it('should calculate correct bounds for a set of points', () => {
    const points: Point[] = [
      [10, 20],
      [15, 25],
      [5, 10],
      [20, 30],
    ];

    const bounds = calculateTrackBounds(points);

    expect(bounds).toEqual({
      minLat: 5,
      maxLat: 20,
      minLng: 10,
      maxLng: 30,
    });
  });

  it('should handle negative coordinates', () => {
    const points: Point[] = [
      [-10, -20],
      [-5, -10],
      [-15, -25],
    ];

    const bounds = calculateTrackBounds(points);

    expect(bounds).toEqual({
      minLat: -15,
      maxLat: -5,
      minLng: -25,
      maxLng: -10,
    });
  });

  it('should return undefined for empty points', () => {
    const points: Point[] = [];
    const bounds = calculateTrackBounds(points);
    expect(bounds).toBeUndefined();
  });

  it('should handle a single point', () => {
    const points: Point[] = [[10, 20]];
    const bounds = calculateTrackBounds(points);
    expect(bounds).toEqual({
      minLat: 10,
      maxLat: 10,
      minLng: 20,
      maxLng: 20,
    });
  });
});
