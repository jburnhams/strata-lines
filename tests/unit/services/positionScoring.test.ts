
import { scorePosition, scoreBothPositions, selectBestPosition } from '@/services/positionScoring';
import { PlaceTitleBounds, PlaceTitlePosition, PositioningConstraints } from '@/types';
import { LatLngBounds } from 'leaflet';

describe('positionScoring', () => {
  // Helper to create DOMRect
  const createRect = (x: number, y: number, width: number, height: number): DOMRect => {
    return {
      x,
      y,
      width,
      height,
      left: x,
      right: x + width,
      top: y,
      bottom: y + height,
      toJSON: () => {}
    } as DOMRect;
  };

  const constraints: PositioningConstraints = {
    minDistance: 5,
    preferredGap: 20,
    containerBounds: createRect(0, 0, 1000, 1000)
  };

  describe('scorePosition', () => {
    it('gives bonus for being within bounds', () => {
      const bounds = createRect(100, 100, 50, 20);
      const score = scorePosition(bounds, 'right', [], constraints);
      expect(score).toBe(1000); // Base bonus
    });

    it('does not penalize for being outside bounds (just no bonus)', () => {
       const bounds = createRect(2000, 2000, 50, 20);
       const score = scorePosition(bounds, 'right', [], constraints);
       expect(score).toBe(0); // No bonus, but no penalty unless overlapping
    });

    it('penalizes overlap significantly', () => {
      const bounds = createRect(100, 100, 50, 20);
      const existing: PlaceTitleBounds[] = [{
        placeId: 'p1',
        position: 'left',
        bounds: createRect(110, 110, 50, 20), // Overlaps
        geoBounds: {} as LatLngBounds
      }];

      const score = scorePosition(bounds, 'right', existing, constraints);
      // Base bonus (1000) - Overlap Penalty (1000) - Area Penalty (>0)
      // Should be significantly less than bonus
      expect(score).toBeLessThan(1000);
      expect(score).toBeLessThan(0); // Likely negative due to area penalty
    });

    it('rewards distance up to preferred gap', () => {
      const bounds = createRect(100, 100, 50, 20);

      // Case 1: Close but not overlapping
      const existingClose: PlaceTitleBounds[] = [{
        placeId: 'p1',
        position: 'left',
        bounds: createRect(160, 100, 50, 20), // 10px gap
        geoBounds: {} as LatLngBounds
      }];

      // Case 2: Farther (at preferred gap)
      const existingFar: PlaceTitleBounds[] = [{
        placeId: 'p1',
        position: 'left',
        bounds: createRect(170, 100, 50, 20), // 20px gap
        geoBounds: {} as LatLngBounds
      }];

      const scoreClose = scorePosition(bounds, 'right', existingClose, constraints);
      const scoreFar = scorePosition(bounds, 'right', existingFar, constraints);

      expect(scoreFar).toBeGreaterThan(scoreClose);
    });
  });

  describe('scoreBothPositions', () => {
    it('calculates scores for both positions', () => {
      const leftBounds = createRect(0, 100, 50, 20);
      const rightBounds = createRect(100, 100, 50, 20);

      const result = scoreBothPositions(leftBounds, rightBounds, [], constraints);
      expect(result).toHaveProperty('left');
      expect(result).toHaveProperty('right');
    });
  });

  describe('selectBestPosition', () => {
    it('selects higher score when difference is significant', () => {
      // Diff > 100 (significantDiff)
      // Default bias is 'right'
      expect(selectBestPosition(200, 50)).toBe('left');
      expect(selectBestPosition(50, 200)).toBe('right');
    });

    it('applies bias when scores are close', () => {
      // Right is slightly better (110 vs 100), but bias is left
      // Diff is 10, threshold 100
      expect(selectBestPosition(100, 110, 'left')).toBe('left');

      // Left is slightly better (110 vs 100), but bias is right
      expect(selectBestPosition(110, 100, 'right')).toBe('right');
    });

    it('overrides bias if difference is significant', () => {
      // Right is much better (250 vs 100), bias left
      expect(selectBestPosition(100, 250, 'left')).toBe('right');
    });

    it('defaults to bias when equal', () => {
      expect(selectBestPosition(100, 100, 'left')).toBe('left');
      expect(selectBestPosition(100, 100, 'right')).toBe('right');
    });
  });
});
