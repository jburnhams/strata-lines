/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { calculatePixelDimensions } from '../utils/mapCalculations';

/**
 * Subdivision rendering tests using leaflet-node
 *
 * These tests verify that subdivided exports can be rendered correctly
 * using leaflet-node for server-side rendering.
 */

// Helper function to calculate subdivisions (same as in subdivision.test.ts)
function calculateSubdivisions(
  bounds: any,
  zoomForRender: number,
  maxDim: number
): any[] {
  const { width, height } = calculatePixelDimensions(bounds, zoomForRender);

  if (width <= maxDim && height <= maxDim) {
    return [bounds];
  }

  const center = bounds.getCenter();
  let bounds1: any, bounds2: any;

  if (width > height) {
    bounds1 = (global as any).L.latLngBounds(bounds.getSouthWest(), (global as any).L.latLng(bounds.getNorth(), center.lng));
    bounds2 = (global as any).L.latLngBounds((global as any).L.latLng(bounds.getSouth(), center.lng), bounds.getNorthEast());
  } else {
    bounds1 = (global as any).L.latLngBounds((global as any).L.latLng(center.lat, bounds.getWest()), bounds.getNorthEast());
    bounds2 = (global as any).L.latLngBounds(bounds.getSouthWest(), (global as any).L.latLng(center.lat, bounds.getEast()));
  }

  const subdivisions1 = calculateSubdivisions(bounds1, zoomForRender, maxDim);
  const subdivisions2 = calculateSubdivisions(bounds2, zoomForRender, maxDim);

  return [...subdivisions1, ...subdivisions2];
}

describe('Subdivision Rendering with Leaflet-Node', () => {
  let L: any;
  let container: HTMLDivElement;
  let map: any;

  beforeEach(async () => {
    // Import leaflet-node to set up the environment
    const leafletNode = await import('leaflet-node');
    L = leafletNode.default;
    (global as any).L = L;

    // Create a container
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
  });

  afterEach(async () => {
    if (map) {
      map.remove();
      map = null;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Single Subdivision Rendering', () => {
    it('should render a single subdivision when bounds fit within max dimension', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );
      const zoom = 12;
      const maxDim = 4000;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);
      expect(subdivisions).toHaveLength(1);

      // Render the subdivision
      map = L.map(container, { preferCanvas: true });
      map.setView(subdivisions[0].getCenter(), zoom);

      // Add a tile layer
      const tileLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '' }
      );
      tileLayer.addTo(map);

      // Add a sample track
      const track = L.polyline(
        [[51.52, -0.05], [51.54, -0.03], [51.56, -0.02]],
        { color: '#ff4500', weight: 3 }
      );
      track.addTo(map);

      expect(map.hasLayer(tileLayer)).toBe(true);
      expect(map.hasLayer(track)).toBe(true);
    });

    it('should correctly position map for subdivision bounds', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.2),
        L.latLng(51.7, 0.1)
      );
      const zoom = 11;

      map = L.map(container);
      map.fitBounds(bounds);

      const mapBounds = map.getBounds();

      // Map should contain the subdivision bounds
      expect(mapBounds.contains(bounds.getSouthWest())).toBe(true);
      expect(mapBounds.contains(bounds.getNorthEast())).toBe(true);
    });
  });

  describe('Multiple Subdivision Rendering', () => {
    it('should create and render multiple subdivisions', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );
      const zoom = 13;
      const maxDim = 1000;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);
      expect(subdivisions.length).toBeGreaterThan(1);

      // Test rendering each subdivision
      subdivisions.forEach((subdivisionBounds, index) => {
        // Create a new map for each subdivision
        const subContainer = document.createElement('div');
        subContainer.style.width = '800px';
        subContainer.style.height = '600px';
        document.body.appendChild(subContainer);

        const subMap = L.map(subContainer, { preferCanvas: true });
        subMap.setView(subdivisionBounds.getCenter(), zoom);

        // Verify map was created
        expect(subMap.getZoom()).toBe(zoom);

        // Clean up
        subMap.remove();
        document.body.removeChild(subContainer);
      });
    });

    it('should render tracks across all subdivisions consistently', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.0),
        L.latLng(52.0, 0.0)
      );
      const zoom = 12;
      const maxDim = 1200;

      const trackPoints: [number, number][] = [
        [51.1, -0.9],
        [51.3, -0.7],
        [51.5, -0.5],
        [51.7, -0.3],
        [51.9, -0.1],
      ];

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);
      expect(subdivisions.length).toBeGreaterThan(1);

      // For each subdivision, check which track points fall within it
      subdivisions.forEach(subdivisionBounds => {
        const subContainer = document.createElement('div');
        subContainer.style.width = '800px';
        subContainer.style.height = '600px';
        document.body.appendChild(subContainer);

        const subMap = L.map(subContainer, { preferCanvas: true });
        subMap.setView(subdivisionBounds.getCenter(), zoom);

        // Filter track points that fall within this subdivision
        const pointsInSubdivision = trackPoints.filter(([lat, lng]) =>
          subdivisionBounds.contains(L.latLng(lat, lng))
        );

        if (pointsInSubdivision.length > 0) {
          // Add the track segment
          const polyline = L.polyline(pointsInSubdivision, {
            color: '#ff0000',
            weight: 3,
          });
          polyline.addTo(subMap);

          expect(subMap.hasLayer(polyline)).toBe(true);
        }

        // Clean up
        subMap.remove();
        document.body.removeChild(subContainer);
      });
    });
  });

  describe('Subdivision Size Constraints', () => {
    it.skip('should create containers matching subdivision pixel dimensions', () => {
      // Note: Skipped because Leaflet map sizing doesn't work accurately in JSDOM
      // This test would pass in a real browser environment
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.5),
        L.latLng(51.7, 0.5)
      );
      const zoom = 13;
      const maxDim = 1500;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      subdivisions.forEach(subdivisionBounds => {
        const dimensions = calculatePixelDimensions(subdivisionBounds, zoom);

        // Verify dimensions are within constraint
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);

        // Create a container matching these dimensions
        const subContainer = document.createElement('div');
        subContainer.style.width = `${dimensions.width}px`;
        subContainer.style.height = `${dimensions.height}px`;
        document.body.appendChild(subContainer);

        const subMap = L.map(subContainer);
        subMap.fitBounds(subdivisionBounds);

        const size = subMap.getSize();
        expect(size.x).toBe(dimensions.width);
        expect(size.y).toBe(dimensions.height);

        // Clean up
        subMap.remove();
        document.body.removeChild(subContainer);
      });
    });

    it('should handle very small subdivisions', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );
      const zoom = 12;
      const maxDim = 200; // Very small

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);
      expect(subdivisions.length).toBeGreaterThan(1);

      subdivisions.forEach(subdivisionBounds => {
        const dimensions = calculatePixelDimensions(subdivisionBounds, zoom);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });
    });

    it('should handle large subdivisions at max dimension', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -3.0),
        L.latLng(54.0, 2.0)
      );
      const zoom = 10;
      const maxDim = 4000; // Default app maximum

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      subdivisions.forEach(subdivisionBounds => {
        const dimensions = calculatePixelDimensions(subdivisionBounds, zoom);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });
    });
  });

  describe('Geographic Coverage', () => {
    it('should render all parts of a large area using subdivisions', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(54.0, 2.0)
      );
      const zoom = 11;
      const maxDim = 2000;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);
      expect(subdivisions.length).toBeGreaterThan(1);

      // Collect all points covered by subdivisions
      const allPoints: Array<{ lat: number; lng: number }> = [];

      subdivisions.forEach(subdivisionBounds => {
        // Sample center point of each subdivision
        const center = subdivisionBounds.getCenter();
        allPoints.push({ lat: center.lat, lng: center.lng });
      });

      // Original bounds should contain all subdivision centers
      allPoints.forEach(point => {
        expect(bounds.contains(L.latLng(point.lat, point.lng))).toBe(true);
      });

      // Subdivisions should cover the full range
      const allLats = allPoints.map(p => p.lat);
      const allLngs = allPoints.map(p => p.lng);

      expect(Math.min(...allLats)).toBeLessThan(bounds.getCenter().lat);
      expect(Math.max(...allLats)).toBeGreaterThan(bounds.getCenter().lat);
      expect(Math.min(...allLngs)).toBeLessThan(bounds.getCenter().lng);
      expect(Math.max(...allLngs)).toBeGreaterThan(bounds.getCenter().lng);
    });

    it('should maintain track continuity across subdivision boundaries', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.0),
        L.latLng(52.0, 0.0)
      );
      const zoom = 12;
      const maxDim = 1000;

      // Create a track that crosses subdivision boundaries
      const trackPoints: [number, number][] = [
        [51.1, -0.9],
        [51.3, -0.7],
        [51.5, -0.5],
        [51.7, -0.3],
        [51.9, -0.1],
      ];

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      // Count how many subdivisions contain at least one track point
      let subdivisionsWithTrack = 0;

      subdivisions.forEach(subdivisionBounds => {
        const hasTrackPoint = trackPoints.some(([lat, lng]) =>
          subdivisionBounds.contains(L.latLng(lat, lng))
        );

        if (hasTrackPoint) {
          subdivisionsWithTrack++;
        }
      });

      // Track should span multiple subdivisions
      expect(subdivisionsWithTrack).toBeGreaterThan(1);
    });
  });

  describe('Rendering Quality', () => {
    it('should maintain zoom level across all subdivisions', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.5),
        L.latLng(52.0, 0.5)
      );
      const zoom = 13;
      const maxDim = 1500;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      subdivisions.forEach(subdivisionBounds => {
        const subContainer = document.createElement('div');
        subContainer.style.width = '800px';
        subContainer.style.height = '600px';
        document.body.appendChild(subContainer);

        const subMap = L.map(subContainer);
        subMap.setView(subdivisionBounds.getCenter(), zoom);

        // All maps should have the same zoom level
        expect(subMap.getZoom()).toBe(zoom);

        subMap.remove();
        document.body.removeChild(subContainer);
      });
    });

    it('should handle high-quality export zoom levels', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.3),
        L.latLng(51.7, 0.1)
      );
      const previewZoom = 12;
      const exportQuality = 3; // High quality
      const exportZoom = previewZoom + exportQuality; // 15
      const maxDim = 3000;

      const subdivisions = calculateSubdivisions(bounds, exportZoom, maxDim);

      // Should need subdivisions at this quality level
      expect(subdivisions.length).toBeGreaterThan(1);

      subdivisions.forEach(subdivisionBounds => {
        const dimensions = calculatePixelDimensions(subdivisionBounds, exportZoom);
        expect(dimensions.width).toBeLessThanOrEqual(maxDim);
        expect(dimensions.height).toBeLessThanOrEqual(maxDim);
      });
    });
  });

  describe('Canvas Support', () => {
    it('should support canvas rendering for each subdivision', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.5),
        L.latLng(51.7, 0.5)
      );
      const zoom = 12;
      const maxDim = 1200;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);

      subdivisions.forEach(subdivisionBounds => {
        const subContainer = document.createElement('div');
        subContainer.style.width = '600px';
        subContainer.style.height = '400px';
        document.body.appendChild(subContainer);

        const subMap = L.map(subContainer, { preferCanvas: true });
        subMap.setView(subdivisionBounds.getCenter(), zoom);

        // Add a polyline to test canvas rendering
        const polyline = L.polyline(
          [[51.55, -0.3], [51.6, -0.2], [51.65, -0.1]],
          { color: '#0000ff', weight: 5 }
        );
        polyline.addTo(subMap);

        expect(subMap.hasLayer(polyline)).toBe(true);

        subMap.remove();
        document.body.removeChild(subContainer);
      });
    });

    it('should create separate canvas contexts for each subdivision', () => {
      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.0),
        L.latLng(52.0, 0.0)
      );
      const zoom = 12;
      const maxDim = 1000;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);
      expect(subdivisions.length).toBeGreaterThan(1);

      // Each subdivision should be able to have its own canvas
      subdivisions.forEach(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;

        const ctx = canvas.getContext('2d');
        expect(ctx).not.toBeNull();
        expect(typeof ctx?.fillRect).toBe('function');
      });
    });
  });

  describe('Real Export Simulation', () => {
    it('should simulate multi-subdivision export workflow', async () => {
      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.5),
        L.latLng(52.0, 0.5)
      );
      const zoom = 13;
      const maxDim = 2000;

      const subdivisions = calculateSubdivisions(bounds, zoom, maxDim);
      expect(subdivisions.length).toBeGreaterThan(1);

      const trackPoints: [number, number][] = [
        [51.2, -1.3],
        [51.4, -1.0],
        [51.6, -0.7],
        [51.8, -0.4],
      ];

      // Simulate exporting each subdivision
      for (let i = 0; i < subdivisions.length; i++) {
        const subdivisionBounds = subdivisions[i];

        // Create container
        const subContainer = document.createElement('div');
        const dimensions = calculatePixelDimensions(subdivisionBounds, zoom);
        subContainer.style.width = `${dimensions.width}px`;
        subContainer.style.height = `${dimensions.height}px`;
        document.body.appendChild(subContainer);

        // Create map
        const subMap = L.map(subContainer, { preferCanvas: true });
        subMap.setView(subdivisionBounds.getCenter(), zoom);

        // Add base layer
        const tileLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { attribution: '' }
        );
        tileLayer.addTo(subMap);

        // Add track segments that fall within this subdivision
        const pointsInSubdivision = trackPoints.filter(([lat, lng]) =>
          subdivisionBounds.contains(L.latLng(lat, lng))
        );

        if (pointsInSubdivision.length > 0) {
          const polyline = L.polyline(pointsInSubdivision, {
            color: '#ff4500',
            weight: 3,
          });
          polyline.addTo(subMap);
        }

        // Verify rendering
        expect(subMap.getZoom()).toBe(zoom);
        expect(subMap.hasLayer(tileLayer)).toBe(true);

        // Clean up
        subMap.remove();
        document.body.removeChild(subContainer);

        // Small delay to simulate async rendering
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });
  });
});
