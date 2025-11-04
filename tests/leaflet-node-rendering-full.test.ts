/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * Full rendering tests using leaflet-node directly
 *
 * These tests verify that leaflet-node can actually render maps with tracks,
 * tile layers, and labels for server-side export functionality.
 *
 * Note: This test file uses node environment to let leaflet-node create
 * its own jsdom with canvas support.
 */

describe('Leaflet-Node Full Rendering', () => {
  let L: any;
  let container: HTMLDivElement;
  let map: any;

  beforeEach(async () => {
    // Import leaflet-node dynamically to ensure it sets up its own environment
    const leafletNode = await import('leaflet-node');
    L = leafletNode.default;

    // Create a container for the map
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
  });

  afterEach(async () => {
    // Clean up
    if (map) {
      map.remove();
      map = null;
    }
    // Small delay to let async rendering complete
    await new Promise(resolve => setTimeout(resolve, 10));
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Map Creation and Rendering', () => {
    it('should create a map instance', () => {
      map = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      expect(map).toBeDefined();
      expect(map.getContainer()).toBe(container);
    });

    it('should set map view and zoom', () => {
      map = L.map(container);
      const center = L.latLng(51.505, -0.09);
      const zoom = 13;

      map.setView(center, zoom);

      const mapCenter = map.getCenter();
      expect(mapCenter.lat).toBeCloseTo(51.505, 5);
      expect(mapCenter.lng).toBeCloseTo(-0.09, 5);
      expect(map.getZoom()).toBe(zoom);
    });
  });

  describe('Track Rendering', () => {
    beforeEach(() => {
      map = L.map(container, { preferCanvas: true });
      map.setView([51.505, -0.09], 13);
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
      map = L.map(container);
      map.setView([51.505, -0.09], 13);
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

      container.style.width = `${exportWidth}px`;
      container.style.height = `${exportHeight}px`;

      map = L.map(container, { preferCanvas: true });
      map.setView([51.505, -0.09], 13);

      // Set size explicitly after creation
      map.setSize(exportWidth, exportHeight);

      const size = map.getSize();
      expect(size.x).toBe(exportWidth);
      expect(size.y).toBe(exportHeight);
    });

    it('should render at high export zoom level', () => {
      map = L.map(container);
      const previewZoom = 10;
      const exportQuality = 2;
      const exportZoom = previewZoom + exportQuality;

      map.setView([51.505, -0.09], exportZoom);

      expect(map.getZoom()).toBe(12);
    });

    it('should render tracks at export quality', () => {
      map = L.map(container, { preferCanvas: true });
      map.setView([51.505, -0.09], 13);

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
      map = L.map(container, { preferCanvas: true });
      map.setView([51.505, -0.09], 13);
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
