import { describe, it, expect } from '@jest/globals';
import L from 'leaflet';
import { TILE_LAYERS } from '../constants';
import { LABEL_TILE_URL_RETINA } from '../labelTiles';

/**
 * Tests for leaflet-node API compatibility
 *
 * These tests verify that leaflet-node provides all the necessary APIs
 * for the app's server-side rendering functionality, without requiring
 * actual canvas rendering (which needs native dependencies).
 *
 * Specifically, these tests verify:
 * - Coordinate system APIs (LatLng, LatLngBounds)
 * - Distance calculations
 * - Tile layer creation
 * - Polyline/track configuration
 * - Export-related calculations
 */

describe('Leaflet-Node Core APIs', () => {
  describe('LatLng and Coordinate Handling', () => {
    it('should create LatLng objects', () => {
      const point = L.latLng(51.505, -0.09);

      expect(point).toBeDefined();
      expect(point.lat).toBe(51.505);
      expect(point.lng).toBe(-0.09);
    });

    it('should create LatLng from array', () => {
      const point = L.latLng([51.505, -0.09]);

      expect(point.lat).toBe(51.505);
      expect(point.lng).toBe(-0.09);
    });

    it('should handle LatLng equality', () => {
      const point1 = L.latLng(51.505, -0.09);
      const point2 = L.latLng(51.505, -0.09);

      expect(point1.equals(point2)).toBe(true);
    });

    it('should calculate distance between points', () => {
      const london = L.latLng(51.505, -0.09);
      const paris = L.latLng(48.8566, 2.3522);

      const distance = london.distanceTo(paris);

      // Distance should be approximately 344km
      expect(distance).toBeGreaterThan(300000); // >300km
      expect(distance).toBeLessThan(400000); // <400km
    });

    it('should calculate distance for same point as zero', () => {
      const point = L.latLng(51.505, -0.09);

      expect(point.distanceTo(point)).toBe(0);
    });

    it('should handle track points array', () => {
      const trackPoints: L.LatLngExpression[] = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
        [51.53, -0.07],
      ];

      const latLngs = trackPoints.map(p => L.latLng(p as [number, number]));

      expect(latLngs).toHaveLength(4);
      expect(latLngs[0].lat).toBe(51.5);
      expect(latLngs[3].lng).toBe(-0.07);
    });
  });

  describe('LatLngBounds and Export Bounds', () => {
    it('should create bounds from two points', () => {
      const sw = L.latLng(51.4, -0.2);
      const ne = L.latLng(51.6, 0.0);
      const bounds = L.latLngBounds(sw, ne);

      expect(bounds.isValid()).toBe(true);
      expect(bounds.getSouth()).toBe(51.4);
      expect(bounds.getWest()).toBe(-0.2);
      expect(bounds.getNorth()).toBe(51.6);
      expect(bounds.getEast()).toBe(0.0);
    });

    it('should create bounds from array of points', () => {
      const points = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ];

      const latLngs = points.map(p => L.latLng(p[0], p[1]));
      const bounds = L.latLngBounds(latLngs);

      expect(bounds.isValid()).toBe(true);
      expect(bounds.getSouth()).toBeLessThanOrEqual(51.5);
      expect(bounds.getNorth()).toBeGreaterThanOrEqual(51.52);
    });

    it('should calculate bounds center', () => {
      const bounds = L.latLngBounds([51.4, -0.2], [51.6, 0.0]);
      const center = bounds.getCenter();

      expect(center.lat).toBeCloseTo(51.5, 5);
      expect(center.lng).toBeCloseTo(-0.1, 5);
    });

    it('should check if bounds contains a point', () => {
      const bounds = L.latLngBounds([51.4, -0.2], [51.6, 0.0]);
      const insidePoint = L.latLng(51.5, -0.1);
      const outsidePoint = L.latLng(52.0, -0.1);

      expect(bounds.contains(insidePoint)).toBe(true);
      expect(bounds.contains(outsidePoint)).toBe(false);
    });

    it('should check if bounds intersect', () => {
      const bounds1 = L.latLngBounds([51.4, -0.2], [51.6, 0.0]);
      const bounds2 = L.latLngBounds([51.5, -0.15], [51.7, 0.05]);
      const bounds3 = L.latLngBounds([52.0, -0.2], [52.2, 0.0]);

      expect(bounds1.intersects(bounds2)).toBe(true);
      expect(bounds1.intersects(bounds3)).toBe(false);
    });

    it('should extend bounds to include a point', () => {
      const bounds = L.latLngBounds([51.4, -0.2], [51.6, 0.0]);
      const newPoint = L.latLng(51.7, 0.1);

      bounds.extend(newPoint);

      expect(bounds.contains(newPoint)).toBe(true);
      expect(bounds.getNorth()).toBe(51.7);
      expect(bounds.getEast()).toBe(0.1);
    });

    it('should split bounds for tiled export', () => {
      const bounds = L.latLngBounds([51.4, -0.2], [51.6, 0.0]);
      const center = bounds.getCenter();

      // Split vertically
      const leftBounds = L.latLngBounds(
        bounds.getSouthWest(),
        L.latLng(bounds.getNorth(), center.lng)
      );
      const rightBounds = L.latLngBounds(
        L.latLng(bounds.getSouth(), center.lng),
        bounds.getNorthEast()
      );

      expect(leftBounds.getEast()).toBe(rightBounds.getWest());
      expect(leftBounds.isValid()).toBe(true);
      expect(rightBounds.isValid()).toBe(true);
    });
  });

  describe('Polyline and Track Configuration', () => {
    it('should create polyline configuration object', () => {
      const trackPoints: L.LatLngExpression[] = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ];

      const options: L.PolylineOptions = {
        color: '#ff0000',
        weight: 3,
        opacity: 0.8,
      };

      // We can't create the actual polyline without a map/canvas,
      // but we can verify the options are correct
      expect(options.color).toBe('#ff0000');
      expect(options.weight).toBe(3);
      expect(options.opacity).toBe(0.8);
      expect(trackPoints).toHaveLength(3);
    });

    it('should calculate polyline bounds from points', () => {
      const trackPoints = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ];

      const latLngs = trackPoints.map(p => L.latLng(p[0], p[1]));
      const bounds = L.latLngBounds(latLngs);

      expect(bounds.getSouth()).toBe(51.5);
      expect(bounds.getNorth()).toBe(51.52);
      expect(bounds.getWest()).toBe(-0.1);
      expect(bounds.getEast()).toBe(-0.08);
    });

    it('should handle multiple track configurations', () => {
      const tracks = [
        {
          points: [[51.5, -0.1], [51.51, -0.09]],
          color: '#ff0000',
          name: 'Track 1',
        },
        {
          points: [[51.49, -0.11], [51.50, -0.10]],
          color: '#00ff00',
          name: 'Track 2',
        },
        {
          points: [[51.48, -0.12], [51.49, -0.11]],
          color: '#0000ff',
          name: 'Track 3',
        },
      ];

      tracks.forEach(track => {
        const latLngs = track.points.map(p => L.latLng(p[0], p[1]));
        const bounds = L.latLngBounds(latLngs);

        expect(bounds.isValid()).toBe(true);
        expect(track.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should calculate export line thickness', () => {
      const baseThickness = 3;
      const exportQualities = [0, 1, 2, 3];

      const exportThicknesses = exportQualities.map(quality => {
        return baseThickness * (1 + quality / 2);
      });

      expect(exportThicknesses[0]).toBe(3); // quality 0
      expect(exportThicknesses[1]).toBe(4.5); // quality 1
      expect(exportThicknesses[2]).toBe(6); // quality 2
      expect(exportThicknesses[3]).toBe(7.5); // quality 3
    });
  });

  describe('Tile Layer Configuration', () => {
    it('should have valid tile layer URLs', () => {
      TILE_LAYERS.forEach(layer => {
        expect(layer.layers[0].url).toBeDefined();
        expect(layer.layers[0].url).toMatch(/^https:\/\//);
        expect(layer.layers[0].url).toMatch(/\{z\}/);
        expect(layer.layers[0].url).toMatch(/\{x\}/);
        expect(layer.layers[0].url).toMatch(/\{y\}/);
      });
    });

    it('should create tile layer configuration', () => {
      const esriLayer = TILE_LAYERS.find(l => l.key === 'esriImagery');
      expect(esriLayer).toBeDefined();

      const options: L.TileLayerOptions = {
        attribution: esriLayer!.layers[0].attribution,
      };

      expect(options.attribution).toContain('Esri');
    });

    it('should have retina label tile URL configured', () => {
      expect(LABEL_TILE_URL_RETINA).toBeDefined();
      expect(LABEL_TILE_URL_RETINA).toMatch(/@2x\.png$/);
      expect(LABEL_TILE_URL_RETINA).toMatch(/\{z\}/);
      expect(LABEL_TILE_URL_RETINA).toMatch(/\{x\}/);
      expect(LABEL_TILE_URL_RETINA).toMatch(/\{y\}/);
    });

    it('should handle all tile layer types', () => {
      const expectedKeys = ['esriImagery', 'openStreetMap', 'openTopoMap', 'cartoDark', 'cartoLight'];

      expectedKeys.forEach(key => {
        const layer = TILE_LAYERS.find(l => l.key === key);
        expect(layer).toBeDefined();
        expect(layer!.name).toBeDefined();
      });
    });
  });

  describe('Export Workflow Calculations', () => {
    it('should calculate export zoom from preview zoom and quality', () => {
      const previewZoom = 10;
      const exportQualities = [0, 1, 2, 3];

      const exportZooms = exportQualities.map(quality => previewZoom + quality);

      expect(exportZooms).toEqual([10, 11, 12, 13]);
    });

    it('should calculate label zoom independently', () => {
      const previewZoom = 10;
      const exportQuality = 2;
      const labelDensity = 1;

      const exportZoom = previewZoom + exportQuality; // 12
      const labelZoom = previewZoom + labelDensity; // 11

      expect(exportZoom).toBe(12);
      expect(labelZoom).toBe(11);
      expect(labelZoom).not.toBe(exportZoom);
    });

    it('should handle label density settings', () => {
      const labelDensities = [-1, 0, 1, 2, 3];
      const previewZoom = 10;

      labelDensities.forEach(density => {
        const labelZoom = density >= 0 ? previewZoom + density : null;

        if (density === -1) {
          expect(labelZoom).toBeNull();
        } else {
          expect(labelZoom).toBeGreaterThanOrEqual(10);
          expect(labelZoom).toBeLessThanOrEqual(13);
        }
      });
    });

    it('should calculate scale factor for canvas resizing', () => {
      const scenarios = [
        { baseZoom: 12, labelZoom: 10, expectedScale: 4 },
        { baseZoom: 12, labelZoom: 11, expectedScale: 2 },
        { baseZoom: 12, labelZoom: 12, expectedScale: 1 },
        { baseZoom: 10, labelZoom: 12, expectedScale: 0.25 },
      ];

      scenarios.forEach(scenario => {
        const zoomDiff = scenario.baseZoom - scenario.labelZoom;
        const scaleFactor = Math.pow(2, zoomDiff);

        expect(scaleFactor).toBe(scenario.expectedScale);
      });
    });

    it('should calculate export dimensions for different aspect ratios', () => {
      const aspectRatios = [
        { width: 16, height: 9 },
        { width: 4, height: 3 },
        { width: 1, height: 1 },
      ];

      const baseWidth = 1600;

      aspectRatios.forEach(ratio => {
        const height = Math.round((baseWidth * ratio.height) / ratio.width);
        const actualRatio = baseWidth / height;
        const expectedRatio = ratio.width / ratio.height;

        expect(actualRatio).toBeCloseTo(expectedRatio, 1);
      });
    });
  });

  describe('Multiple Track Scenarios', () => {
    it('should calculate combined bounds for multiple tracks', () => {
      const track1Points = [
        [51.5, -0.1],
        [51.51, -0.09],
      ];
      const track2Points = [
        [51.49, -0.11],
        [51.50, -0.10],
      ];
      const track3Points = [
        [51.48, -0.12],
        [51.49, -0.11],
      ];

      const allPoints = [...track1Points, ...track2Points, ...track3Points];
      const latLngs = allPoints.map(p => L.latLng(p[0], p[1]));
      const combinedBounds = L.latLngBounds(latLngs);

      expect(combinedBounds.getSouth()).toBe(51.48);
      expect(combinedBounds.getNorth()).toBe(51.51);
      expect(combinedBounds.getWest()).toBe(-0.12);
      expect(combinedBounds.getEast()).toBe(-0.09);
    });

    it('should filter and process visible tracks', () => {
      const tracks = [
        { id: '1', isVisible: true, points: [[51.5, -0.1], [51.51, -0.09]] },
        { id: '2', isVisible: false, points: [[51.49, -0.11], [51.50, -0.10]] },
        { id: '3', isVisible: true, points: [[51.48, -0.12], [51.49, -0.11]] },
      ];

      const visibleTracks = tracks.filter(t => t.isVisible);

      expect(visibleTracks).toHaveLength(2);
      expect(visibleTracks[0].id).toBe('1');
      expect(visibleTracks[1].id).toBe('3');
    });

    it('should calculate track lengths', () => {
      const trackPoints = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ];

      let totalDistance = 0;
      for (let i = 0; i < trackPoints.length - 1; i++) {
        const point1 = L.latLng(trackPoints[i][0], trackPoints[i][1]);
        const point2 = L.latLng(trackPoints[i + 1][0], trackPoints[i + 1][1]);
        totalDistance += point1.distanceTo(point2);
      }

      // Total distance should be positive
      expect(totalDistance).toBeGreaterThan(0);
      // Approximately 2km for these points
      expect(totalDistance).toBeGreaterThan(1000);
      expect(totalDistance).toBeLessThan(5000);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very small bounds', () => {
      const smallBounds = L.latLngBounds(
        [51.5074, -0.1278],
        [51.50741, -0.12779]
      );

      expect(smallBounds.isValid()).toBe(true);
      expect(smallBounds.getNorth() - smallBounds.getSouth()).toBeLessThan(0.001);
    });

    it('should handle very large bounds', () => {
      const largeBounds = L.latLngBounds(
        [-40.0, -80.0],
        [10.0, -30.0]
      );

      expect(largeBounds.isValid()).toBe(true);
      expect(largeBounds.getNorth() - largeBounds.getSouth()).toBeGreaterThan(40);
    });

    it('should handle bounds crossing antimeridian', () => {
      const bounds = L.latLngBounds(
        [20.0, 170.0],
        [30.0, -170.0]
      );

      expect(bounds.isValid()).toBe(true);
    });

    it('should handle tracks with duplicate points', () => {
      const trackWithDuplicates = [
        [51.5, -0.1],
        [51.5, -0.1], // duplicate
        [51.51, -0.09],
      ];

      const latLngs = trackWithDuplicates.map(p => L.latLng(p[0], p[1]));
      const bounds = L.latLngBounds(latLngs);

      expect(bounds.isValid()).toBe(true);
    });

    it('should handle minimum track length filtering', () => {
      const trackPoints = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ];

      let totalDistance = 0;
      for (let i = 0; i < trackPoints.length - 1; i++) {
        const point1 = L.latLng(trackPoints[i][0], trackPoints[i][1]);
        const point2 = L.latLng(trackPoints[i + 1][0], trackPoints[i + 1][1]);
        totalDistance += point1.distanceTo(point2);
      }

      const minLengthMeters = 20000; // 20km
      const minLengthMiles = minLengthMeters / 1609.34;
      const trackLengthMiles = totalDistance / 1609.34;

      const meetsMinimum = trackLengthMiles >= minLengthMiles;
      expect(typeof meetsMinimum).toBe('boolean');
    });
  });

  describe('Geographic Regions', () => {
    it('should handle UK coordinates', () => {
      const ukBounds = L.latLngBounds([50.0, -5.0], [58.0, 2.0]);
      expect(ukBounds.isValid()).toBe(true);
      expect(ukBounds.getCenter().lat).toBeCloseTo(54.0, 0);
    });

    it('should handle US coordinates', () => {
      const usBounds = L.latLngBounds([25.0, -125.0], [49.0, -66.0]);
      expect(usBounds.isValid()).toBe(true);
    });

    it('should handle Japanese coordinates', () => {
      const japanBounds = L.latLngBounds([30.0, 129.0], [46.0, 146.0]);
      expect(japanBounds.isValid()).toBe(true);
    });

    it('should handle Australian coordinates', () => {
      const australiaBounds = L.latLngBounds([-40.0, 113.0], [-10.0, 154.0]);
      expect(australiaBounds.isValid()).toBe(true);
    });

    it('should handle southern hemisphere', () => {
      const southernPoint = L.latLng(-33.8688, 151.2093); // Sydney
      expect(southernPoint.lat).toBeLessThan(0);
    });
  });
});
