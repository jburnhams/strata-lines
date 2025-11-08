import { describe, it, expect } from '@jest/globals';
import L from 'leaflet';
import { calculatePixelDimensions } from '../utils/mapCalculations';

/**
 * Tests for the subdivision calculation algorithm
 *
 * The subdivision algorithm recursively divides geographic bounds into smaller
 * sections until each section fits within a maximum pixel dimension constraint.
 * This is critical for exporting large maps that would otherwise exceed browser
 * canvas size limits.
 */

/**
 * Helper function that mimics the subdivision logic from App.tsx
 * This is extracted for testing purposes
 */
function calculateSubdivisions(
  bounds: L.LatLngBounds,
  zoomForRender: number,
  maxDim: number
): L.LatLngBounds[] {
  const { width, height } = calculatePixelDimensions(bounds, zoomForRender);

  // Base case: if both dimensions fit within maxDim, return this bounds as a single subdivision
  if (width <= maxDim && height <= maxDim) {
    return [bounds];
  }

  // Recursive case: split along the longest dimension
  const center = bounds.getCenter();
  let bounds1: L.LatLngBounds, bounds2: L.LatLngBounds;

  if (width > height) {
    // Split vertically (divide longitude at center)
    bounds1 = L.latLngBounds(bounds.getSouthWest(), L.latLng(bounds.getNorth(), center.lng));
    bounds2 = L.latLngBounds(L.latLng(bounds.getSouth(), center.lng), bounds.getNorthEast());
  } else {
    // Split horizontally (divide latitude at center)
    bounds1 = L.latLngBounds(L.latLng(center.lat, bounds.getWest()), bounds.getNorthEast());
    bounds2 = L.latLngBounds(bounds.getSouthWest(), L.latLng(center.lat, bounds.getEast()));
  }

  // Recursively subdivide each half
  const subdivisions1 = calculateSubdivisions(bounds1, zoomForRender, maxDim);
  const subdivisions2 = calculateSubdivisions(bounds2, zoomForRender, maxDim);

  return [...subdivisions1, ...subdivisions2];
}

describe('Subdivision Calculation', () => {
  describe('Base Cases', () => {
    it('should return single subdivision when dimensions fit within max', () => {
      // Small bounds that will fit in 4000px at zoom 10
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );

      const subdivisions = calculateSubdivisions(bounds, 10, 4000);

      expect(subdivisions).toHaveLength(1);
      expect(subdivisions[0]).toEqual(bounds);
    });

    it('should return single subdivision when exactly at max dimension', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );

      const dimensions = calculatePixelDimensions(bounds, 10);
      const maxDim = Math.max(dimensions.width, dimensions.height);

      const subdivisions = calculateSubdivisions(bounds, 10, maxDim);

      expect(subdivisions).toHaveLength(1);
    });

    it('should return original bounds for very large max dimension', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      const subdivisions = calculateSubdivisions(bounds, 12, 10000);

      expect(subdivisions).toHaveLength(1);
      expect(subdivisions[0].getSouth()).toBe(bounds.getSouth());
      expect(subdivisions[0].getNorth()).toBe(bounds.getNorth());
      expect(subdivisions[0].getWest()).toBe(bounds.getWest());
      expect(subdivisions[0].getEast()).toBe(bounds.getEast());
    });
  });

  describe('Splitting Logic', () => {
    it('should split wide bounds vertically (along longitude)', () => {
      // Create a wide rectangular bounds
      const bounds = L.latLngBounds(
        L.latLng(51.5, -1.0),
        L.latLng(51.6, 1.0)
      );

      const dimensions = calculatePixelDimensions(bounds, 12);
      // Set maxDim to force a split
      const maxDim = Math.max(dimensions.width, dimensions.height) - 1;

      const subdivisions = calculateSubdivisions(bounds, 12, maxDim);

      expect(subdivisions.length).toBeGreaterThan(1);

      // Verify all subdivisions cover the original bounds
      const allLngs = subdivisions.flatMap(s => [s.getWest(), s.getEast()]);
      expect(Math.min(...allLngs)).toBe(bounds.getWest());
      expect(Math.max(...allLngs)).toBe(bounds.getEast());
    });

    it('should split tall bounds horizontally (along latitude)', () => {
      // Create a tall rectangular bounds
      const bounds = L.latLngBounds(
        L.latLng(50.0, -0.5),
        L.latLng(54.0, 0.5)
      );

      const dimensions = calculatePixelDimensions(bounds, 12);
      // Set maxDim to force a split
      const maxDim = Math.max(dimensions.width, dimensions.height) - 1;

      const subdivisions = calculateSubdivisions(bounds, 12, maxDim);

      expect(subdivisions.length).toBeGreaterThan(1);

      // Verify all subdivisions cover the original bounds
      const allLats = subdivisions.flatMap(s => [s.getSouth(), s.getNorth()]);
      expect(Math.min(...allLats)).toBe(bounds.getSouth());
      expect(Math.max(...allLats)).toBe(bounds.getNorth());
    });

    it('should split into 2 sections when one dimension is too large', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.5),
        L.latLng(51.6, 0.5)
      );

      // Get actual dimensions
      const dimensions = calculatePixelDimensions(bounds, 13);
      const maxDim = Math.floor(Math.max(dimensions.width, dimensions.height) / 1.5);

      const subdivisions = calculateSubdivisions(bounds, 13, maxDim);

      expect(subdivisions).toHaveLength(2);
    });

    it('should split into 4 sections when both dimensions are too large', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      // Get actual dimensions
      const dimensions = calculatePixelDimensions(bounds, 13);
      // Set maxDim to force splitting both dimensions
      const maxDim = Math.floor(Math.min(dimensions.width, dimensions.height) * 0.8);

      const subdivisions = calculateSubdivisions(bounds, 13, maxDim);

      expect(subdivisions.length).toBeGreaterThanOrEqual(4);
    });

    it('should maintain center-based splitting', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      const dimensions = calculatePixelDimensions(bounds, 12);
      const maxDim = Math.floor(Math.max(dimensions.width, dimensions.height) / 1.5);

      const subdivisions = calculateSubdivisions(bounds, 12, maxDim);
      const center = bounds.getCenter();

      // At least one subdivision boundary should pass through or near the center
      const hasVerticalSplit = subdivisions.some(s =>
        Math.abs(s.getWest() - center.lng) < 0.01 ||
        Math.abs(s.getEast() - center.lng) < 0.01
      );
      const hasHorizontalSplit = subdivisions.some(s =>
        Math.abs(s.getSouth() - center.lat) < 0.01 ||
        Math.abs(s.getNorth() - center.lat) < 0.01
      );

      expect(hasVerticalSplit || hasHorizontalSplit).toBe(true);
    });
  });

  describe('Coverage and Non-Overlap', () => {
    it('should fully cover original bounds without gaps', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      const subdivisions = calculateSubdivisions(bounds, 13, 500);

      // Get all unique latitudes and longitudes from subdivision boundaries
      const allLats = [...new Set(subdivisions.flatMap(s => [s.getSouth(), s.getNorth()]))].sort((a, b) => a - b);
      const allLngs = [...new Set(subdivisions.flatMap(s => [s.getWest(), s.getEast()]))].sort((a, b) => a - b);

      // The min/max should match the original bounds
      expect(Math.min(...allLats)).toBe(bounds.getSouth());
      expect(Math.max(...allLats)).toBe(bounds.getNorth());
      expect(Math.min(...allLngs)).toBe(bounds.getWest());
      expect(Math.max(...allLngs)).toBe(bounds.getEast());
    });

    it('should produce valid bounds for all subdivisions', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      const subdivisions = calculateSubdivisions(bounds, 13, 800);

      subdivisions.forEach((subdivision, index) => {
        expect(subdivision.isValid()).toBe(true);
        expect(subdivision.getSouth()).toBeLessThan(subdivision.getNorth());
        expect(subdivision.getWest()).toBeLessThan(subdivision.getEast());
      });
    });

    it('should create subdivisions that fit within parent bounds', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      const subdivisions = calculateSubdivisions(bounds, 13, 1000);

      subdivisions.forEach(subdivision => {
        expect(subdivision.getSouth()).toBeGreaterThanOrEqual(bounds.getSouth());
        expect(subdivision.getNorth()).toBeLessThanOrEqual(bounds.getNorth());
        expect(subdivision.getWest()).toBeGreaterThanOrEqual(bounds.getWest());
        expect(subdivision.getEast()).toBeLessThanOrEqual(bounds.getEast());
      });
    });

    it('should not create overlapping subdivisions', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      const subdivisions = calculateSubdivisions(bounds, 13, 600);

      // Check each pair of subdivisions
      for (let i = 0; i < subdivisions.length; i++) {
        for (let j = i + 1; j < subdivisions.length; j++) {
          const sub1 = subdivisions[i];
          const sub2 = subdivisions[j];

          // Two subdivisions overlap if they share an internal area (not just edges)
          const latOverlap =
            sub1.getSouth() < sub2.getNorth() &&
            sub1.getNorth() > sub2.getSouth();
          const lngOverlap =
            sub1.getWest() < sub2.getEast() &&
            sub1.getEast() > sub2.getWest();

          // If they overlap in both dimensions, check if it's just an edge
          if (latOverlap && lngOverlap) {
            // Sharing an edge is OK (coordinates exactly equal)
            const sharesEdge =
              sub1.getSouth() === sub2.getNorth() ||
              sub1.getNorth() === sub2.getSouth() ||
              sub1.getWest() === sub2.getEast() ||
              sub1.getEast() === sub2.getWest();

            expect(sharesEdge).toBe(true);
          }
        }
      }
    });
  });

  describe('Dimension Constraints', () => {
    it('should ensure all subdivisions respect max dimension', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );
      const maxDim = 1000;
      const zoom = 13;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      subdivisions.forEach((subdivision, index) => {
        const dimensions = calculatePixelDimensions(subdivision, zoom);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });
    });

    it('should handle very small max dimension by creating many subdivisions', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.5),
        L.latLng(51.6, 0.5)
      );
      const maxDim = 100; // Very small

      const subdivisions = calculateSubdivisions(bounds, 12, maxDim);

      expect(subdivisions.length).toBeGreaterThan(4);

      // All should respect the constraint
      subdivisions.forEach(subdivision => {
        const dimensions = calculatePixelDimensions(subdivision, 12);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });
    });

    it('should work with standard default max dimension of 4000px', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -3.0),
        L.latLng(54.0, 2.0)
      );
      const maxDim = 4000; // Default in the app
      const zoom = 12;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      expect(subdivisions.length).toBeGreaterThan(0);

      subdivisions.forEach(subdivision => {
        const dimensions = calculatePixelDimensions(subdivision, zoom);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle square bounds correctly', () => {
      // Create perfectly square bounds (in lat/long coordinates)
      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.0),
        L.latLng(52.0, 0.0)
      );

      const dimensions = calculatePixelDimensions(bounds, 12);
      const maxDim = Math.floor(Math.max(dimensions.width, dimensions.height) / 1.5);

      const subdivisions = calculateSubdivisions(bounds, 12, maxDim);

      expect(subdivisions.length).toBeGreaterThan(0);
      subdivisions.forEach(s => expect(s.isValid()).toBe(true));
    });

    it('should handle very small geographic areas', () => {
      // A city block
      const bounds = L.latLngBounds(
        L.latLng(51.5074, -0.1278),
        L.latLng(51.5084, -0.1268)
      );

      const subdivisions = calculateSubdivisions(bounds, 10, 4000);

      expect(subdivisions).toHaveLength(1);
      expect(subdivisions[0]).toEqual(bounds);
    });

    it('should handle very large geographic areas', () => {
      // Continental scale
      const bounds = L.latLngBounds(
        L.latLng(-40.0, -80.0),
        L.latLng(10.0, -30.0)
      );
      const maxDim = 2000;

      const subdivisions = calculateSubdivisions(bounds, 8, maxDim);

      expect(subdivisions.length).toBeGreaterThan(1);
      subdivisions.forEach(subdivision => {
        expect(subdivision.isValid()).toBe(true);
        const dimensions = calculatePixelDimensions(subdivision, 8);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });
    });

    it('should handle bounds at different zoom levels consistently', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.0),
        L.latLng(52.0, 0.0)
      );
      const maxDim = 1000;

      // Same bounds at different zoom levels should produce different subdivision counts
      const subdivisionsZoom10 = calculateSubdivisions(bounds, 10, maxDim);
      const subdivisionsZoom12 = calculateSubdivisions(bounds, 12, maxDim);
      const subdivisionsZoom14 = calculateSubdivisions(bounds, 14, maxDim);

      // Higher zoom = larger pixel dimensions = more subdivisions needed
      expect(subdivisionsZoom14.length).toBeGreaterThan(subdivisionsZoom12.length);
      expect(subdivisionsZoom12.length).toBeGreaterThan(subdivisionsZoom10.length);
    });

    it('should handle bounds crossing the prime meridian', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.0),
        L.latLng(52.0, 1.0)
      );

      const subdivisions = calculateSubdivisions(bounds, 12, 800);

      expect(subdivisions.length).toBeGreaterThan(0);
      subdivisions.forEach(s => {
        expect(s.isValid()).toBe(true);
        expect(s.getWest()).toBeGreaterThanOrEqual(bounds.getWest());
        expect(s.getEast()).toBeLessThanOrEqual(bounds.getEast());
      });
    });

    it('should handle bounds at high latitudes', () => {
      // Near Arctic Circle
      const bounds = L.latLngBounds(
        L.latLng(65.0, -20.0),
        L.latLng(70.0, -10.0)
      );

      const subdivisions = calculateSubdivisions(bounds, 10, 1500);

      expect(subdivisions.length).toBeGreaterThan(0);
      subdivisions.forEach(subdivision => {
        expect(subdivision.isValid()).toBe(true);
        const dimensions = calculatePixelDimensions(subdivision, 10);
        expect(dimensions.width).toBeLessThanOrEqual(1500);
        expect(dimensions.height).toBeLessThanOrEqual(1500);
      });
    });

    it('should handle bounds in southern hemisphere', () => {
      // New Zealand area
      const bounds = L.latLngBounds(
        L.latLng(-47.0, 166.0),
        L.latLng(-34.0, 179.0)
      );

      const subdivisions = calculateSubdivisions(bounds, 10, 2000);

      expect(subdivisions.length).toBeGreaterThan(0);
      subdivisions.forEach(s => expect(s.isValid()).toBe(true));
    });
  });

  describe('Recursive Behavior', () => {
    it('should recursively subdivide until constraints are met', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -4.0),
        L.latLng(54.0, 2.0)
      );
      const maxDim = 400; // Small to force deep recursion

      const subdivisions = calculateSubdivisions(bounds, 13, maxDim);

      // Should create many subdivisions
      expect(subdivisions.length).toBeGreaterThan(16);

      // All must meet constraints
      subdivisions.forEach(subdivision => {
        const dimensions = calculatePixelDimensions(subdivision, 13);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });
    });

    it('should produce power-of-2 subdivision counts for uniform splitting', () => {
      // Square-ish bounds that should split evenly
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      const dimensions = calculatePixelDimensions(bounds, 12);
      // Set maxDim to force exactly 2 levels of splitting
      const maxDim = Math.floor(Math.max(dimensions.width, dimensions.height) / 3);

      const subdivisions = calculateSubdivisions(bounds, 12, maxDim);

      // Should be a power of 2
      const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
      expect(isPowerOfTwo(subdivisions.length)).toBe(true);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle typical GPX track export scenario', () => {
      // Typical cycling route covering ~50km x 30km
      const bounds = L.latLngBounds(
        L.latLng(51.4, -0.3),
        L.latLng(51.9, 0.2)
      );
      const previewZoom = 11;
      const exportQuality = 2;
      const exportZoom = previewZoom + exportQuality; // 13
      const maxDim = 4000;

      const subdivisions = calculateSubdivisions(bounds, exportZoom, maxDim);

      // Verify all subdivisions fit
      subdivisions.forEach(subdivision => {
        const dimensions = calculatePixelDimensions(subdivision, exportZoom);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });

      // Should create at least a few subdivisions at this scale
      expect(subdivisions.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle ultra-high quality export requiring many subdivisions', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.0),
        L.latLng(52.0, 0.0)
      );
      const highExportZoom = 16; // Very high quality
      const maxDim = 4000;

      const subdivisions = calculateSubdivisions(bounds, highExportZoom, maxDim);

      // Should create many subdivisions for high-res export
      expect(subdivisions.length).toBeGreaterThan(10);

      subdivisions.forEach(subdivision => {
        const dimensions = calculatePixelDimensions(subdivision, highExportZoom);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });
    });

    it('should handle panoramic aspect ratio export', () => {
      // Very wide, short bounds (panoramic)
      const bounds = L.latLngBounds(
        L.latLng(51.5, -2.0),
        L.latLng(51.7, 2.0)
      );
      const zoom = 12;
      const maxDim = 2000;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      // Should split primarily vertically
      expect(subdivisions.length).toBeGreaterThan(1);

      // All subdivisions should have similar latitude range
      const latRanges = subdivisions.map(s => s.getNorth() - s.getSouth());
      const avgLatRange = latRanges.reduce((a, b) => a + b) / latRanges.length;
      latRanges.forEach(range => {
        expect(Math.abs(range - avgLatRange)).toBeLessThan(0.1);
      });
    });
  });
});
