/**
 * Integration tests for subdivision ordering in stitched exports
 *
 * These tests verify that subdivisions are correctly reordered from depth-first
 * (produced by calculateSubdivisions) to row-major order (required by image-stitch)
 */

import { describe, it, expect } from '@jest/globals';
import L from 'leaflet';
import { calculateSubdivisions, calculateGridLayout } from '../../utils/exportHelpers';

describe('Subdivision Ordering Integration Tests', () => {
  describe('2x2 Grid (4 subdivisions)', () => {
    it('should reorder vertical-split subdivisions from depth-first to row-major', () => {
      // Create bounds that will split vertically first (width > height)
      // Using small area with high zoom to get predictable pixel dimensions
      const bounds = L.latLngBounds(
        L.latLng(50.0, -0.02), // SW corner
        L.latLng(50.01, 0.02)   // NE corner - wide rectangle (~4.4km × ~1.1km)
      );

      // At zoom 18, this creates ~1120px wide × ~280px tall
      // With maxDim=1000, should create multiple subdivisions
      const subdivisions = calculateSubdivisions(bounds, 18, 1000);

      // Should create multiple subdivisions (exact count depends on pixel calculations)
      expect(subdivisions.length).toBeGreaterThan(1);

      // Calculate grid layout - should reorder to row-major
      const gridLayout = calculateGridLayout(subdivisions);

      expect(gridLayout.rows).toBeGreaterThan(0);
      expect(gridLayout.columns).toBeGreaterThan(0);
      expect(gridLayout.orderedSubdivisions.length).toBe(subdivisions.length);

      // Verify row-major ordering: within each row, tiles should go west to east
      const ordered = gridLayout.orderedSubdivisions;
      for (let row = 0; row < gridLayout.rows; row++) {
        for (let col = 0; col < gridLayout.columns - 1; col++) {
          const currentIndex = row * gridLayout.columns + col;
          const nextIndex = currentIndex + 1;

          if (currentIndex < ordered.length && nextIndex < ordered.length) {
            // Current tile's east should be ≤ next tile's west
            expect(ordered[currentIndex].getEast()).toBeLessThanOrEqual(
              ordered[nextIndex].getWest() + 0.00001
            );
          }
        }
      }

      // Verify column ordering: within each column, tiles should go north to south
      for (let col = 0; col < gridLayout.columns; col++) {
        for (let row = 0; row < gridLayout.rows - 1; row++) {
          const currentIndex = row * gridLayout.columns + col;
          const nextIndex = (row + 1) * gridLayout.columns + col;

          if (currentIndex < ordered.length && nextIndex < ordered.length) {
            // Current tile's south should be ≥ next tile's north
            expect(ordered[currentIndex].getSouth()).toBeGreaterThanOrEqual(
              ordered[nextIndex].getNorth() - 0.00001
            );
          }
        }
      }
    });

    it('should reorder horizontal-split subdivisions from depth-first to row-major', () => {
      // Create bounds that will split horizontally first (height > width)
      const bounds = L.latLngBounds(
        L.latLng(50.0, -0.005), // SW corner
        L.latLng(50.02, 0.005)  // NE corner - tall rectangle
      );

      const subdivisions = calculateSubdivisions(bounds, 18, 500);

      expect(subdivisions.length).toBeGreaterThan(1);

      const gridLayout = calculateGridLayout(subdivisions);
      const ordered = gridLayout.orderedSubdivisions;

      // Verify ordering is valid
      expect(gridLayout.rows * gridLayout.columns).toBeGreaterThanOrEqual(subdivisions.length);

      // Test row-major ordering properties
      for (let row = 0; row < gridLayout.rows; row++) {
        for (let col = 0; col < gridLayout.columns - 1; col++) {
          const currentIndex = row * gridLayout.columns + col;
          const nextIndex = currentIndex + 1;

          if (currentIndex < ordered.length && nextIndex < ordered.length) {
            expect(ordered[currentIndex].getEast()).toBeLessThanOrEqual(
              ordered[nextIndex].getWest() + 0.00001
            );
          }
        }
      }
    });
  });

  describe('2x1 and 1x2 Grids', () => {
    it('should handle vertical split correctly', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -0.02),
        L.latLng(50.005, 0.02)  // Wide rectangle
      );

      const subdivisions = calculateSubdivisions(bounds, 18, 1000);
      expect(subdivisions.length).toBeGreaterThan(1);

      const gridLayout = calculateGridLayout(subdivisions);
      expect(gridLayout.orderedSubdivisions.length).toBe(subdivisions.length);

      // Verify west-to-east ordering if in same row
      if (gridLayout.rows === 1 && gridLayout.orderedSubdivisions.length >= 2) {
        expect(gridLayout.orderedSubdivisions[0].getEast()).toBeLessThanOrEqual(
          gridLayout.orderedSubdivisions[1].getWest() + 0.00001
        );
      }
    });

    it('should handle horizontal split correctly', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -0.005),
        L.latLng(50.02, 0.005)  // Tall rectangle
      );

      const subdivisions = calculateSubdivisions(bounds, 18, 500);
      expect(subdivisions.length).toBeGreaterThan(1);

      const gridLayout = calculateGridLayout(subdivisions);
      expect(gridLayout.orderedSubdivisions.length).toBe(subdivisions.length);

      // Verify north-to-south ordering if in same column
      if (gridLayout.columns === 1 && gridLayout.orderedSubdivisions.length >= 2) {
        expect(gridLayout.orderedSubdivisions[0].getSouth()).toBeGreaterThanOrEqual(
          gridLayout.orderedSubdivisions[1].getNorth() - 0.00001
        );
      }
    });
  });

  describe('Larger Grids', () => {
    it('should correctly order 4x2 grid (8 subdivisions)', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -0.04),
        L.latLng(50.01, 0.04)  // Very wide rectangle
      );

      // At zoom 18, ~2240px × ~280px
      // With maxDim=600, splits to 4×1, but some might split further
      const subdivisions = calculateSubdivisions(bounds, 18, 600);

      // Should have multiple subdivisions
      expect(subdivisions.length).toBeGreaterThanOrEqual(4);

      const gridLayout = calculateGridLayout(subdivisions);

      const ordered = gridLayout.orderedSubdivisions;

      // Verify row-major ordering: within each row, tiles should go west to east
      for (let row = 0; row < gridLayout.rows; row++) {
        for (let col = 0; col < gridLayout.columns - 1; col++) {
          const currentIndex = row * gridLayout.columns + col;
          const nextIndex = currentIndex + 1;

          if (currentIndex < ordered.length && nextIndex < ordered.length) {
            // Current tile's east should be ≤ next tile's west (they share a boundary)
            expect(ordered[currentIndex].getEast()).toBeLessThanOrEqual(
              ordered[nextIndex].getWest() + 0.00001 // Tolerance for floating point
            );
          }
        }
      }

      // Verify column ordering: within each column, tiles should go north to south
      for (let col = 0; col < gridLayout.columns; col++) {
        for (let row = 0; row < gridLayout.rows - 1; row++) {
          const currentIndex = row * gridLayout.columns + col;
          const nextIndex = (row + 1) * gridLayout.columns + col;

          if (currentIndex < ordered.length && nextIndex < ordered.length) {
            // Current tile's south should be ≥ next tile's north (they share a boundary)
            expect(ordered[currentIndex].getSouth()).toBeGreaterThanOrEqual(
              ordered[nextIndex].getNorth() - 0.00001 // Tolerance for floating point
            );
          }
        }
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle single subdivision (no reordering needed)', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -0.01),
        L.latLng(50.01, 0.01)
      );

      const subdivisions = calculateSubdivisions(bounds, 18, 10000); // Large maxDim = no split
      expect(subdivisions.length).toBe(1);

      const gridLayout = calculateGridLayout(subdivisions);

      expect(gridLayout.rows).toBe(1);
      expect(gridLayout.columns).toBe(1);
      expect(gridLayout.orderedSubdivisions).toEqual(subdivisions);
    });
  });

  describe('Ordering Consistency', () => {
    it('should produce consistent ordering for same subdivision pattern', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -0.02),
        L.latLng(50.01, 0.02)
      );

      // Run subdivision twice
      const subdivisions1 = calculateSubdivisions(bounds, 18, 1000);
      const subdivisions2 = calculateSubdivisions(bounds, 18, 1000);

      const gridLayout1 = calculateGridLayout(subdivisions1);
      const gridLayout2 = calculateGridLayout(subdivisions2);

      // Should produce identical grid structures
      expect(gridLayout1.rows).toBe(gridLayout2.rows);
      expect(gridLayout1.columns).toBe(gridLayout2.columns);

      // Ordered subdivisions should have same geographic properties
      for (let i = 0; i < gridLayout1.orderedSubdivisions.length; i++) {
        const bounds1 = gridLayout1.orderedSubdivisions[i];
        const bounds2 = gridLayout2.orderedSubdivisions[i];

        expect(bounds1.getNorth()).toBeCloseTo(bounds2.getNorth(), 10);
        expect(bounds1.getSouth()).toBeCloseTo(bounds2.getSouth(), 10);
        expect(bounds1.getEast()).toBeCloseTo(bounds2.getEast(), 10);
        expect(bounds1.getWest()).toBeCloseTo(bounds2.getWest(), 10);
      }
    });
  });

  describe('Ordering Verification', () => {
    it('should demonstrate the bug fix: depth-first !== row-major', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -0.02),
        L.latLng(50.01, 0.02)
      );

      const subdivisions = calculateSubdivisions(bounds, 18, 1000);
      const gridLayout = calculateGridLayout(subdivisions);

      // For a 2×2 grid from vertical split:
      // Depth-first order: [NW, SW, NE, SE]
      // Row-major order:   [NW, NE, SW, SE]
      // They should be DIFFERENT

      const depthFirstOrder = subdivisions;
      const rowMajorOrder = gridLayout.orderedSubdivisions;

      // If we have a 2×2 grid, position [1] should be different
      if (gridLayout.rows === 2 && gridLayout.columns === 2) {
        // Depth-first [1] is SW, Row-major [1] is NE
        const centerLat = (bounds.getNorth() + bounds.getSouth()) / 2;

        // Depth-first [1] should be south (SW)
        expect(depthFirstOrder[1].getSouth()).toBeLessThan(centerLat);

        // Row-major [1] should be north (NE)
        expect(rowMajorOrder[1].getNorth()).toBeGreaterThan(centerLat);

        // They should NOT be the same bounds
        expect(depthFirstOrder[1]).not.toBe(rowMajorOrder[1]);
      }
    });
  });
});
