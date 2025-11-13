import { describe, it, expect } from '@jest/globals';
import L from 'leaflet';
import {
  metersToMiles,
  calculateBoundsDimensions,
  calculatePixelDimensions,
} from '../utils/mapCalculations';

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
    it('projects geographic bounds to expected pixel size at zoom level 10', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );

      const dimensions = calculatePixelDimensions(bounds, 10);

      expect(dimensions).toEqual({ width: 73, height: 117 });
    });

    it('scales pixel dimensions when zoom level increases', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );

      const atZoom10 = calculatePixelDimensions(bounds, 10);
      const atZoom12 = calculatePixelDimensions(bounds, 12);

      expect(atZoom12.width).toBeGreaterThan(atZoom10.width);
      expect(atZoom12.height).toBeGreaterThan(atZoom10.height);
    });

    it('cleans up temporary DOM nodes after measurement', () => {
      const bounds = L.latLngBounds(
        L.latLng(40.7128, -74.006),
        L.latLng(40.7328, -73.986)
      );

      const initialChildren = document.body.childElementCount;
      calculatePixelDimensions(bounds, 11);
      expect(document.body.childElementCount).toBe(initialChildren);
    });
  });
});
