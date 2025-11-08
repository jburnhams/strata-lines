/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  calculateSubdivisions,
  resizeCanvas,
} from '../utils/exportHelpers';
import { calculatePixelDimensions } from '../utils/mapCalculations';
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
});
