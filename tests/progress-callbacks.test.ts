/**
 * @jest-environment node
 */

import { renderCanvasForBounds, waitForRender, type RenderOptions } from '../utils/exportHelpers';
import type { Track } from '../types';

// Mock track data for testing
const createMockTrack = (): Track => ({
  id: '1',
  filename: 'test-track.gpx',
  color: '#ff0000',
  points: [
    { lat: 51.505, lng: -0.09 },
    { lat: 51.51, lng: -0.1 },
    { lat: 51.515, lng: -0.11 },
  ],
  distance: 1000,
  isVisible: true,
});

let L: typeof import('leaflet');
let container: HTMLDivElement;

describe('Progress Callbacks Integration Tests', () => {
  beforeEach(async () => {
    // Import leaflet-node to set up the environment
    const leafletNode = await import('leaflet-node');
    L = leafletNode.default;
    (global as any).L = L;

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
    // Skip tests that require network access and --experimental-vm-modules flag
    it.skip('should call onTileProgress callback during tile loading', async () => {
      const onTileProgress = jest.fn();

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.52, -0.08)
      );

      const options: RenderOptions = {
        bounds,
        layerType: 'base',
        zoomForRender: 10,
        tileLayerKey: 'esriImagery',
        onTileProgress,
      };

      await renderCanvasForBounds(options);

      // Tile progress should be called at least once
      expect(onTileProgress).toHaveBeenCalled();

      // Check that it was called with valid arguments
      const calls = onTileProgress.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // Verify callback arguments structure
      const [loaded, total] = calls[0];
      expect(typeof loaded).toBe('number');
      expect(typeof total).toBe('number');
      expect(loaded).toBeGreaterThanOrEqual(0);
      expect(total).toBeGreaterThanOrEqual(0);
    }, 30000); // Increase timeout for tile loading

    it.skip('should track tile loading progress over time', async () => {
      const progressUpdates: Array<{ loaded: number; total: number }> = [];
      const onTileProgress = jest.fn((loaded, total) => {
        progressUpdates.push({ loaded, total });
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.52, -0.08)
      );

      const options: RenderOptions = {
        bounds,
        layerType: 'base',
        zoomForRender: 10,
        tileLayerKey: 'esriImagery',
        onTileProgress,
      };

      await renderCanvasForBounds(options);

      // Should have multiple progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Loaded count should increase over time
      if (progressUpdates.length > 1) {
        const firstUpdate = progressUpdates[0];
        const lastUpdate = progressUpdates[progressUpdates.length - 1];

        // Last update should have more or equal loaded tiles
        expect(lastUpdate.loaded).toBeGreaterThanOrEqual(firstUpdate.loaded);
      }
    }, 30000);

    it.skip('should handle onTileProgress being undefined gracefully', async () => {
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.52, -0.08)
      );

      const options: RenderOptions = {
        bounds,
        layerType: 'base',
        zoomForRender: 10,
        tileLayerKey: 'esriImagery',
        // onTileProgress is undefined
      };

      // Should not throw
      await expect(renderCanvasForBounds(options)).resolves.toBeDefined();
    }, 30000);
  });

  describe('Line Progress Tracking', () => {
    it.skip('should call onLineProgress callback during line rendering', async () => {
      const onLineProgress = jest.fn();
      const track = createMockTrack();

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.12),
        L.latLng(51.52, -0.08)
      );

      const options: RenderOptions = {
        bounds,
        layerType: 'lines',
        zoomForRender: 10,
        visibleTracks: [track],
        lineThickness: 3,
        exportQuality: 2,
        onLineProgress,
      };

      await renderCanvasForBounds(options);

      // Line progress should be called at least once
      expect(onLineProgress).toHaveBeenCalled();

      // Check that it was called with valid arguments
      const calls = onLineProgress.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // Verify callback arguments structure
      const [checksCompleted, maxChecks] = calls[0];
      expect(typeof checksCompleted).toBe('number');
      expect(typeof maxChecks).toBe('number');
      expect(checksCompleted).toBeGreaterThan(0);
      expect(maxChecks).toBeGreaterThan(0);
      expect(checksCompleted).toBeLessThanOrEqual(maxChecks);
    }, 30000);

    it.skip('should track line rendering progress over time', async () => {
      const progressUpdates: Array<{ checksCompleted: number; maxChecks: number }> = [];
      const onLineProgress = jest.fn((checksCompleted, maxChecks) => {
        progressUpdates.push({ checksCompleted, maxChecks });
      });

      const track = createMockTrack();

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.12),
        L.latLng(51.52, -0.08)
      );

      const options: RenderOptions = {
        bounds,
        layerType: 'lines',
        zoomForRender: 10,
        visibleTracks: [track],
        lineThickness: 3,
        exportQuality: 2,
        onLineProgress,
      };

      await renderCanvasForBounds(options);

      // Should have multiple progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Checks completed should increase over time
      if (progressUpdates.length > 1) {
        const firstUpdate = progressUpdates[0];
        const lastUpdate = progressUpdates[progressUpdates.length - 1];

        // Last update should have more checks completed
        expect(lastUpdate.checksCompleted).toBeGreaterThanOrEqual(firstUpdate.checksCompleted);
      }
    }, 30000);

    it.skip('should handle onLineProgress being undefined gracefully', async () => {
      const track = createMockTrack();

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.12),
        L.latLng(51.52, -0.08)
      );

      const options: RenderOptions = {
        bounds,
        layerType: 'lines',
        zoomForRender: 10,
        visibleTracks: [track],
        lineThickness: 3,
        exportQuality: 2,
        // onLineProgress is undefined
      };

      // Should not throw
      await expect(renderCanvasForBounds(options)).resolves.toBeDefined();
    }, 30000);
  });

  describe('Combined Progress Tracking', () => {
    it.skip('should track both tile and line progress for combined renders', async () => {
      const tileProgressUpdates: Array<{ loaded: number; total: number }> = [];
      const lineProgressUpdates: Array<{ checksCompleted: number; maxChecks: number }> = [];

      const onTileProgress = jest.fn((loaded, total) => {
        tileProgressUpdates.push({ loaded, total });
      });

      const onLineProgress = jest.fn((checksCompleted, maxChecks) => {
        lineProgressUpdates.push({ checksCompleted, maxChecks });
      });

      const track = createMockTrack();

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.12),
        L.latLng(51.52, -0.08)
      );

      // First render base layer
      const baseOptions: RenderOptions = {
        bounds,
        layerType: 'base',
        zoomForRender: 10,
        tileLayerKey: 'esriImagery',
        onTileProgress,
      };

      await renderCanvasForBounds(baseOptions);

      // Then render lines layer
      const linesOptions: RenderOptions = {
        bounds,
        layerType: 'lines',
        zoomForRender: 10,
        visibleTracks: [track],
        lineThickness: 3,
        exportQuality: 2,
        onLineProgress,
      };

      await renderCanvasForBounds(linesOptions);

      // Both progress callbacks should have been called
      expect(tileProgressUpdates.length).toBeGreaterThan(0);
      expect(lineProgressUpdates.length).toBeGreaterThan(0);

      // Verify final state shows completion
      const lastTileUpdate = tileProgressUpdates[tileProgressUpdates.length - 1];
      expect(lastTileUpdate.loaded).toBeGreaterThan(0);

      const lastLineUpdate = lineProgressUpdates[lineProgressUpdates.length - 1];
      expect(lastLineUpdate.checksCompleted).toBeGreaterThan(0);
    }, 60000); // Longer timeout for combined render
  });

  describe('waitForRender Progress Integration', () => {
    it.skip('should propagate tile progress through waitForRender', async () => {
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

    it.skip('should propagate line progress through waitForRender', async () => {
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

      // Add polyline to map
      L.polyline(track.points as L.LatLngExpression[], {
        color: track.color,
        weight: 3,
        opacity: 0.8,
      }).addTo(map);

      await waitForRender({
        map,
        tileLayer: undefined,
        hasVectorLayers: true,
        onLineProgress,
      });

      expect(onLineProgress).toHaveBeenCalled();

      map.remove();
    }, 30000);
  });

  describe('Error Handling in Progress Callbacks', () => {
    it.skip('should continue rendering even if progress callback throws', async () => {
      const onTileProgress = jest.fn(() => {
        throw new Error('Test error in progress callback');
      });

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.52, -0.08)
      );

      const options: RenderOptions = {
        bounds,
        layerType: 'base',
        zoomForRender: 10,
        tileLayerKey: 'esriImagery',
        onTileProgress,
      };

      // Should still complete despite callback error
      // Note: This might fail depending on how errors are handled - adjust expectation if needed
      await expect(renderCanvasForBounds(options)).resolves.toBeDefined();
    }, 30000);
  });
});
