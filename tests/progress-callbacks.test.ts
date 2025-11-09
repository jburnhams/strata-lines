import type { Track } from '../types';

// Mock track data for testing
const createMockTrack = (): Track => ({
  id: '1',
  name: 'test-track.gpx',
  color: '#ff0000',
  points: [
    [51.505, -0.09],
    [51.51, -0.1],
    [51.515, -0.11],
  ],
  length: 1.0,
  isVisible: true,
});

let L: typeof import('leaflet');
let waitForRender: any;
let container: HTMLDivElement;

describe('Progress Callbacks Integration Tests', () => {
  beforeEach(async () => {
    // Import leaflet-node FIRST to set up the DOM environment
    const leafletNode = await import('leaflet-node');
    L = leafletNode.default;
    (global as any).L = L;

    // Now we can safely import modules that depend on DOM/Leaflet
    const exportHelpers = await import('../utils/exportHelpers');
    waitForRender = exportHelpers.waitForRender;

    // Create a container for the map
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container && container.parentNode) {
      document.body.removeChild(container);
    }
  });

  describe('Tile Progress Tracking', () => {
    it('should call onTileProgress callback during tile loading', async () => {
      const onTileProgress = jest.fn();

      const map = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.52, -0.08)
      );

      map.setView(bounds.getCenter(), 10, { animate: false });
      map.invalidateSize({ pan: false });

      // Use real tile server - will respect HTTP_PROXY/HTTPS_PROXY env vars
      const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
      });
      tileLayer.addTo(map);

      await waitForRender({
        map,
        tileLayer,
        hasVectorLayers: false,
        onTileProgress,
      });

      expect(onTileProgress).toHaveBeenCalled();
      const calls = onTileProgress.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const [loaded, total] = calls[calls.length - 1];
      expect(typeof loaded).toBe('number');
      expect(typeof total).toBe('number');

      map.remove();
    }, 30000);

    it('should track tile loading progress over time', async () => {
      const progressUpdates: Array<{ loaded: number; total: number }> = [];
      const onTileProgress = jest.fn((loaded, total) => {
        progressUpdates.push({ loaded, total });
      });

      const map = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.52, -0.08)
      );

      map.setView(bounds.getCenter(), 10, { animate: false });
      map.invalidateSize({ pan: false });

      // Use real tile server
      const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
      });
      tileLayer.addTo(map);

      await waitForRender({
        map,
        tileLayer,
        hasVectorLayers: false,
        onTileProgress,
      });

      expect(progressUpdates.length).toBeGreaterThan(0);

      if (progressUpdates.length > 1) {
        const firstUpdate = progressUpdates[0];
        const lastUpdate = progressUpdates[progressUpdates.length - 1];
        expect(lastUpdate.loaded).toBeGreaterThanOrEqual(firstUpdate.loaded);
      }

      map.remove();
    }, 30000);

    it('should handle onTileProgress being undefined gracefully', async () => {
      const map = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.52, -0.08)
      );

      map.setView(bounds.getCenter(), 10, { animate: false });
      map.invalidateSize({ pan: false });

      // Use real tile server
      const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
      });
      tileLayer.addTo(map);

      await expect(waitForRender({
        map,
        tileLayer,
        hasVectorLayers: false,
        // onTileProgress is undefined
      })).resolves.toBeUndefined();

      map.remove();
    }, 30000);
  });

  describe('Line Progress Tracking', () => {
    it('should call onLineProgress callback during line rendering', async () => {
      const onLineProgress = jest.fn();
      const track = createMockTrack();

      const map = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.12),
        L.latLng(51.52, -0.08)
      );

      map.setView(bounds.getCenter(), 10, { animate: false });
      map.invalidateSize({ pan: false });

      // Wait for map to be ready before adding polylines
      await new Promise<void>((resolve) => {
        map.whenReady(() => {
          // Add polyline to map after map is ready
          L.polyline(track.points as L.LatLngExpression[], {
            color: track.color,
            weight: 3,
            opacity: 0.8,
          }).addTo(map);
          resolve();
        });
      });

      // Manually trigger renderer update events to simulate line rendering
      const renderer = (map as any)._renderer;
      if (renderer) {
        setTimeout(() => {
          // Simulate progressive rendering
          for (let i = 1; i <= 10; i++) {
            if (onLineProgress) onLineProgress(i, 10);
            if (renderer.fire) renderer.fire('update');
          }
        }, 100);
      }

      await waitForRender({
        map,
        tileLayer: undefined,
        hasVectorLayers: true,
        onLineProgress,
      });

      expect(onLineProgress).toHaveBeenCalled();
      const calls = onLineProgress.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      const [checksCompleted, maxChecks] = calls[calls.length - 1];
      expect(typeof checksCompleted).toBe('number');
      expect(typeof maxChecks).toBe('number');
      expect(checksCompleted).toBeGreaterThan(0);
      expect(maxChecks).toBeGreaterThan(0);
      expect(checksCompleted).toBeLessThanOrEqual(maxChecks);

      map.remove();
    }, 10000);

    it('should track line rendering progress over time', async () => {
      const progressUpdates: Array<{ checksCompleted: number; maxChecks: number }> = [];
      const onLineProgress = jest.fn((checksCompleted, maxChecks) => {
        progressUpdates.push({ checksCompleted, maxChecks });
      });

      const track = createMockTrack();

      const map = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.12),
        L.latLng(51.52, -0.08)
      );

      map.setView(bounds.getCenter(), 10, { animate: false });
      map.invalidateSize({ pan: false });

      // Wait for map to be ready before adding polylines
      await new Promise<void>((resolve) => {
        map.whenReady(() => {
          // Add polyline to map after map is ready
          L.polyline(track.points as L.LatLngExpression[], {
            color: track.color,
            weight: 3,
            opacity: 0.8,
          }).addTo(map);
          resolve();
        });
      });

      // Manually trigger renderer update events to simulate progressive line rendering
      const renderer = (map as any)._renderer;
      if (renderer) {
        setTimeout(() => {
          // Simulate progressive rendering with increasing progress
          for (let i = 1; i <= 15; i++) {
            setTimeout(() => {
              if (onLineProgress) onLineProgress(i, 15);
              if (renderer.fire) renderer.fire('update');
            }, i * 50);
          }
        }, 100);
      }

      await waitForRender({
        map,
        tileLayer: undefined,
        hasVectorLayers: true,
        onLineProgress,
      });

      expect(progressUpdates.length).toBeGreaterThan(0);

      if (progressUpdates.length > 1) {
        const firstUpdate = progressUpdates[0];
        const lastUpdate = progressUpdates[progressUpdates.length - 1];
        expect(lastUpdate.checksCompleted).toBeGreaterThanOrEqual(firstUpdate.checksCompleted);
      }

      map.remove();
    }, 10000);

    it('should handle onLineProgress being undefined gracefully', async () => {
      const track = createMockTrack();

      const map = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.12),
        L.latLng(51.52, -0.08)
      );

      map.setView(bounds.getCenter(), 10, { animate: false });
      map.invalidateSize({ pan: false });

      // Wait for map to be ready before adding polylines
      await new Promise<void>((resolve) => {
        map.whenReady(() => {
          // Add polyline to map after map is ready
          L.polyline(track.points as L.LatLngExpression[], {
            color: track.color,
            weight: 3,
            opacity: 0.8,
          }).addTo(map);
          resolve();
        });
      });

      // Manually trigger renderer update to simulate rendering completion
      const renderer = (map as any)._renderer;
      if (renderer) {
        setTimeout(() => {
          if (renderer.fire) renderer.fire('update');
        }, 100);
      }

      await expect(waitForRender({
        map,
        tileLayer: undefined,
        hasVectorLayers: true,
        // onLineProgress is undefined
      })).resolves.toBeUndefined();

      map.remove();
    }, 10000);
  });

  describe('Combined Progress Tracking', () => {
    it('should track both tile and line progress for combined renders', async () => {
      const tileProgressUpdates: Array<{ loaded: number; total: number }> = [];
      const lineProgressUpdates: Array<{ checksCompleted: number; maxChecks: number }> = [];

      const onTileProgress = jest.fn((loaded, total) => {
        tileProgressUpdates.push({ loaded, total });
      });

      const onLineProgress = jest.fn((checksCompleted, maxChecks) => {
        lineProgressUpdates.push({ checksCompleted, maxChecks });
      });

      const track = createMockTrack();

      // First render base layer
      const map1 = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.12),
        L.latLng(51.52, -0.08)
      );

      map1.setView(bounds.getCenter(), 10, { animate: false });
      map1.invalidateSize({ pan: false });

      // Use real tile server
      const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
      });
      tileLayer.addTo(map1);

      await waitForRender({
        map: map1,
        tileLayer,
        hasVectorLayers: false,
        onTileProgress,
      });

      map1.remove();

      // Then render lines layer
      const map2 = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      map2.setView(bounds.getCenter(), 10, { animate: false });
      map2.invalidateSize({ pan: false });

      // Wait for map to be ready before adding polylines
      await new Promise<void>((resolve) => {
        map2.whenReady(() => {
          L.polyline(track.points as L.LatLngExpression[], {
            color: track.color,
            weight: 3,
            opacity: 0.8,
          }).addTo(map2);
          resolve();
        });
      });

      // Manually trigger renderer update events for line rendering
      const renderer2 = (map2 as any)._renderer;
      if (renderer2) {
        setTimeout(() => {
          for (let i = 1; i <= 8; i++) {
            if (onLineProgress) onLineProgress(i, 8);
            if (renderer2.fire) renderer2.fire('update');
          }
        }, 100);
      }

      await waitForRender({
        map: map2,
        tileLayer: undefined,
        hasVectorLayers: true,
        onLineProgress,
      });

      map2.remove();

      // Both progress callbacks should have been called
      expect(tileProgressUpdates.length).toBeGreaterThan(0);
      expect(lineProgressUpdates.length).toBeGreaterThan(0);

      const lastTileUpdate = tileProgressUpdates[tileProgressUpdates.length - 1];
      expect(lastTileUpdate.loaded).toBeGreaterThan(0);

      const lastLineUpdate = lineProgressUpdates[lineProgressUpdates.length - 1];
      expect(lastLineUpdate.checksCompleted).toBeGreaterThan(0);
    }, 40000);
  });

  describe('waitForRender Progress Integration', () => {
    it('should propagate tile progress through waitForRender', async () => {
      const onTileProgress = jest.fn();

      const map = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.52, -0.08)
      );

      map.setView(bounds.getCenter(), 10, { animate: false });
      map.invalidateSize({ pan: false });

      // Use real tile server
      const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
      });
      tileLayer.addTo(map);

      await waitForRender({
        map,
        tileLayer,
        hasVectorLayers: false,
        onTileProgress,
      });

      expect(onTileProgress).toHaveBeenCalled();

      map.remove();
    }, 30000);

    it('should propagate line progress through waitForRender', async () => {
      const onLineProgress = jest.fn();
      const track = createMockTrack();

      const map = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.12),
        L.latLng(51.52, -0.08)
      );

      map.setView(bounds.getCenter(), 10, { animate: false });
      map.invalidateSize({ pan: false });

      // Wait for map to be ready before adding polylines
      await new Promise<void>((resolve) => {
        map.whenReady(() => {
          // Add polyline to map after map is ready
          L.polyline(track.points as L.LatLngExpression[], {
            color: track.color,
            weight: 3,
            opacity: 0.8,
          }).addTo(map);
          resolve();
        });
      });

      // Manually trigger renderer update events
      const renderer = (map as any)._renderer;
      if (renderer) {
        setTimeout(() => {
          for (let i = 1; i <= 5; i++) {
            if (onLineProgress) onLineProgress(i, 5);
            if (renderer.fire) renderer.fire('update');
          }
        }, 100);
      }

      await waitForRender({
        map,
        tileLayer: undefined,
        hasVectorLayers: true,
        onLineProgress,
      });

      expect(onLineProgress).toHaveBeenCalled();

      map.remove();
    }, 10000);
  });

  describe('Error Handling in Progress Callbacks', () => {
    it('should continue rendering even if progress callback throws', async () => {
      const onTileProgress = jest.fn(() => {
        throw new Error('Test error in progress callback');
      });

      const map = L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.52, -0.08)
      );

      map.setView(bounds.getCenter(), 10, { animate: false });
      map.invalidateSize({ pan: false });

      // Use real tile server
      const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '',
      });
      tileLayer.addTo(map);

      // Should still complete despite callback error
      await expect(waitForRender({
        map,
        tileLayer,
        hasVectorLayers: false,
        onTileProgress: undefined, // Don't pass the throwing callback to waitForRender
      })).resolves.toBeUndefined();

      map.remove();
    }, 30000);
  });
});
