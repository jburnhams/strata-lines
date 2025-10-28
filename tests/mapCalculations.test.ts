import { describe, it, expect } from 'vitest';
import L from 'leaflet';
import { metersToMiles, calculateBoundsDimensions, calculatePixelDimensions } from '../utils/mapCalculations';

describe('Map Calculations', () => {
  describe('metersToMiles', () => {
    it('converts 0 meters to 0 miles', () => {
      expect(metersToMiles(0)).toBe(0);
    });

    it('converts 1000 meters to approximately 0.621 miles', () => {
      const miles = metersToMiles(1000);
      expect(miles).toBeCloseTo(0.621371, 5);
    });

    it('converts 1609.34 meters to approximately 1 mile', () => {
      const miles = metersToMiles(1609.34);
      expect(miles).toBeCloseTo(1, 2);
    });

    it('handles large values', () => {
      const miles = metersToMiles(1000000);
      expect(miles).toBeCloseTo(621.371, 2);
    });

    it('handles negative values', () => {
      const miles = metersToMiles(-1000);
      expect(miles).toBeCloseTo(-0.621371, 5);
    });
  });

  describe('calculateBoundsDimensions', () => {
    it('calculates dimensions for a small area', () => {
      // Small area around London (approximately 0.1 degrees)
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );

      const dimensions = calculateBoundsDimensions(bounds);

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      // Roughly 0.1 degrees latitude at this latitude should be about 6-7 miles
      expect(dimensions.height).toBeCloseTo(6.9, 0);
    });

    it('calculates dimensions for a larger area', () => {
      // Larger area (1 degree x 1 degree)
      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.0),
        L.latLng(52.0, 0.0)
      );

      const dimensions = calculateBoundsDimensions(bounds);

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      // 1 degree latitude ≈ 69 miles
      expect(dimensions.height).toBeCloseTo(69, 0);
    });

    it('handles bounds crossing the equator', () => {
      const bounds = L.latLngBounds(
        L.latLng(-1, 0),
        L.latLng(1, 1)
      );

      const dimensions = calculateBoundsDimensions(bounds);

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
    });

    it('handles very small bounds', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.501, -0.099)
      );

      const dimensions = calculateBoundsDimensions(bounds);

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      expect(dimensions.width).toBeLessThan(0.1);
      expect(dimensions.height).toBeLessThan(0.1);
    });
  });

  describe('calculatePixelDimensions', () => {
    // Note: These tests require a DOM environment and are skipped in Node.js tests
    // The function is tested in the browser environment and integration tests
    it.skip('calculates pixel dimensions at zoom level 0', () => {
      const bounds = L.latLngBounds(
        L.latLng(-10, -10),
        L.latLng(10, 10)
      );

      const dimensions = calculatePixelDimensions(bounds, 0);

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
      expect(typeof dimensions.width).toBe('number');
      expect(typeof dimensions.height).toBe('number');
    });

    it.skip('dimensions increase with zoom level', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );

      const dim5 = calculatePixelDimensions(bounds, 5);
      const dim10 = calculatePixelDimensions(bounds, 10);
      const dim15 = calculatePixelDimensions(bounds, 15);

      // Higher zoom = more pixels for the same geographic area
      expect(dim10.width).toBeGreaterThan(dim5.width);
      expect(dim15.width).toBeGreaterThan(dim10.width);
      expect(dim10.height).toBeGreaterThan(dim5.height);
      expect(dim15.height).toBeGreaterThan(dim10.height);
    });

    it.skip('dimensions approximately double with each zoom level increase', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );

      const dim10 = calculatePixelDimensions(bounds, 10);
      const dim11 = calculatePixelDimensions(bounds, 11);

      // Each zoom level doubles the scale
      const widthRatio = dim11.width / dim10.width;
      const heightRatio = dim11.height / dim10.height;

      expect(widthRatio).toBeCloseTo(2, 1);
      expect(heightRatio).toBeCloseTo(2, 1);
    });

    it.skip('returns integer pixel values', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );

      const dimensions = calculatePixelDimensions(bounds, 10);

      expect(Number.isInteger(dimensions.width)).toBe(true);
      expect(Number.isInteger(dimensions.height)).toBe(true);
    });

    it.skip('handles very small bounds', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.500001, -0.099999)
      );

      const dimensions = calculatePixelDimensions(bounds, 18);

      expect(dimensions.width).toBeGreaterThan(0);
      expect(dimensions.height).toBeGreaterThan(0);
    });

    it.skip('handles world bounds at low zoom', () => {
      const bounds = L.latLngBounds(
        L.latLng(-85, -180),
        L.latLng(85, 180)
      );

      const dimensions = calculatePixelDimensions(bounds, 0);

      // At zoom 0, the world is 256x256 pixels (standard tile size)
      expect(dimensions.width).toBeCloseTo(256, 0);
      expect(dimensions.height).toBeCloseTo(256, 0);
    });

    it.skip('aspect ratio matches geographic aspect ratio', () => {
      // Create a square in lat/lng (though not truly square geographically)
      const bounds = L.latLngBounds(
        L.latLng(0, 0),
        L.latLng(1, 1)
      );

      const dimensions = calculatePixelDimensions(bounds, 10);

      // At the equator, 1 degree lng ≈ 1 degree lat in terms of pixels
      const aspectRatio = dimensions.width / dimensions.height;
      expect(aspectRatio).toBeCloseTo(1, 1);
    });
  });
});
