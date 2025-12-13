
import {
  getDistance,
  hasOverlap,
  isWithinBounds,
  getOverlapArea,
  geoBoundsToPixelBounds,
  pixelBoundsToGeoBounds
} from '@/utils/positioningUtils';
import { LatLngBounds, Map } from 'leaflet';

describe('positioningUtils', () => {
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

  describe('getDistance', () => {
    it('returns correct distance for non-overlapping rectangles', () => {
      const rect1 = createRect(0, 0, 10, 10);
      const rect2 = createRect(20, 0, 10, 10);
      expect(getDistance(rect1, rect2)).toBe(10);
    });

    it('returns 0 for overlapping rectangles', () => {
      const rect1 = createRect(0, 0, 20, 20);
      const rect2 = createRect(10, 10, 20, 20);
      expect(getDistance(rect1, rect2)).toBe(0);
    });

    it('returns correct distance for diagonal rectangles', () => {
      const rect1 = createRect(0, 0, 10, 10);
      const rect2 = createRect(13, 14, 10, 10);
      // Distance is sqrt(3^2 + 4^2) = 5
      expect(getDistance(rect1, rect2)).toBeCloseTo(5);
    });

    it('returns 0 for same rectangle', () => {
      const rect1 = createRect(0, 0, 10, 10);
      expect(getDistance(rect1, rect1)).toBe(0);
    });
  });

  describe('hasOverlap', () => {
    it('detects overlapping rectangles', () => {
      const rect1 = createRect(0, 0, 20, 20);
      const rect2 = createRect(10, 10, 20, 20);
      expect(hasOverlap(rect1, rect2)).toBe(true);
    });

    it('detects non-overlapping rectangles', () => {
      const rect1 = createRect(0, 0, 10, 10);
      const rect2 = createRect(20, 20, 10, 10);
      expect(hasOverlap(rect1, rect2)).toBe(false);
    });

    it('handles buffer correctly', () => {
      const rect1 = createRect(0, 0, 10, 10);
      const rect2 = createRect(12, 0, 10, 10);
      expect(hasOverlap(rect1, rect2)).toBe(false);
      expect(hasOverlap(rect1, rect2, 2)).toBe(true);
    });

    it('handles touching edges', () => {
      const rect1 = createRect(0, 0, 10, 10);
      const rect2 = createRect(10, 0, 10, 10);
      // Depending on implementation, touching might be considered overlap or not.
      // The implementation uses strictly less than / greater than, so touching is NOT overlap.
      // But let's check the code:
      // bounds1.right + buffer <= bounds2.left - buffer
      // 10 <= 10 -> true. So it returns false (no overlap).
      expect(hasOverlap(rect1, rect2)).toBe(false);
    });
  });

  describe('getOverlapArea', () => {
    it('calculates area correctly', () => {
      const rect1 = createRect(0, 0, 20, 20);
      const rect2 = createRect(10, 10, 20, 20);
      // Overlap is 10x10 rectangle
      expect(getOverlapArea(rect1, rect2)).toBe(100);
    });

    it('returns 0 for no overlap', () => {
      const rect1 = createRect(0, 0, 10, 10);
      const rect2 = createRect(20, 20, 10, 10);
      expect(getOverlapArea(rect1, rect2)).toBe(0);
    });
  });

  describe('isWithinBounds', () => {
    const container = createRect(0, 0, 100, 100);

    it('returns true when fully contained', () => {
      const rect = createRect(10, 10, 10, 10);
      expect(isWithinBounds(rect, container)).toBe(true);
    });

    it('returns false when partially outside', () => {
      const rect = createRect(95, 10, 10, 10);
      expect(isWithinBounds(rect, container)).toBe(false);
    });

    it('returns false when fully outside', () => {
      const rect = createRect(110, 10, 10, 10);
      expect(isWithinBounds(rect, container)).toBe(false);
    });

    it('returns true when exactly on boundary', () => {
      const rect = createRect(0, 0, 100, 100);
      expect(isWithinBounds(rect, container)).toBe(true);
    });
  });

  describe('geoBoundsToPixelBounds', () => {
    // Mock Map
    const map = {
      latLngToLayerPoint: jest.fn(),
      layerPointToLatLng: jest.fn(),
    } as unknown as Map;

    // Mock LatLngBounds
    const bounds = {
      getNorthWest: jest.fn(),
      getSouthEast: jest.fn(),
    } as unknown as LatLngBounds;

    it('converts correctly', () => {
      (bounds.getNorthWest as jest.Mock).mockReturnValue({ lat: 10, lng: 0 });
      (bounds.getSouthEast as jest.Mock).mockReturnValue({ lat: 0, lng: 10 });
      (map.latLngToLayerPoint as jest.Mock).mockImplementation((latLng) => {
        if (latLng.lat === 10) return { x: 0, y: 0 };
        return { x: 100, y: 100 };
      });

      const pixelBounds = geoBoundsToPixelBounds(bounds, map);
      expect(pixelBounds.x).toBe(0);
      expect(pixelBounds.y).toBe(0);
      expect(pixelBounds.width).toBe(100);
      expect(pixelBounds.height).toBe(100);
    });
  });
});
