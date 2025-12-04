import { scorePosition, scoreAllPositions, selectBestPosition } from '@/services/positionScoring';
import { PositioningConstraints, PlaceTitleBounds, PlaceTitlePosition } from '@/types';

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

    it('ignores overlap with ignoredId', () => {
      const bounds = new DOMRect(100, 100, 50, 20);
      const existing: PlaceTitleBounds[] = [{
        placeId: 'p1',
        position: 'left',
        bounds: new DOMRect(100, 100, 50, 20), // Exact overlap
        geoBounds: {} as any
      }];

      // Without ignoreId, score is -9800 (from previous test)
      const scoreNormal = scorePosition(bounds, 'right', existing, constraints);
      expect(scoreNormal).toBeLessThan(0);

      // With ignoreId, it should be treated as empty existing
      const scoreIgnored = scorePosition(bounds, 'right', existing, constraints, 'p1');
      expect(scoreIgnored).toBe(1200); // Same as "gives bonus for being within bounds" test
    });
  });

  describe('scoreAllPositions', () => {
    it('calculates scores for all positions', () => {
      const result = scoreAllPositions(
        'p1',
        100, 100, // icon at 100,100 (bottom center)
        50, 20,   // text 50x20
        [],       // no existing
        constraints
      );

      // All should be valid
      expect(result.left.score).toBeGreaterThan(0);
      expect(result.right.score).toBeGreaterThan(0);
      expect(result.top.score).toBeGreaterThan(0);
      expect(result.bottom.score).toBeGreaterThan(0);

      // Bounds check
      // Right: x = 100 + 10 + 5 = 115.
      expect(result.right.bounds.x).toBe(115);
      // Left: x = 100 - 10 - 5 - 50 = 35.
      expect(result.left.bounds.x).toBe(35);

      // Top: y = iconTop (100-20=80) - 5 - 20 = 55.
      // x = 100 - 25 = 75.
      expect(result.top.bounds.y).toBe(55);
      expect(result.top.bounds.x).toBe(75);

      // Bottom: y = 100 + 5 = 105.
      expect(result.bottom.bounds.y).toBe(105);
      expect(result.bottom.bounds.x).toBe(75);
    });
  });

  describe('selectBestPosition', () => {
    const mockBounds = new DOMRect(0,0,0,0);

    it('selects higher score', () => {
      const scores: Record<PlaceTitlePosition, { score: number, bounds: DOMRect }> = {
        left: { score: 100, bounds: mockBounds },
        right: { score: 50, bounds: mockBounds },
        top: { score: 50, bounds: mockBounds },
        bottom: { score: 50, bounds: mockBounds }
      };
      expect(selectBestPosition(scores)).toBe('left');

      scores.left.score = 50;
      scores.right.score = 100;
      expect(selectBestPosition(scores)).toBe('right');
    });

    it('applies bias when scores are close', () => {
      const scores: Record<PlaceTitlePosition, { score: number, bounds: DOMRect }> = {
        left: { score: 1000, bounds: mockBounds },
        right: { score: 950, bounds: mockBounds },
        top: { score: 500, bounds: mockBounds },
        bottom: { score: 500, bounds: mockBounds }
      };
      // 1000 vs 950. Diff 50. Max 1000. 50/1000 = 0.05 < 0.1. Bias applies.
      expect(selectBestPosition(scores, 'right')).toBe('right');
    });

    it('ignores bias when scores are far', () => {
      const scores: Record<PlaceTitlePosition, { score: number, bounds: DOMRect }> = {
        left: { score: 1000, bounds: mockBounds },
        right: { score: 800, bounds: mockBounds },
        top: { score: 500, bounds: mockBounds },
        bottom: { score: 500, bounds: mockBounds }
      };
      // 1000 vs 800. Diff 200. Max 1000. 0.2 > 0.1.
      expect(selectBestPosition(scores, 'right')).toBe('left');
    });
  });

  describe('complex scenarios', () => {
    it('chooses top/bottom when sides are blocked (Sandwich)', () => {
      // Target: 100, 100. Icon size 20. Text 50x20.
      // Left pos: x=35, y=90, w=50, h=20
      // Right pos: x=115, y=90, w=50, h=20

      const existing: PlaceTitleBounds[] = [
        {
          placeId: 'blocker-left',
          position: 'left',
          bounds: new DOMRect(35, 80, 50, 20), // Blocks left (y=80..100) matches target (y=80..100)
          geoBounds: {} as any
        },
        {
          placeId: 'blocker-right',
          position: 'right',
          bounds: new DOMRect(115, 80, 50, 20), // Blocks right
          geoBounds: {} as any
        }
      ];

      const scores = scoreAllPositions(
        'target',
        100, 100,
        50, 20,
        existing,
        constraints
      );

      // Left and Right should have terrible scores due to overlap
      expect(scores.left.score).toBeLessThan(0);
      expect(scores.right.score).toBeLessThan(0);

      // Top and Bottom should be positive
      expect(scores.top.score).toBeGreaterThan(0);
      expect(scores.bottom.score).toBeGreaterThan(0);

      const best = selectBestPosition(scores);
      expect(['top', 'bottom']).toContain(best);
    });
  });
});
