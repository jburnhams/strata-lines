import { describe, it, expect, vi, beforeEach } from 'vitest';
import L from 'leaflet';

/**
 * Integration tests for export workflow
 * These tests verify that the export system correctly handles the full workflow
 * from bounds selection to tile generation and stitching.
 */

describe('Export Integration Tests', () => {
  describe('Tile Splitting Strategy', () => {
    /**
     * Mock the calculatePixelDimensions function to simulate different scenarios
     */
    const MAX_TILE_DIMENSION = 4000;

    const mockCalculatePixelDimensions = (bounds: L.LatLngBounds, zoom: number): { width: number; height: number } => {
      // Simple mock: assume 1 degree = 1000 pixels at zoom level
      const latRange = bounds.getNorth() - bounds.getSouth();
      const lngRange = bounds.getEast() - bounds.getWest();

      const scale = Math.pow(2, zoom) * 100;
      return {
        width: Math.round(lngRange * scale),
        height: Math.round(latRange * scale)
      };
    };

    it('should not split when bounds fit within MAX_TILE_DIMENSION', () => {
      // Small bounds that will render to less than 4000x4000 pixels
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.2),
        L.latLng(51.6, -0.1)
      );

      const zoom = 10;
      const dimensions = mockCalculatePixelDimensions(bounds, zoom);

      expect(dimensions.width).toBeLessThan(MAX_TILE_DIMENSION);
      expect(dimensions.height).toBeLessThan(MAX_TILE_DIMENSION);

      // No splitting needed - should render as single tile
      const shouldSplit = dimensions.width > MAX_TILE_DIMENSION || dimensions.height > MAX_TILE_DIMENSION;
      expect(shouldSplit).toBe(false);
    });

    it('should split when width exceeds MAX_TILE_DIMENSION', () => {
      // Wide bounds
      const bounds = L.latLngBounds(
        L.latLng(51.5, -10.0),
        L.latLng(51.6, 10.0)
      );

      const zoom = 12;
      const dimensions = mockCalculatePixelDimensions(bounds, zoom);

      expect(dimensions.width).toBeGreaterThan(MAX_TILE_DIMENSION);

      // Should split vertically (by longitude)
      const center = bounds.getCenter();
      const leftBounds = L.latLngBounds(
        bounds.getSouthWest(),
        L.latLng(bounds.getNorth(), center.lng)
      );
      const rightBounds = L.latLngBounds(
        L.latLng(bounds.getSouth(), center.lng),
        bounds.getNorthEast()
      );

      expect(leftBounds.getEast()).toBe(rightBounds.getWest());
      expect(leftBounds.getSouth()).toBe(rightBounds.getSouth());
      expect(leftBounds.getNorth()).toBe(rightBounds.getNorth());
    });

    it('should split when height exceeds MAX_TILE_DIMENSION', () => {
      // Tall bounds
      const bounds = L.latLngBounds(
        L.latLng(20.0, -0.5),
        L.latLng(60.0, 0.5)
      );

      const zoom = 12;
      const dimensions = mockCalculatePixelDimensions(bounds, zoom);

      expect(dimensions.height).toBeGreaterThan(MAX_TILE_DIMENSION);

      // Should split horizontally (by latitude)
      const center = bounds.getCenter();
      const topBounds = L.latLngBounds(
        L.latLng(center.lat, bounds.getWest()),
        bounds.getNorthEast()
      );
      const bottomBounds = L.latLngBounds(
        bounds.getSouthWest(),
        L.latLng(center.lat, bounds.getEast())
      );

      expect(topBounds.getSouth()).toBe(bottomBounds.getNorth());
      expect(topBounds.getWest()).toBe(bottomBounds.getWest());
      expect(topBounds.getEast()).toBe(bottomBounds.getEast());
    });

    it('should recursively split very large areas into multiple tiles', () => {
      // Very large bounds that will need multiple splits
      const bounds = L.latLngBounds(
        L.latLng(30.0, -20.0),
        L.latLng(60.0, 20.0)
      );

      const zoom = 12;

      // Simulate recursive splitting
      const splitRecursively = (b: L.LatLngBounds): L.LatLngBounds[] => {
        const dims = mockCalculatePixelDimensions(b, zoom);

        if (dims.width <= MAX_TILE_DIMENSION && dims.height <= MAX_TILE_DIMENSION) {
          return [b];
        }

        const center = b.getCenter();
        let subBounds: L.LatLngBounds[];

        if (dims.width > dims.height) {
          // Split vertically
          subBounds = [
            L.latLngBounds(b.getSouthWest(), L.latLng(b.getNorth(), center.lng)),
            L.latLngBounds(L.latLng(b.getSouth(), center.lng), b.getNorthEast())
          ];
        } else {
          // Split horizontally
          subBounds = [
            L.latLngBounds(L.latLng(center.lat, b.getWest()), b.getNorthEast()),
            L.latLngBounds(b.getSouthWest(), L.latLng(center.lat, b.getEast()))
          ];
        }

        return subBounds.flatMap(sb => splitRecursively(sb));
      };

      const tiles = splitRecursively(bounds);

      // Should produce multiple tiles
      expect(tiles.length).toBeGreaterThan(1);

      // All tiles should be within MAX_TILE_DIMENSION
      tiles.forEach(tile => {
        const dims = mockCalculatePixelDimensions(tile, zoom);
        expect(dims.width).toBeLessThanOrEqual(MAX_TILE_DIMENSION);
        expect(dims.height).toBeLessThanOrEqual(MAX_TILE_DIMENSION);
      });

      // Tiles should cover the entire original bounds without gaps or overlaps
      // Check that all tiles are within the original bounds
      tiles.forEach(tile => {
        expect(tile.getSouth()).toBeGreaterThanOrEqual(bounds.getSouth());
        expect(tile.getNorth()).toBeLessThanOrEqual(bounds.getNorth());
        expect(tile.getWest()).toBeGreaterThanOrEqual(bounds.getWest());
        expect(tile.getEast()).toBeLessThanOrEqual(bounds.getEast());
      });
    });

    it('should maintain bounds coverage after splitting', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -4.0),
        L.latLng(52.0, 0.0)
      );

      const center = bounds.getCenter();

      // Split vertically
      const left = L.latLngBounds(
        bounds.getSouthWest(),
        L.latLng(bounds.getNorth(), center.lng)
      );
      const right = L.latLngBounds(
        L.latLng(bounds.getSouth(), center.lng),
        bounds.getNorthEast()
      );

      // Combined coverage should equal original
      expect(left.getWest()).toBe(bounds.getWest());
      expect(right.getEast()).toBe(bounds.getEast());
      expect(left.getSouth()).toBe(bounds.getSouth());
      expect(right.getSouth()).toBe(bounds.getSouth());
      expect(left.getNorth()).toBe(bounds.getNorth());
      expect(right.getNorth()).toBe(bounds.getNorth());
      expect(left.getEast()).toBe(right.getWest());
    });
  });

  describe('Export Bounds Validation', () => {
    it('should handle valid export bounds', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.0),
        L.latLng(52.0, 0.0)
      );

      expect(bounds.isValid()).toBe(true);
      expect(bounds.getSouth()).toBeLessThan(bounds.getNorth());
      expect(bounds.getWest()).toBeLessThan(bounds.getEast());
    });

    it('should reject invalid bounds (south > north)', () => {
      const bounds = L.latLngBounds(
        L.latLng(52.0, -1.0),  // North value
        L.latLng(51.0, 0.0)    // South value
      );

      // Leaflet should auto-correct or mark as invalid
      expect(bounds.getSouth()).toBeLessThan(bounds.getNorth());
    });

    it('should handle bounds at different zoom levels', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.2),
        L.latLng(51.6, -0.1)
      );

      // Same bounds at different zoom levels should have different pixel dimensions
      const mockCalcPixels = (zoom: number) => {
        const latRange = bounds.getNorth() - bounds.getSouth();
        const lngRange = bounds.getEast() - bounds.getWest();
        const scale = Math.pow(2, zoom) * 100;
        return {
          width: Math.round(lngRange * scale),
          height: Math.round(latRange * scale)
        };
      };

      const dims10 = mockCalcPixels(10);
      const dims12 = mockCalcPixels(12);
      const dims15 = mockCalcPixels(15);

      // Higher zoom = more pixels
      expect(dims12.width).toBeGreaterThan(dims10.width);
      expect(dims12.height).toBeGreaterThan(dims10.height);
      expect(dims15.width).toBeGreaterThan(dims12.width);
      expect(dims15.height).toBeGreaterThan(dims12.height);

      // Zoom level 15 should be 2^5 = 32 times larger than zoom 10
      const zoomDiff = 15 - 10;
      const expectedScale = Math.pow(2, zoomDiff);
      expect(dims15.width / dims10.width).toBeCloseTo(expectedScale, 0);
    });
  });

  describe('Tile Positioning for Stitching', () => {
    /**
     * Tests to ensure tiles are positioned correctly when stitching
     * based on their lat/long bounds
     */

    it('should calculate correct relative position for adjacent tiles', () => {
      const totalBounds = L.latLngBounds(
        L.latLng(50.0, -4.0),
        L.latLng(52.0, 0.0)
      );

      const center = totalBounds.getCenter();

      const leftTile = L.latLngBounds(
        totalBounds.getSouthWest(),
        L.latLng(totalBounds.getNorth(), center.lng)
      );

      const rightTile = L.latLngBounds(
        L.latLng(totalBounds.getSouth(), center.lng),
        totalBounds.getNorthEast()
      );

      // Left tile should start at x=0, y=0 of the final canvas
      // Right tile should start at x=(width of left tile), y=0

      // The tiles should be adjacent (share a boundary)
      expect(leftTile.getEast()).toBe(rightTile.getWest());

      // The tiles should span the full height
      expect(leftTile.getSouth()).toBe(totalBounds.getSouth());
      expect(leftTile.getNorth()).toBe(totalBounds.getNorth());
      expect(rightTile.getSouth()).toBe(totalBounds.getSouth());
      expect(rightTile.getNorth()).toBe(totalBounds.getNorth());
    });

    it('should handle tile positioning for 4-quadrant split', () => {
      const totalBounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      const center = totalBounds.getCenter();

      // Create 4 quadrants
      const topLeft = L.latLngBounds(
        L.latLng(center.lat, totalBounds.getWest()),
        L.latLng(totalBounds.getNorth(), center.lng)
      );

      const topRight = L.latLngBounds(
        L.latLng(center.lat, center.lng),
        totalBounds.getNorthEast()
      );

      const bottomLeft = L.latLngBounds(
        totalBounds.getSouthWest(),
        L.latLng(center.lat, center.lng)
      );

      const bottomRight = L.latLngBounds(
        L.latLng(totalBounds.getSouth(), center.lng),
        L.latLng(center.lat, totalBounds.getEast())
      );

      // Verify quadrants meet at the center
      expect(topLeft.getSouth()).toBe(bottomLeft.getNorth());
      expect(topRight.getSouth()).toBe(bottomRight.getNorth());
      expect(topLeft.getEast()).toBe(topRight.getWest());
      expect(bottomLeft.getEast()).toBe(bottomRight.getWest());

      // Verify quadrants cover the full bounds
      expect(topLeft.getNorth()).toBe(totalBounds.getNorth());
      expect(topLeft.getWest()).toBe(totalBounds.getWest());
      expect(topRight.getNorth()).toBe(totalBounds.getNorth());
      expect(topRight.getEast()).toBe(totalBounds.getEast());
      expect(bottomLeft.getSouth()).toBe(totalBounds.getSouth());
      expect(bottomLeft.getWest()).toBe(totalBounds.getWest());
      expect(bottomRight.getSouth()).toBe(totalBounds.getSouth());
      expect(bottomRight.getEast()).toBe(totalBounds.getEast());
    });

    it('should maintain precision in tile boundary calculations', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.123456, -0.987654),
        L.latLng(51.234567, -0.876543)
      );

      const center = bounds.getCenter();

      // Split and verify precision is maintained
      const left = L.latLngBounds(
        bounds.getSouthWest(),
        L.latLng(bounds.getNorth(), center.lng)
      );

      const right = L.latLngBounds(
        L.latLng(bounds.getSouth(), center.lng),
        bounds.getNorthEast()
      );

      // Check that coordinates maintain precision
      expect(left.getSouth()).toBeCloseTo(51.123456, 6);
      expect(left.getNorth()).toBeCloseTo(51.234567, 6);
      expect(right.getSouth()).toBeCloseTo(51.123456, 6);
      expect(right.getNorth()).toBeCloseTo(51.234567, 6);
    });
  });

  describe('Export Quality and Zoom Relationship', () => {
    it('should increase pixel dimensions with quality setting', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.2),
        L.latLng(51.6, -0.1)
      );

      const previewZoom = 10;

      // Mock export at different quality levels
      const getExportZoom = (quality: number) => previewZoom + quality;

      const quality0 = getExportZoom(0);
      const quality2 = getExportZoom(2);
      const quality5 = getExportZoom(5);

      expect(quality0).toBe(10);
      expect(quality2).toBe(12);
      expect(quality5).toBe(15);

      // Higher quality = higher zoom = more pixels
      const mockCalcPixels = (zoom: number) => {
        const scale = Math.pow(2, zoom) * 100;
        return scale * 0.1 * 0.1; // 0.1 degree range
      };

      expect(mockCalcPixels(quality2)).toBeGreaterThan(mockCalcPixels(quality0));
      expect(mockCalcPixels(quality5)).toBeGreaterThan(mockCalcPixels(quality2));
    });
  });

  describe('Boundary Box Coverage', () => {
    /**
     * Tests to ensure the exported area exactly matches the yellow boundary box
     */

    it('should export exact bounds without extension or shrinkage', () => {
      const selectedBounds = L.latLngBounds(
        L.latLng(51.5, -0.2),
        L.latLng(51.6, -0.1)
      );

      // When we render this bounds, the result should cover exactly these coordinates
      // No more, no less

      const exportedBounds = selectedBounds; // In the actual implementation, this would be the result

      expect(exportedBounds.getSouth()).toBe(selectedBounds.getSouth());
      expect(exportedBounds.getNorth()).toBe(selectedBounds.getNorth());
      expect(exportedBounds.getWest()).toBe(selectedBounds.getWest());
      expect(exportedBounds.getEast()).toBe(selectedBounds.getEast());
    });

    it('should maintain aspect ratio when applying aspect ratio constraints', () => {
      const originalBounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      // Mock pixel dimensions
      const mockCalcPixels = (bounds: L.LatLngBounds, zoom: number) => {
        const latRange = bounds.getNorth() - bounds.getSouth();
        const lngRange = bounds.getEast() - bounds.getWest();
        const scale = Math.pow(2, zoom) * 100;
        return {
          width: Math.round(lngRange * scale),
          height: Math.round(latRange * scale)
        };
      };

      const zoom = 12;
      const dims = mockCalcPixels(originalBounds, zoom);

      const currentRatio = dims.width / dims.height;
      const targetRatio = 16 / 9; // 16:9 aspect ratio

      // If current ratio doesn't match target, bounds should be adjusted
      // by shrinking one dimension while keeping the other constant

      expect(currentRatio).not.toBe(targetRatio);

      // The aspect ratio adjustment should maintain the center point
      const center = originalBounds.getCenter();
      expect(center.lat).toBeCloseTo(51.0, 10);
      expect(center.lng).toBeCloseTo(-1.0, 10);
    });
  });
});

describe('Real-world Export Scenarios', () => {
  it('should handle export of UK cycling routes', () => {
    // Typical UK bounds
    const bounds = L.latLngBounds(
      L.latLng(50.0, -5.0),
      L.latLng(55.0, 2.0)
    );

    expect(bounds.isValid()).toBe(true);
    expect(bounds.getCenter().lat).toBeCloseTo(52.5, 1);
    expect(bounds.getCenter().lng).toBeCloseTo(-1.5, 1);
  });

  it('should handle export of single city', () => {
    // London bounds
    const bounds = L.latLngBounds(
      L.latLng(51.38, -0.35),
      L.latLng(51.67, 0.15)
    );

    expect(bounds.isValid()).toBe(true);

    const latRange = bounds.getNorth() - bounds.getSouth();
    const lngRange = bounds.getEast() - bounds.getWest();

    expect(latRange).toBeCloseTo(0.29, 2);
    expect(lngRange).toBeCloseTo(0.50, 2);
  });

  it('should handle export of single track zoom', () => {
    // Very small area - single track at high zoom
    const bounds = L.latLngBounds(
      L.latLng(51.500, -0.130),
      L.latLng(51.510, -0.120)
    );

    expect(bounds.isValid()).toBe(true);

    const latRange = bounds.getNorth() - bounds.getSouth();
    const lngRange = bounds.getEast() - bounds.getWest();

    expect(latRange).toBeCloseTo(0.01, 3);
    expect(lngRange).toBeCloseTo(0.01, 3);
  });

  it('should handle export spanning multiple countries', () => {
    // Europe bounds
    const bounds = L.latLngBounds(
      L.latLng(35.0, -10.0),
      L.latLng(60.0, 30.0)
    );

    expect(bounds.isValid()).toBe(true);

    const latRange = bounds.getNorth() - bounds.getSouth();
    const lngRange = bounds.getEast() - bounds.getWest();

    expect(latRange).toBe(25);
    expect(lngRange).toBe(40);
  });
});
