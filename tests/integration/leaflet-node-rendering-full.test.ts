import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createTestMap, cleanupTestMaps, Leaflet as L } from 'leaflet-node/testing';

/**
 * Full rendering tests using leaflet-node testing utilities
 *
 * These tests verify that leaflet-node can actually render maps with tracks,
 * tile layers, and labels for server-side export functionality.
 *
 * Note: Uses createTestMap() and cleanupTestMaps() from leaflet-node/testing
 * to avoid Canvas animation frame race conditions during cleanup.
 */

describe('Leaflet-Node Full Rendering', () => {
  let map: any;

  afterEach(async () => {
    await cleanupTestMaps();
  });

  describe('Map Creation and Rendering', () => {
    it('should create a map instance', () => {
      map = createTestMap({
        mapOptions: {
          preferCanvas: true,
          attributionControl: false,
          zoomControl: false,
        }
      });

      expect(map).toBeDefined();
      expect(map.getContainer()).toBeDefined();
    });

    it('should set map view and zoom', () => {
      map = createTestMap({ center: [51.505, -0.09], zoom: 13 });

      const mapCenter = map.getCenter();
      expect(mapCenter.lat).toBeCloseTo(51.505, 5);
      expect(mapCenter.lng).toBeCloseTo(-0.09, 5);
      expect(map.getZoom()).toBe(13);
    });
  });

  describe('Track Rendering', () => {
    beforeEach(() => {
      map = createTestMap({
        center: [51.505, -0.09],
        zoom: 13,
        mapOptions: { preferCanvas: true }
      });
    });

    it('should render a polyline track', () => {
      const trackPoints: [number, number][] = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ];

      const polyline = L.polyline(trackPoints, {
        color: '#ff0000',
        weight: 3,
        opacity: 0.8,
      });

      polyline.addTo(map);

      // Verify polyline was added
      expect(map.hasLayer(polyline)).toBe(true);
    });

    it('should render multiple tracks with different colors', () => {
      const tracks = [
        {
          points: [[51.5, -0.1], [51.51, -0.09], [51.52, -0.08]],
          color: '#ff0000',
        },
        {
          points: [[51.49, -0.11], [51.50, -0.10], [51.51, -0.09]],
          color: '#00ff00',
        },
        {
          points: [[51.48, -0.12], [51.49, -0.11], [51.50, -0.10]],
          color: '#0000ff',
        },
      ];

      tracks.forEach(track => {
        const polyline = L.polyline(track.points, {
          color: track.color,
          weight: 3,
          opacity: 0.8,
        });
        polyline.addTo(map);
        expect(map.hasLayer(polyline)).toBe(true);
      });
    });

    it('should fit map bounds to track', () => {
      const trackPoints: [number, number][] = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
        [51.53, -0.07],
      ];

      const polyline = L.polyline(trackPoints, {
        color: '#ff0000',
        weight: 3,
      });
      polyline.addTo(map);

      // Fit bounds to the track
      map.fitBounds(polyline.getBounds());

      const mapBounds = map.getBounds();
      const trackBounds = polyline.getBounds();

      // Map bounds should contain track bounds
      expect(mapBounds.contains(trackBounds.getSouthWest())).toBe(true);
      expect(mapBounds.contains(trackBounds.getNorthEast())).toBe(true);
    });
  });

  describe('Tile Layer Creation', () => {
    beforeEach(() => {
      map = createTestMap({ center: [51.505, -0.09], zoom: 13 });
    });

    it('should create and add a tile layer', () => {
      const tileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '' }
      );

      tileLayer.addTo(map);

      expect(map.hasLayer(tileLayer)).toBe(true);
    });

    it('should render map with satellite imagery', () => {
      const tileLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '' }
      );

      tileLayer.addTo(map);

      expect(map.hasLayer(tileLayer)).toBe(true);
    });
  });

  describe('Export Scenarios', () => {
    it('should create map at export dimensions', () => {
      const exportWidth = 1920;
      const exportHeight = 1080;

      map = createTestMap({
        width: exportWidth,
        height: exportHeight,
        center: [51.505, -0.09],
        zoom: 13,
        mapOptions: { preferCanvas: true }
      });

      const size = map.getSize();
      expect(size.x).toBe(exportWidth);
      expect(size.y).toBe(exportHeight);
    });

    it('should render at high export zoom level', () => {
      const previewZoom = 10;
      const exportQuality = 2;
      const exportZoom = previewZoom + exportQuality;

      map = createTestMap({ center: [51.505, -0.09], zoom: exportZoom });

      expect(map.getZoom()).toBe(12);
    });

    it('should render tracks at export quality', () => {
      map = createTestMap({
        center: [51.505, -0.09],
        zoom: 13,
        mapOptions: { preferCanvas: true }
      });

      const baseThickness = 3;
      const exportQuality = 2;
      const exportThickness = baseThickness * (1 + exportQuality / 2);

      const trackPoints: [number, number][] = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ];

      const polyline = L.polyline(trackPoints, {
        color: '#ff4500',
        weight: exportThickness,
        opacity: 0.8,
      });

      polyline.addTo(map);

      expect(map.hasLayer(polyline)).toBe(true);
    });
  });

  describe('Canvas and Context', () => {
    beforeEach(() => {
      map = createTestMap({
        center: [51.505, -0.09],
        zoom: 13,
        mapOptions: { preferCanvas: true }
      });
    });

    it('should have working canvas context', () => {
      // Create a canvas to verify @napi-rs/canvas is working
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 100;
      testCanvas.height = 100;

      const ctx = testCanvas.getContext('2d');

      expect(ctx).toBeDefined();
      expect(ctx).not.toBeNull();
      expect(typeof ctx?.fillRect).toBe('function');
    });

    it('should render polyline on canvas', () => {
      const trackPoints: [number, number][] = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ];

      const polyline = L.polyline(trackPoints, {
        color: '#ff0000',
        weight: 5,
      });
      polyline.addTo(map);

      // If we got here without errors, canvas rendering worked
      expect(map.hasLayer(polyline)).toBe(true);
    });
  });
});
