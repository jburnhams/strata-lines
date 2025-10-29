/**
 * Core Leaflet functionality tests focused on calculations and state management
 * These tests validate the parts of Leaflet that the app uses most heavily
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { setupLeafletEnvironment, createMapContainer, cleanupLeafletEnvironment } from './leaflet-setup';

let L: any;

describe('Leaflet Core - Map Operations', () => {
  beforeEach(() => {
    const setup = setupLeafletEnvironment();
    L = setup.L;
  });

  afterEach(() => {
    cleanupLeafletEnvironment();
  });

  it('should create and initialize a map', () => {
    const container = createMapContainer('core-map-1');
    const map = L.map(container).setView([51.505, -0.09], 13);

    expect(map).toBeDefined();
    expect(map.getCenter().lat).toBeCloseTo(51.505, 2);
    expect(map.getCenter().lng).toBeCloseTo(-0.09, 2);
    expect(map.getZoom()).toBe(13);

    map.remove();
  });

  it('should update map center and zoom', () => {
    const container = createMapContainer('core-map-2');
    const map = L.map(container).setView([51.505, -0.09], 13);

    map.setView([40.7128, -74.0060], 10);

    expect(map.getCenter().lat).toBeCloseTo(40.7128, 2);
    expect(map.getCenter().lng).toBeCloseTo(-74.0060, 2);
    expect(map.getZoom()).toBe(10);

    map.remove();
  });

  it('should handle zoom in and zoom out', () => {
    const container = createMapContainer('core-map-3');
    const map = L.map(container).setView([51.505, -0.09], 13);

    const initialZoom = map.getZoom();
    map.zoomIn();
    expect(map.getZoom()).toBe(initialZoom + 1);

    map.zoomOut();
    expect(map.getZoom()).toBe(initialZoom);

    map.remove();
  });

  it('should pan to new location', () => {
    const container = createMapContainer('core-map-4');
    const map = L.map(container).setView([51.505, -0.09], 13);

    map.panTo([51.51, -0.1]);

    const center = map.getCenter();
    expect(center.lat).toBeCloseTo(51.51, 2);
    expect(center.lng).toBeCloseTo(-0.1, 2);

    map.remove();
  });

  it('should calculate map bounds', () => {
    const container = createMapContainer('core-map-5');
    const map = L.map(container).setView([51.505, -0.09], 13);

    const bounds = map.getBounds();

    expect(bounds).toBeDefined();
    expect(bounds.isValid()).toBe(true);
    expect(bounds.getCenter().lat).toBeCloseTo(51.505, 1);
    expect(bounds.getCenter().lng).toBeCloseTo(-0.09, 1);

    map.remove();
  });
});

describe('Leaflet Core - LatLng and Bounds', () => {
  beforeEach(() => {
    const setup = setupLeafletEnvironment();
    L = setup.L;
  });

  afterEach(() => {
    cleanupLeafletEnvironment();
  });

  it('should create LatLng objects', () => {
    const latlng = L.latLng(51.5, -0.1);

    expect(latlng.lat).toBe(51.5);
    expect(latlng.lng).toBe(-0.1);
  });

  it('should calculate distance between LatLng points', () => {
    const point1 = L.latLng(51.5, -0.1);
    const point2 = L.latLng(51.6, 0.0);

    const distance = point1.distanceTo(point2);

    expect(distance).toBeGreaterThan(10000); // More than 10km
    expect(distance).toBeLessThan(20000); // Less than 20km
  });

  it('should create and validate bounds', () => {
    const bounds = L.latLngBounds(
      L.latLng(51.5, -0.1),
      L.latLng(51.6, 0.0)
    );

    expect(bounds.isValid()).toBe(true);
    expect(bounds.getSouth()).toBe(51.5);
    expect(bounds.getNorth()).toBe(51.6);
    expect(bounds.getWest()).toBe(-0.1);
    expect(bounds.getEast()).toBe(0.0);
  });

  it('should extend bounds with new coordinates', () => {
    const bounds = L.latLngBounds(
      L.latLng(51.5, -0.1),
      L.latLng(51.6, 0.0)
    );

    bounds.extend(L.latLng(51.7, 0.1));

    expect(bounds.getNorth()).toBe(51.7);
    expect(bounds.getEast()).toBe(0.1);
  });

  it('should check if point is within bounds', () => {
    const bounds = L.latLngBounds(
      L.latLng(51.5, -0.1),
      L.latLng(51.6, 0.0)
    );

    expect(bounds.contains(L.latLng(51.55, -0.05))).toBe(true);
    expect(bounds.contains(L.latLng(51.7, 0.1))).toBe(false);
  });

  it('should calculate bounds center', () => {
    const bounds = L.latLngBounds(
      L.latLng(51.5, -0.1),
      L.latLng(51.6, 0.0)
    );

    const center = bounds.getCenter();

    expect(center.lat).toBeCloseTo(51.55, 2);
    expect(center.lng).toBeCloseTo(-0.05, 2);
  });

  it('should check bounds intersection', () => {
    const bounds1 = L.latLngBounds(
      L.latLng(51.5, -0.1),
      L.latLng(51.6, 0.0)
    );

    const bounds2 = L.latLngBounds(
      L.latLng(51.55, -0.05),
      L.latLng(51.65, 0.05)
    );

    const bounds3 = L.latLngBounds(
      L.latLng(52.0, 1.0),
      L.latLng(52.1, 1.1)
    );

    expect(bounds1.intersects(bounds2)).toBe(true);
    expect(bounds1.intersects(bounds3)).toBe(false);
  });
});

describe('Leaflet Core - Polyline Bounds', () => {
  beforeEach(() => {
    const setup = setupLeafletEnvironment();
    L = setup.L;
  });

  afterEach(() => {
    cleanupLeafletEnvironment();
  });

  it('should create polyline with coordinates', () => {
    const latlngs = [
      [51.509, -0.08],
      [51.503, -0.06],
      [51.51, -0.047]
    ];

    const polyline = L.polyline(latlngs, { color: 'red' });

    expect(polyline).toBeDefined();
    expect(polyline.getLatLngs()).toHaveLength(3);
  });

  it('should calculate polyline bounds', () => {
    const latlngs = [
      [51.509, -0.08],
      [51.503, -0.06],
      [51.51, -0.047]
    ];

    const polyline = L.polyline(latlngs);
    const bounds = polyline.getBounds();

    expect(bounds.getSouth()).toBeCloseTo(51.503, 3);
    expect(bounds.getNorth()).toBeCloseTo(51.51, 3);
    expect(bounds.getWest()).toBeCloseTo(-0.08, 3);
    expect(bounds.getEast()).toBeCloseTo(-0.047, 3);
  });

  it('should update polyline coordinates', () => {
    const initialLatLngs = [
      [51.509, -0.08],
      [51.503, -0.06]
    ];

    const polyline = L.polyline(initialLatLngs);
    expect(polyline.getLatLngs()).toHaveLength(2);

    const newLatLngs = [
      [51.509, -0.08],
      [51.503, -0.06],
      [51.51, -0.047]
    ];

    polyline.setLatLngs(newLatLngs);
    expect(polyline.getLatLngs()).toHaveLength(3);
  });

  it('should handle multiple track bounds like the app does', () => {
    const track1Points = [[51.509, -0.08], [51.503, -0.06], [51.51, -0.047]];
    const track2Points = [[51.505, -0.09], [51.502, -0.075], [51.508, -0.055]];

    const polyline1 = L.polyline(track1Points);
    const polyline2 = L.polyline(track2Points);

    const bounds1 = polyline1.getBounds();
    const bounds2 = polyline2.getBounds();

    // Combine bounds like the app does
    const combinedBounds = bounds1.extend(bounds2);

    expect(combinedBounds.contains(bounds1.getCenter())).toBe(true);
    expect(combinedBounds.contains(bounds2.getCenter())).toBe(true);
  });
});

describe('Leaflet Core - Coordinate Projections', () => {
  beforeEach(() => {
    const setup = setupLeafletEnvironment();
    L = setup.L;
  });

  afterEach(() => {
    cleanupLeafletEnvironment();
  });

  it('should project and unproject coordinates', () => {
    const container = createMapContainer('proj-map-1');
    const map = L.map(container).setView([51.505, -0.09], 13);

    const latlng = L.latLng(51.505, -0.09);
    const point = map.project(latlng, map.getZoom());

    expect(point).toBeDefined();
    expect(point.x).toBeDefined();
    expect(point.y).toBeDefined();

    const unprojected = map.unproject(point, map.getZoom());

    expect(unprojected.lat).toBeCloseTo(latlng.lat, 5);
    expect(unprojected.lng).toBeCloseTo(latlng.lng, 5);

    map.remove();
  });

  it('should project at different zoom levels', () => {
    const container = createMapContainer('proj-map-2');
    const map = L.map(container).setView([51.505, -0.09], 13);

    const latlng = L.latLng(51.505, -0.09);

    const pointZoom10 = map.project(latlng, 10);
    const pointZoom15 = map.project(latlng, 15);

    // Higher zoom = larger pixel coordinates
    expect(pointZoom15.x).toBeGreaterThan(pointZoom10.x);
    expect(pointZoom15.y).toBeGreaterThan(pointZoom10.y);

    map.remove();
  });

  it('should handle latLngToContainerPoint', () => {
    const container = createMapContainer('proj-map-3');
    const map = L.map(container).setView([51.505, -0.09], 13);

    const center = map.getCenter();
    const point = map.latLngToContainerPoint(center);

    expect(point).toBeDefined();
    expect(point.x).toBeDefined();
    expect(point.y).toBeDefined();

    map.remove();
  });
});

describe('Leaflet Core - Map Events', () => {
  beforeEach(() => {
    const setup = setupLeafletEnvironment();
    L = setup.L;
  });

  afterEach(() => {
    cleanupLeafletEnvironment();
  });

  it('should register and fire moveend event', (done) => {
    const container = createMapContainer('event-map-1');
    const map = L.map(container).setView([51.505, -0.09], 13);

    map.once('moveend', () => {
      expect(map.getCenter().lat).toBeCloseTo(51.51, 2);
      map.remove();
      done();
    });

    map.setView([51.51, -0.1], 13);
  });

  it('should register and fire zoomend event', (done) => {
    const container = createMapContainer('event-map-2');
    const map = L.map(container).setView([51.505, -0.09], 13);

    map.once('zoomend', () => {
      expect(map.getZoom()).toBe(14);
      map.remove();
      done();
    });

    map.setZoom(14);
  });

  it('should handle whenReady callback', (done) => {
    const container = createMapContainer('event-map-3');
    const map = L.map(container).setView([51.505, -0.09], 13);

    map.whenReady(() => {
      expect(map.getZoom()).toBe(13);
      map.remove();
      done();
    });
  });
});
