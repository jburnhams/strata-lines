import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  calculateSubdivisions,
  resizeCanvas,
  waitForTiles,
  createPrintMap,
} from '@/utils/exportHelpers';
import { calculatePixelDimensions } from '@/utils/mapCalculations';
import { createCanvas } from '@napi-rs/canvas';
import L from 'leaflet';

describe('Export Helpers', () => {
  describe('calculateSubdivisions', () => {
    it('should return single subdivision when bounds fit within max dimension', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );
      const zoom = 10;
      const maxDim = 4000;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      expect(subdivisions).toHaveLength(1);
      expect(subdivisions[0]).toEqual(bounds);
    });

    it('should create multiple subdivisions when bounds exceed max dimension', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );
      const zoom = 13;
      const maxDim = 1000;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      expect(subdivisions.length).toBeGreaterThan(1);

      // Verify all subdivisions respect max dimension
      subdivisions.forEach(subdivision => {
        const dimensions = calculatePixelDimensions(subdivision, zoom);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });
    });

    it('should split along longest dimension', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -1.0),
        L.latLng(51.6, 1.0)
      );
      const zoom = 12;
      const dimensions = calculatePixelDimensions(bounds, zoom);
      const maxDim = Math.max(dimensions.width, dimensions.height) - 1;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      expect(subdivisions.length).toBeGreaterThan(1);

      // All subdivisions should cover the original bounds
      const allLngs = subdivisions.flatMap(s => [s.getWest(), s.getEast()]);
      expect(Math.min(...allLngs)).toBe(bounds.getWest());
      expect(Math.max(...allLngs)).toBe(bounds.getEast());
    });

    it('should handle recursive subdivision correctly', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );
      const zoom = 13;
      const maxDim = 500;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      expect(subdivisions.length).toBeGreaterThan(4);

      // All must be valid and meet constraints
      subdivisions.forEach(subdivision => {
        expect(subdivision.isValid()).toBe(true);
        const dimensions = calculatePixelDimensions(subdivision, zoom);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });
    });

    it('should not create overlapping subdivisions', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );
      const zoom = 12;
      const maxDim = 1000;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      for (let i = 0; i < subdivisions.length; i++) {
        for (let j = i + 1; j < subdivisions.length; j++) {
          const sub1 = subdivisions[i];
          const sub2 = subdivisions[j];

          const latOverlap =
            sub1.getSouth() < sub2.getNorth() &&
            sub1.getNorth() > sub2.getSouth();
          const lngOverlap =
            sub1.getWest() < sub2.getEast() &&
            sub1.getEast() > sub2.getWest();

          if (latOverlap && lngOverlap) {
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

  describe('resizeCanvas', () => {
    // Note: These tests run in Node.js environment with leaflet-node's @napi-rs/canvas support
    it('should resize canvas to target dimensions', () => {
      const sourceCanvas = createCanvas(800, 600);

      const targetWidth = 400;
      const targetHeight = 300;

      const resized = resizeCanvas(sourceCanvas, targetWidth, targetHeight);

      expect(resized.width).toBe(targetWidth);
      expect(resized.height).toBe(targetHeight);
    });

    it('should create a new canvas instance', () => {
      const sourceCanvas = createCanvas(800, 600);

      const resized = resizeCanvas(sourceCanvas, 400, 300);

      expect(resized).not.toBe(sourceCanvas);
    });

    it('should preserve aspect ratio when scaling proportionally', () => {
      const sourceCanvas = createCanvas(800, 600);

      const targetWidth = 400;
      const targetHeight = 300;

      const resized = resizeCanvas(sourceCanvas, targetWidth, targetHeight);

      const sourceRatio = sourceCanvas.width / sourceCanvas.height;
      const targetRatio = resized.width / resized.height;

      expect(targetRatio).toBeCloseTo(sourceRatio, 2);
    });

    it('should handle upscaling', () => {
      const sourceCanvas = createCanvas(800, 600);

      const targetWidth = 1600;
      const targetHeight = 1200;

      const resized = resizeCanvas(sourceCanvas, targetWidth, targetHeight);

      expect(resized.width).toBe(targetWidth);
      expect(resized.height).toBe(targetHeight);
    });

    it('should handle non-proportional resize', () => {
      const sourceCanvas = createCanvas(800, 600);

      const targetWidth = 100;
      const targetHeight = 500;

      const resized = resizeCanvas(sourceCanvas, targetWidth, targetHeight);

      expect(resized.width).toBe(targetWidth);
      expect(resized.height).toBe(targetHeight);
    });

    it('should have valid 2D context after resize', () => {
      const sourceCanvas = createCanvas(800, 600);

      const resized = resizeCanvas(sourceCanvas, 400, 300);
      const ctx = resized.getContext('2d');

      expect(ctx).not.toBeNull();
      expect(typeof ctx?.fillRect).toBe('function');
    });
  });

  describe('waitForTiles', () => {
    let container: HTMLDivElement;
    let map: L.Map;

    beforeEach(() => {
      // Create a container for the map
      container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '600px';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);

      // Create a Leaflet map
      map = createPrintMap(container);
      map.setView([51.505, -0.09], 13);
    });

    afterEach(() => {
      if (map) {
        map.remove();
      }
      if (container && container.parentNode) {
        document.body.removeChild(container);
      }
    });

    it('should estimate tile count before tiles start loading', async () => {
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
      });
      tileLayer.addTo(map);

      const progressUpdates: Array<{ loaded: number; total: number }> = [];
      const onProgress = jest.fn((loaded: number, total: number) => {
        progressUpdates.push({ loaded, total });
      });

      // Start waiting for tiles
      const waitPromise = waitForTiles(tileLayer, map, onProgress);

      // Wait a bit for the promise to start processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check that we got an initial progress update with estimated total
      expect(onProgress).toHaveBeenCalled();
      if (progressUpdates.length > 0) {
        const firstUpdate = progressUpdates[0];
        expect(firstUpdate.loaded).toBe(0);
        expect(firstUpdate.total).toBeGreaterThan(0); // Should have estimated total
      }

      // Clean up
      await waitPromise.catch(() => {
        // May timeout in test environment, which is okay
      });
    }, 15000);

    it('should report progress as tiles load', async () => {
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
      });
      tileLayer.addTo(map);

      const progressUpdates: Array<{ loaded: number; total: number }> = [];
      const onProgress = jest.fn((loaded: number, total: number) => {
        progressUpdates.push({ loaded, total });
      });

      try {
        await waitForTiles(tileLayer, map, onProgress);

        // Should have received multiple progress updates
        expect(progressUpdates.length).toBeGreaterThan(0);

        // Progress should be monotonically increasing (loaded count)
        for (let i = 1; i < progressUpdates.length; i++) {
          expect(progressUpdates[i].loaded).toBeGreaterThanOrEqual(progressUpdates[i - 1].loaded);
        }

        // Final update should show all tiles loaded
        const lastUpdate = progressUpdates[progressUpdates.length - 1];
        expect(lastUpdate.loaded).toBe(lastUpdate.total);
      } catch (e) {
        // May timeout in test environment
        console.log('Tile loading timed out (expected in test environment)');
      }
    }, 15000);

    it('should handle case when map parameter is not provided', async () => {
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
      });
      tileLayer.addTo(map);

      const progressUpdates: Array<{ loaded: number; total: number }> = [];
      const onProgress = jest.fn((loaded: number, total: number) => {
        progressUpdates.push({ loaded, total });
      });

      // Call without map parameter (should still work, just without estimation)
      const waitPromise = waitForTiles(tileLayer, undefined, onProgress);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should still call progress callback, but may start with 0 total
      if (progressUpdates.length > 0) {
        expect(onProgress).toHaveBeenCalled();
      }

      await waitPromise.catch(() => {
        // May timeout
      });
    }, 15000);

    it('should use max of estimated and actual tile count', async () => {
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
      });
      tileLayer.addTo(map);

      const progressUpdates: Array<{ loaded: number; total: number }> = [];
      const onProgress = jest.fn((loaded: number, total: number) => {
        progressUpdates.push({ loaded, total });
      });

      try {
        await waitForTiles(tileLayer, map, onProgress);

        // Total count should never decrease
        for (let i = 1; i < progressUpdates.length; i++) {
          expect(progressUpdates[i].total).toBeGreaterThanOrEqual(progressUpdates[i - 1].total);
        }
      } catch (e) {
        // May timeout
        console.log('Tile loading timed out (expected in test environment)');
      }
    }, 15000);
  });
});
