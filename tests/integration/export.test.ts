import { describe, it, expect, beforeEach } from '@jest/globals';
import L from 'leaflet';

/**
 * Tests for export-related coordinate conversion and bounds splitting logic
 * These tests ensure that the export system works exclusively with lat/long coordinates
 * and doesn't introduce pixel-based translation errors.
 */

describe('Export Coordinate System', () => {
  describe('Leaflet Bounds Operations', () => {
    it('should create valid bounds from lat/long coordinates', () => {
      const sw = L.latLng(51.5, -0.2);
      const ne = L.latLng(51.6, -0.1);
      const bounds = L.latLngBounds(sw, ne);

      expect(bounds.isValid()).toBe(true);
      expect(bounds.getSouth()).toBe(51.5);
      expect(bounds.getWest()).toBe(-0.2);
      expect(bounds.getNorth()).toBe(51.6);
      expect(bounds.getEast()).toBe(-0.1);
    });

    it('should correctly calculate center of bounds', () => {
      const sw = L.latLng(50.0, -2.0);
      const ne = L.latLng(52.0, 0.0);
      const bounds = L.latLngBounds(sw, ne);
      const center = bounds.getCenter();

      expect(center.lat).toBe(51.0);
      expect(center.lng).toBe(-1.0);
    });

    it('should handle bounds crossing the prime meridian', () => {
      const sw = L.latLng(51.0, -1.0);
      const ne = L.latLng(52.0, 1.0);
      const bounds = L.latLngBounds(sw, ne);

      expect(bounds.getWest()).toBe(-1.0);
      expect(bounds.getEast()).toBe(1.0);
      expect(bounds.isValid()).toBe(true);
    });

    it('should handle bounds at extreme latitudes', () => {
      const sw = L.latLng(-85.0, -180.0);
      const ne = L.latLng(85.0, 180.0);
      const bounds = L.latLngBounds(sw, ne);

      expect(bounds.isValid()).toBe(true);
      expect(bounds.getSouth()).toBe(-85.0);
      expect(bounds.getNorth()).toBe(85.0);
    });
  });

  describe('Bounds Splitting Logic', () => {
    /**
     * Tests the recursive bounds splitting algorithm.
     * This algorithm should split bounds purely based on lat/long coordinates,
     * dividing at the geographic center.
     */

    it('should split bounds vertically when width > height', () => {
      // Create a wide rectangular bounds (more longitude than latitude)
      const bounds = L.latLngBounds(
        L.latLng(50.0, -4.0),  // SW
        L.latLng(51.0, 0.0)    // NE
      );

      const center = bounds.getCenter();

      // Split vertically (by longitude)
      const leftBounds = L.latLngBounds(
        bounds.getSouthWest(),
        L.latLng(bounds.getNorth(), center.lng)
      );
      const rightBounds = L.latLngBounds(
        L.latLng(bounds.getSouth(), center.lng),
        bounds.getNorthEast()
      );

      // Verify left half
      expect(leftBounds.getSouth()).toBe(50.0);
      expect(leftBounds.getNorth()).toBe(51.0);
      expect(leftBounds.getWest()).toBe(-4.0);
      expect(leftBounds.getEast()).toBe(-2.0);

      // Verify right half
      expect(rightBounds.getSouth()).toBe(50.0);
      expect(rightBounds.getNorth()).toBe(51.0);
      expect(rightBounds.getWest()).toBe(-2.0);
      expect(rightBounds.getEast()).toBe(0.0);

      // Verify they share the center longitude
      expect(leftBounds.getEast()).toBe(rightBounds.getWest());
    });

    it('should split bounds horizontally when height >= width', () => {
      // Create a tall rectangular bounds (more latitude than longitude)
      const bounds = L.latLngBounds(
        L.latLng(48.0, -1.0),  // SW
        L.latLng(52.0, 0.0)    // NE
      );

      const center = bounds.getCenter();

      // Split horizontally (by latitude)
      const topBounds = L.latLngBounds(
        L.latLng(center.lat, bounds.getWest()),
        bounds.getNorthEast()
      );
      const bottomBounds = L.latLngBounds(
        bounds.getSouthWest(),
        L.latLng(center.lat, bounds.getEast())
      );

      // Verify top half
      expect(topBounds.getSouth()).toBe(50.0);
      expect(topBounds.getNorth()).toBe(52.0);
      expect(topBounds.getWest()).toBe(-1.0);
      expect(topBounds.getEast()).toBe(0.0);

      // Verify bottom half
      expect(bottomBounds.getSouth()).toBe(48.0);
      expect(bottomBounds.getNorth()).toBe(50.0);
      expect(bottomBounds.getWest()).toBe(-1.0);
      expect(bottomBounds.getEast()).toBe(0.0);

      // Verify they share the center latitude
      expect(topBounds.getSouth()).toBe(bottomBounds.getNorth());
    });

    it('should produce non-overlapping sub-bounds when splitting', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );
      const center = bounds.getCenter();

      // Split horizontally
      const topBounds = L.latLngBounds(
        L.latLng(center.lat, bounds.getWest()),
        bounds.getNorthEast()
      );
      const bottomBounds = L.latLngBounds(
        bounds.getSouthWest(),
        L.latLng(center.lat, bounds.getEast())
      );

      // The bounds should meet at the center but not overlap
      expect(topBounds.getSouth()).toBe(bottomBounds.getNorth());

      // Total area should equal original (in terms of lat/long ranges)
      const originalLatRange = bounds.getNorth() - bounds.getSouth();
      const originalLngRange = bounds.getEast() - bounds.getWest();

      const topLatRange = topBounds.getNorth() - topBounds.getSouth();
      const bottomLatRange = bottomBounds.getNorth() - bottomBounds.getSouth();
      const topLngRange = topBounds.getEast() - topBounds.getWest();
      const bottomLngRange = bottomBounds.getEast() - bottomBounds.getWest();

      expect(topLatRange + bottomLatRange).toBeCloseTo(originalLatRange, 10);
      expect(topLngRange).toBeCloseTo(originalLngRange, 10);
      expect(bottomLngRange).toBeCloseTo(originalLngRange, 10);
    });

    it('should handle recursive splitting into 4 quadrants', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      // First split horizontally
      const center1 = bounds.getCenter();
      const topHalf = L.latLngBounds(
        L.latLng(center1.lat, bounds.getWest()),
        bounds.getNorthEast()
      );
      const bottomHalf = L.latLngBounds(
        bounds.getSouthWest(),
        L.latLng(center1.lat, bounds.getEast())
      );

      // Split top half vertically
      const centerTop = topHalf.getCenter();
      const topLeft = L.latLngBounds(
        topHalf.getSouthWest(),
        L.latLng(topHalf.getNorth(), centerTop.lng)
      );
      const topRight = L.latLngBounds(
        L.latLng(topHalf.getSouth(), centerTop.lng),
        topHalf.getNorthEast()
      );

      // Split bottom half vertically
      const centerBottom = bottomHalf.getCenter();
      const bottomLeft = L.latLngBounds(
        bottomHalf.getSouthWest(),
        L.latLng(bottomHalf.getNorth(), centerBottom.lng)
      );
      const bottomRight = L.latLngBounds(
        L.latLng(bottomHalf.getSouth(), centerBottom.lng),
        bottomHalf.getNorthEast()
      );

      // Verify all 4 quadrants are valid
      expect(topLeft.isValid()).toBe(true);
      expect(topRight.isValid()).toBe(true);
      expect(bottomLeft.isValid()).toBe(true);
      expect(bottomRight.isValid()).toBe(true);

      // Verify quadrants don't overlap but cover the entire original bounds
      expect(topLeft.getNorth()).toBe(bounds.getNorth());
      expect(topRight.getNorth()).toBe(bounds.getNorth());
      expect(bottomLeft.getSouth()).toBe(bounds.getSouth());
      expect(bottomRight.getSouth()).toBe(bounds.getSouth());
      expect(topLeft.getWest()).toBe(bounds.getWest());
      expect(bottomLeft.getWest()).toBe(bounds.getWest());
      expect(topRight.getEast()).toBe(bounds.getEast());
      expect(bottomRight.getEast()).toBe(bounds.getEast());
    });

    it('should maintain geographic accuracy when splitting small regions', () => {
      // Very small bounds (e.g., a city block)
      const bounds = L.latLngBounds(
        L.latLng(51.5074, -0.1278),  // London
        L.latLng(51.5084, -0.1268)
      );

      const center = bounds.getCenter();

      const topHalf = L.latLngBounds(
        L.latLng(center.lat, bounds.getWest()),
        bounds.getNorthEast()
      );

      // Even with very small bounds, splitting should be precise
      expect(topHalf.getSouth()).toBeCloseTo(center.lat, 10);
      expect(topHalf.getNorth()).toBeCloseTo(bounds.getNorth(), 10);
    });

    it('should maintain geographic accuracy when splitting large regions', () => {
      // Very large bounds (e.g., a continent)
      const bounds = L.latLngBounds(
        L.latLng(-40.0, -80.0),
        L.latLng(10.0, -30.0)
      );

      const center = bounds.getCenter();

      const leftHalf = L.latLngBounds(
        bounds.getSouthWest(),
        L.latLng(bounds.getNorth(), center.lng)
      );

      // Large bounds should also split precisely
      expect(leftHalf.getEast()).toBeCloseTo(center.lng, 10);
      expect(leftHalf.getSouth()).toBeCloseTo(bounds.getSouth(), 10);
    });
  });

  describe('Coordinate Precision', () => {
    /**
     * Tests to ensure coordinate precision is maintained throughout operations.
     * Important for avoiding accumulation of rounding errors.
     */

    it('should maintain lat/long precision through multiple operations', () => {
      const originalLat = 51.50740123456789;
      const originalLng = -0.12775987654321;

      const point = L.latLng(originalLat, originalLng);

      // Precision should be maintained
      expect(point.lat).toBe(originalLat);
      expect(point.lng).toBe(originalLng);
    });

    it('should calculate center with high precision', () => {
      const sw = L.latLng(51.501, -0.142);
      const ne = L.latLng(51.514, -0.099);
      const bounds = L.latLngBounds(sw, ne);
      const center = bounds.getCenter();

      // Center should be exactly halfway
      expect(center.lat).toBeCloseTo((51.501 + 51.514) / 2, 10);
      expect(center.lng).toBeCloseTo((-0.142 + -0.099) / 2, 10);
    });

    it('should handle negative coordinates correctly', () => {
      const bounds = L.latLngBounds(
        L.latLng(-34.0, -58.0),  // Buenos Aires area
        L.latLng(-33.0, -57.0)
      );

      expect(bounds.getSouth()).toBe(-34.0);
      expect(bounds.getWest()).toBe(-58.0);
      expect(bounds.getCenter().lat).toBeCloseTo(-33.5, 10);
      expect(bounds.getCenter().lng).toBeCloseTo(-57.5, 10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle bounds at the equator', () => {
      const bounds = L.latLngBounds(
        L.latLng(-1.0, -1.0),
        L.latLng(1.0, 1.0)
      );

      const center = bounds.getCenter();
      expect(center.lat).toBeCloseTo(0.0, 10);
      expect(center.lng).toBeCloseTo(0.0, 10);
    });

    it('should handle square bounds (equal dimensions)', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -1.0),
        L.latLng(51.0, 0.0)
      );

      // For square bounds, we should split horizontally (height >= width)
      const center = bounds.getCenter();
      const topHalf = L.latLngBounds(
        L.latLng(center.lat, bounds.getWest()),
        bounds.getNorthEast()
      );

      expect(topHalf.getSouth()).toBe(50.5);
      expect(topHalf.getNorth()).toBe(51.0);
    });

    it('should handle very small bounds without precision loss', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5074, -0.1278),
        L.latLng(51.50741, -0.12779)
      );

      expect(bounds.isValid()).toBe(true);
      const center = bounds.getCenter();
      expect(center.lat).toBeCloseTo(51.507405, 6);
      expect(center.lng).toBeCloseTo(-0.127795, 6);
    });

    it('should create bounds in different hemisphere combinations', () => {
      // Northern hemisphere, western longitude
      const bounds1 = L.latLngBounds(L.latLng(10.0, -50.0), L.latLng(20.0, -40.0));
      expect(bounds1.isValid()).toBe(true);

      // Southern hemisphere, eastern longitude
      const bounds2 = L.latLngBounds(L.latLng(-20.0, 40.0), L.latLng(-10.0, 50.0));
      expect(bounds2.isValid()).toBe(true);

      // Crossing equator
      const bounds3 = L.latLngBounds(L.latLng(-10.0, -50.0), L.latLng(10.0, -40.0));
      expect(bounds3.isValid()).toBe(true);
      expect(bounds3.getCenter().lat).toBeCloseTo(0.0, 10);
    });
  });

  describe('Bounds Consistency', () => {
    /**
     * Tests to ensure bounds operations are consistent and reversible
     */

    it('should maintain bounds consistency after multiple splits and merges', () => {
      const originalBounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      const center = originalBounds.getCenter();

      // Split into top and bottom
      const topHalf = L.latLngBounds(
        L.latLng(center.lat, originalBounds.getWest()),
        originalBounds.getNorthEast()
      );
      const bottomHalf = L.latLngBounds(
        originalBounds.getSouthWest(),
        L.latLng(center.lat, originalBounds.getEast())
      );

      // The combined vertical range should equal the original
      const combinedLatRange = (topHalf.getNorth() - topHalf.getSouth()) +
                               (bottomHalf.getNorth() - bottomHalf.getSouth());
      const originalLatRange = originalBounds.getNorth() - originalBounds.getSouth();

      expect(combinedLatRange).toBeCloseTo(originalLatRange, 10);
    });

    it('should produce consistent results for repeated operations', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      // Calculate center multiple times
      const center1 = bounds.getCenter();
      const center2 = bounds.getCenter();
      const center3 = bounds.getCenter();

      expect(center1.lat).toBe(center2.lat);
      expect(center1.lng).toBe(center2.lng);
      expect(center2.lat).toBe(center3.lat);
      expect(center2.lng).toBe(center3.lng);
    });
  });
});

describe('Distance Calculations', () => {
  /**
   * Tests for real-world distance calculations used in exports
   */

  it('should calculate distance between two points', () => {
    const point1 = L.latLng(51.5, -0.1);
    const point2 = L.latLng(51.6, -0.1);

    const distance = point1.distanceTo(point2);

    // Distance should be approximately 11.1 km (0.1 degrees of latitude)
    // At this latitude, 1 degree ≈ 111 km
    expect(distance).toBeGreaterThan(10000); // At least 10km
    expect(distance).toBeLessThan(12000); // At most 12km
  });

  it('should calculate distance for horizontal displacement', () => {
    const point1 = L.latLng(51.5, -0.2);
    const point2 = L.latLng(51.5, -0.1);

    const distance = point1.distanceTo(point2);

    // Distance should be less than latitude distance due to longitude convergence
    expect(distance).toBeGreaterThan(6000); // At least 6km
    expect(distance).toBeLessThan(8000); // At most 8km
  });

  it('should calculate zero distance for same point', () => {
    const point1 = L.latLng(51.5, -0.1);
    const point2 = L.latLng(51.5, -0.1);

    const distance = point1.distanceTo(point2);

    expect(distance).toBe(0);
  });
});
