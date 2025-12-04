import { scorePosition, scoreBothPositions, selectBestPosition } from '@/services/positionScoring';
import { PositioningConstraints, PlaceTitleBounds } from '@/types';

describe('positionScoring', () => {
  const constraints: PositioningConstraints = {
    minDistance: 5,
    preferredGap: 20,
    containerBounds: new DOMRect(0, 0, 1000, 1000)
  };

  describe('scorePosition', () => {
    it('gives bonus for being within bounds', () => {
      const bounds = new DOMRect(100, 100, 50, 20);
      const score = scorePosition(bounds, 'right', [], constraints);
      // Base score:
      // Within bounds: +1000
      // No neighbors: minDistance = preferredGap (20). + 20*10 = 200.
      // Total 1200.
      expect(score).toBe(1200);
    });

    it('penalizes overlap', () => {
      const bounds = new DOMRect(100, 100, 50, 20);
      const existing: PlaceTitleBounds[] = [{
        placeId: 'p1',
        position: 'left',
        bounds: new DOMRect(100, 100, 50, 20), // Exact overlap
        geoBounds: {} as any
      }];

      const score = scorePosition(bounds, 'right', existing, constraints);
      // Within bounds: +1000
      // Distance: Defaults to preferredGap (20) because no non-overlapping neighbors. +200.
      // Overlap count: 1. -1000.
      // Overlap area: 50*20 = 1000. -1000*10 = -10000.
      // Total: 1000 + 200 - 1000 - 10000 = -9800.
      expect(score).toBe(-9800);
    });

    it('rewards distance', () => {
      const bounds = new DOMRect(100, 100, 50, 20); // bottom 120
      const existing: PlaceTitleBounds[] = [{
        placeId: 'p1',
        position: 'left',
        bounds: new DOMRect(100, 130, 50, 20), // top 130. Gap 10.
        geoBounds: {} as any
      }];

      const score = scorePosition(bounds, 'right', existing, constraints);
      // Within bounds: +1000
      // Distance: 10. Bonus 10*10 = 100.
      // No overlap.
      // Total: 1100.
      expect(score).toBe(1100);
    });
  });

  describe('scoreBothPositions', () => {
    it('calculates scores for both sides', () => {
      const result = scoreBothPositions(
        'p1',
        100, 100, // icon at 100,100
        50, 20,   // text 50x20
        [],       // no existing
        constraints
      );

      // Both should be valid and have high scores
      expect(result.left).toBeGreaterThan(0);
      expect(result.right).toBeGreaterThan(0);
      // Bounds check
      // Right: x = 100 + 10 + 5 = 115.
      expect(result.rightBounds.x).toBe(115);
      // Left: x = 100 - 10 - 5 - 50 = 35.
      expect(result.leftBounds.x).toBe(35);
    });
  });

  describe('selectBestPosition', () => {
    it('selects higher score', () => {
      expect(selectBestPosition(100, 50)).toBe('left');
      expect(selectBestPosition(50, 100)).toBe('right');
    });

    it('applies bias when scores are close', () => {
      // 1000 vs 950. Diff 50. Max 1000. 50/1000 = 0.05 < 0.1. Bias applies.
      expect(selectBestPosition(1000, 950, 'right')).toBe('right');
    });

    it('ignores bias when scores are far', () => {
      // 1000 vs 800. Diff 200. Max 1000. 0.2 > 0.1.
      expect(selectBestPosition(1000, 800, 'right')).toBe('left');
    });
  });
});
