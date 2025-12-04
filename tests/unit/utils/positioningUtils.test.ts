import {
  getDistance,
  hasOverlap,
  isWithinBounds,
  getOverlapArea,
  geoBoundsToPixelBounds
} from '@/utils/positioningUtils';
import L from 'leaflet';

describe('positioningUtils', () => {
  describe('getDistance', () => {
    it('returns 0 for overlapping rectangles', () => {
      const r1 = new DOMRect(10, 10, 20, 20); // right=30, bottom=30
      const r2 = new DOMRect(20, 20, 20, 20); // left=20, top=20
      expect(getDistance(r1, r2)).toBe(0);
    });

    it('returns vertical distance', () => {
      const r1 = new DOMRect(10, 10, 10, 10); // bottom=20
      const r2 = new DOMRect(10, 30, 10, 10); // top=30
      expect(getDistance(r1, r2)).toBe(10);
    });

    it('returns horizontal distance', () => {
      const r1 = new DOMRect(10, 10, 10, 10); // right=20
      const r2 = new DOMRect(30, 10, 10, 10); // left=30
      expect(getDistance(r1, r2)).toBe(10);
    });

    it('returns Euclidean distance for diagonal', () => {
      const r1 = new DOMRect(0, 0, 10, 10); // right=10, bottom=10
      const r2 = new DOMRect(13, 14, 10, 10); // left=13, top=14
      // dx = 3, dy = 4, sqrt(9+16) = 5
      expect(getDistance(r1, r2)).toBe(5);
    });
  });

  describe('hasOverlap', () => {
    it('returns true for overlapping rectangles', () => {
      const r1 = new DOMRect(10, 10, 20, 20);
      const r2 = new DOMRect(20, 20, 20, 20);
      expect(hasOverlap(r1, r2)).toBe(true);
    });

    it('returns false for non-overlapping rectangles', () => {
      const r1 = new DOMRect(10, 10, 10, 10);
      const r2 = new DOMRect(30, 30, 10, 10);
      expect(hasOverlap(r1, r2)).toBe(false);
    });

    it('considers buffer', () => {
      const r1 = new DOMRect(10, 10, 10, 10); // right=20
      const r2 = new DOMRect(25, 10, 10, 10); // left=25
      // gap is 5. buffer of 3 means r1 effectively right=23, r2 left=22. Overlap!
      expect(hasOverlap(r1, r2, 3)).toBe(true);
      expect(hasOverlap(r1, r2, 2)).toBe(false);
    });
  });

  describe('isWithinBounds', () => {
    it('returns true when fully contained', () => {
      const outer = new DOMRect(0, 0, 100, 100);
      const inner = new DOMRect(10, 10, 50, 50);
      expect(isWithinBounds(inner, outer)).toBe(true);
    });

    it('returns false when partially outside', () => {
      const outer = new DOMRect(0, 0, 100, 100);
      const inner = new DOMRect(90, 90, 20, 20); // extends to 110, 110
      expect(isWithinBounds(inner, outer)).toBe(false);
    });
  });

  describe('getOverlapArea', () => {
    it('returns correct area', () => {
      const r1 = new DOMRect(0, 0, 10, 10);
      const r2 = new DOMRect(5, 5, 10, 10);
      // Overlap box: x=5 to 10 (width 5), y=5 to 10 (height 5). Area 25.
      expect(getOverlapArea(r1, r2)).toBe(25);
    });

    it('returns 0 for no overlap', () => {
      const r1 = new DOMRect(0, 0, 10, 10);
      const r2 = new DOMRect(20, 20, 10, 10);
      expect(getOverlapArea(r1, r2)).toBe(0);
    });
  });

  describe('geoBoundsToPixelBounds', () => {
    it('converts correctly using map projection', () => {
      const map = {
        latLngToLayerPoint: jest.fn((latLng: any) => {
          // simple mock projection: lat -> y (inv), lng -> x
          // lat 10 -> y -100, lng 10 -> x 100
          return { x: latLng.lng * 10, y: -latLng.lat * 10 };
        })
      } as unknown as L.Map;

      const geoBounds = {
        getNorthWest: () => ({ lat: 10, lng: 0 }),
        getSouthEast: () => ({ lat: 0, lng: 10 })
      } as unknown as L.LatLngBounds;

      const result = geoBoundsToPixelBounds(geoBounds, map);

      expect(result.x).toBe(0);
      expect(result.y).toBe(-100);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
    });
  });
});
