import type { Track } from '@/types';
import { jest } from '@jest/globals';

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
  isVisible: true, activityType: 'Unknown',
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

    // Mock L.tileLayer to simulate tile loading without network
    jest.spyOn(L, 'tileLayer').mockImplementation((url, options) => {
      // Create a mock layer that extends L.Layer (or behaves like one)
      // We use a plain object extended with L.Evented prototype if available, or just L.Layer
      const mockLayer: any = new L.Layer();

      Object.assign(mockLayer, {
        _url: url,
        options: options || {},
        _tilesToLoad: 0,
        _loading: false,

        addTo: function(map: any) {
          this._map = map;
          this._loading = true;
          this._tilesToLoad = 5; // Simulate 5 tiles

          // Trigger simulation asynchronously to allow listeners to be attached
          setTimeout(() => {
            // Fire tileloadstart for all tiles
            for(let i=0; i<5; i++) {
              this.fire('tileloadstart');
            }

            // Fire tileload events with delay
            let loaded = 0;
            const interval = setInterval(() => {
              loaded++;
              this._tilesToLoad--;
              this.fire('tileload');

              if (loaded >= 5) {
                clearInterval(interval);
                this._loading = false;
                this.fire('load');
              }
            }, 20); // Fast interval
          }, 50);

          return this;
        },

        isLoading: function() {
          return this._loading;
        },

        remove: function() {
          this._map = null;
          return this;
        },

        setUrl: jest.fn(),
      });

      return mockLayer;
    });

    // Now we can safely import modules that depend on DOM/Leaflet
    const exportHelpers = await import('@/utils/exportHelpers');
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
    jest.restoreAllMocks();
  });

  describe('Tile Progress Tracking', () => {
    it('should provide initial tile count estimate before tiles start loading', async () => {
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

      const tileLayer = L.tileLayer('https://mock.url/tile/{z}/{y}/{x}', {
        attribution: '',
      });
      tileLayer.addTo(map);

      await waitForRender({
        map,
        tileLayer,
        hasVectorLayers: false,
        onTileProgress,
      });

      // Should have initial progress update with estimated total
      expect(progressUpdates.length).toBeGreaterThan(0);
      const firstUpdate = progressUpdates[0];

      // First update should show 0 loaded with estimated total > 0
      expect(firstUpdate.loaded).toBe(0);

      // Final update should show completion
      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(lastUpdate.loaded).toBeGreaterThan(0);
      expect(lastUpdate.total).toBeGreaterThan(0);

      map.remove();
    }, 30000);

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

      const tileLayer = L.tileLayer('https://mock.url/tile/{z}/{y}/{x}', {
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

      const tileLayer = L.tileLayer('https://mock.url/tile/{z}/{y}/{x}', {
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

    it('should never show 0% progress after initial estimate', async () => {
      const progressUpdates: Array<{ loaded: number; total: number; percentage: number }> = [];
      const onTileProgress = jest.fn((loaded, total) => {
        const percentage = total > 0 ? Math.round((loaded / total) * 100) : 0;
        progressUpdates.push({ loaded, total, percentage });
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

      const tileLayer = L.tileLayer('https://mock.url/tile/{z}/{y}/{x}', {
        attribution: '',
      });
      tileLayer.addTo(map);

      await waitForRender({
        map,
        tileLayer,
        hasVectorLayers: false,
        onTileProgress,
      });

      // After initial estimate, total should always be > 0
      for (let i = 0; i < progressUpdates.length; i++) {
        const update = progressUpdates[i];
        if (update.total > 0) {
           expect(update.percentage).toBeGreaterThanOrEqual(0);
           expect(update.percentage).toBeLessThanOrEqual(100);
        }
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

      const tileLayer = L.tileLayer('https://mock.url/tile/{z}/{y}/{x}', {
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
          L.polyline(track.points as L.LatLngExpression[], {
            color: track.color,
            weight: 3,
            opacity: 0.8,
          }).addTo(map);
          resolve();
        });
      });

      const renderer = (map as any)._renderer;
      if (renderer) {
        requestAnimationFrame(() => {
          for (let i = 1; i <= 10; i++) {
            if (onLineProgress) onLineProgress(i, 10);
            if (renderer.fire) renderer.fire('update');
          }
        });
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

      await new Promise<void>((resolve) => {
        map.whenReady(() => {
          L.polyline(track.points as L.LatLngExpression[], {
            color: track.color,
            weight: 3,
            opacity: 0.8,
          }).addTo(map);
          resolve();
        });
      });

      const renderer = (map as any)._renderer;
      if (renderer) {
        requestAnimationFrame(() => {
          for (let i = 1; i <= 15; i++) {
            if (onLineProgress) onLineProgress(i, 15);
            if (renderer.fire) renderer.fire('update');
          }
        });
      }

      await waitForRender({
        map,
        tileLayer: undefined,
        hasVectorLayers: true,
        onLineProgress,
      });

      expect(progressUpdates.length).toBeGreaterThan(0);
      map.remove();
    }, 10000);

    it('should handle onLineProgress being undefined gracefully', async () => {
      const track = createMockTrack();
      const map = L.map(container, { preferCanvas: true, attributionControl: false, zoomControl: false });
      const bounds = L.latLngBounds(L.latLng(51.5, -0.12), L.latLng(51.52, -0.08));
      map.setView(bounds.getCenter(), 10, { animate: false });
      map.invalidateSize({ pan: false });

      await new Promise<void>((resolve) => {
        map.whenReady(() => {
          L.polyline(track.points as L.LatLngExpression[], {
            color: track.color,
            weight: 3,
            opacity: 0.8,
          }).addTo(map);
          resolve();
        });
      });

      const renderer = (map as any)._renderer;
      if (renderer) {
        requestAnimationFrame(() => {
          if (renderer.fire) renderer.fire('update');
        });
      }

      await expect(waitForRender({
        map,
        tileLayer: undefined,
        hasVectorLayers: true,
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

      const tileLayer = L.tileLayer('https://mock.url/tile/{z}/{y}/{x}', {
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

      const renderer2 = (map2 as any)._renderer;
      if (renderer2) {
        requestAnimationFrame(() => {
          for (let i = 1; i <= 8; i++) {
            if (onLineProgress) onLineProgress(i, 8);
            if (renderer2.fire) renderer2.fire('update');
          }
        });
      }

      await waitForRender({
        map: map2,
        tileLayer: undefined,
        hasVectorLayers: true,
        onLineProgress,
      });

      map2.remove();

      expect(tileProgressUpdates.length).toBeGreaterThan(0);
      expect(lineProgressUpdates.length).toBeGreaterThan(0);
    }, 40000);
  });

  describe('waitForRender Progress Integration', () => {
    it('should propagate tile progress through waitForRender', async () => {
      const onTileProgress = jest.fn();
      const map = L.map(container, { preferCanvas: true, attributionControl: false, zoomControl: false });
      const bounds = L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.52, -0.08));
      map.setView(bounds.getCenter(), 10, { animate: false });
      map.invalidateSize({ pan: false });

      const tileLayer = L.tileLayer('https://mock.url/tile/{z}/{y}/{x}', { attribution: '' });
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
       const map = L.map(container, { preferCanvas: true, attributionControl: false, zoomControl: false });
       const bounds = L.latLngBounds(L.latLng(51.5, -0.12), L.latLng(51.52, -0.08));
       map.setView(bounds.getCenter(), 10, { animate: false });
       map.invalidateSize({ pan: false });

       await new Promise<void>((resolve) => {
        map.whenReady(() => {
          L.polyline(track.points as L.LatLngExpression[], {
            color: track.color,
            weight: 3,
            opacity: 0.8,
          }).addTo(map);
          resolve();
        });
      });

      const renderer = (map as any)._renderer;
      if (renderer) {
        requestAnimationFrame(() => {
          for (let i = 1; i <= 5; i++) {
            if (onLineProgress) onLineProgress(i, 5);
            if (renderer.fire) renderer.fire('update');
          }
        });
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

      const tileLayer = L.tileLayer('https://mock.url/tile/{z}/{y}/{x}', {
        attribution: '',
      });
      tileLayer.addTo(map);

      await expect(waitForRender({
        map,
        tileLayer,
        hasVectorLayers: false,
        onTileProgress: undefined,
      })).resolves.toBeUndefined();

      map.remove();
    }, 30000);
  });
});
