import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { waitForCanvasRenderer, waitForRender } from '../../utils/exportHelpers';

/**
 * Tests for render waiting functionality
 *
 * These tests verify that the export system properly waits for Leaflet to fully
 * render vector layers (polylines) before capturing the canvas.
 *
 * Note: Tests that require loading actual tiles from the internet are skipped
 * as they require --experimental-vm-modules flag. The core functionality
 * being tested is the canvas renderer waiting mechanism.
 */

describe('Render Waiting', () => {
  let L: any;
  let container: HTMLDivElement;
  let map: any;

  beforeEach(async () => {
    // Import leaflet-node dynamically
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
    await new Promise(resolve => setTimeout(resolve, 10));
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('waitForCanvasRenderer', () => {
    it('should resolve when vector layers are rendered', async () => {
      map = L.map(container, { preferCanvas: true });
      map.setView([51.505, -0.09], 13);

      // Add some polylines
      const trackPoints: [number, number][] = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ];

      L.polyline(trackPoints, {
        color: '#ff0000',
        weight: 3,
        opacity: 0.8,
      }).addTo(map);

      // Should complete without throwing
      await expect(waitForCanvasRenderer(map)).resolves.toBeUndefined();
    }, 65000);

    it('should resolve when no vector layers exist', async () => {
      map = L.map(container, { preferCanvas: true });
      map.setView([51.505, -0.09], 13);

      // No layers added - should resolve after max checks
      const startTime = Date.now();
      await waitForCanvasRenderer(map);
      const elapsed = Date.now() - startTime;

      // Should complete within timeout (uses maxChecks fallback)
      expect(elapsed).toBeLessThan(15000);
    }, 20000);

    it('should handle multiple polylines', async () => {
      map = L.map(container, { preferCanvas: true });
      map.setView([51.505, -0.09], 13);

      // Add multiple polylines with different colors
      const tracks = [
        { points: [[51.5, -0.1], [51.51, -0.09], [51.52, -0.08]], color: '#ff0000' },
        { points: [[51.49, -0.11], [51.50, -0.10], [51.51, -0.09]], color: '#00ff00' },
        { points: [[51.48, -0.12], [51.49, -0.11], [51.50, -0.10]], color: '#0000ff' },
      ];

      tracks.forEach((track) => {
        L.polyline(track.points as [number, number][], {
          color: track.color,
          weight: 3,
          opacity: 0.8,
        }).addTo(map);
      });

      // Should wait for all polylines to render
      await expect(waitForCanvasRenderer(map)).resolves.toBeUndefined();
    }, 65000);

    it('should handle thick polylines', async () => {
      map = L.map(container, { preferCanvas: true });
      map.setView([51.505, -0.09], 13);

      // Add a thick polyline (like export quality)
      const trackPoints: [number, number][] = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ];

      L.polyline(trackPoints, {
        color: '#ff4500',
        weight: 6, // Thick line like in export
        opacity: 0.8,
      }).addTo(map);

      await expect(waitForCanvasRenderer(map)).resolves.toBeUndefined();
    }, 65000);
  });

  describe('waitForRender', () => {
    it('should wait for vector layers only', async () => {
      map = L.map(container, { preferCanvas: true });
      map.setView([51.505, -0.09], 13);

      // Add polylines
      const trackPoints: [number, number][] = [
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ];

      L.polyline(trackPoints, {
        color: '#ff0000',
        weight: 3,
        opacity: 0.8,
      }).addTo(map);

      await expect(
        waitForRender({
          map,
          hasVectorLayers: true,
        })
      ).resolves.toBeUndefined();
    }, 65000);

    it('should handle empty map (no layers)', async () => {
      map = L.map(container, { preferCanvas: true });
      map.setView([51.505, -0.09], 13);

      // No layers added
      const startTime = Date.now();

      await expect(
        waitForRender({
          map,
          hasVectorLayers: false,
        })
      ).resolves.toBeUndefined();

      const elapsed = Date.now() - startTime;

      // Should complete quickly when no layers
      expect(elapsed).toBeLessThan(1000);
    }, 5000);

    it('should handle complex export scenario', async () => {
      // Simulate a real export scenario with multiple tracks
      map = L.map(container, { preferCanvas: true });
      map.setView([40.7128, -74.0060], 13); // New York

      // Add multiple tracks like a real GPX export
      const tracks = [
        {
          points: [
            [40.71, -74.01],
            [40.72, -74.00],
            [40.73, -73.99],
          ],
          color: '#ff4500',
        },
        {
          points: [
            [40.70, -74.02],
            [40.71, -74.01],
            [40.72, -74.00],
          ],
          color: '#0080ff',
        },
        {
          points: [
            [40.69, -74.03],
            [40.70, -74.02],
            [40.71, -74.01],
          ],
          color: '#00ff80',
        },
      ];

      tracks.forEach((track) => {
        L.polyline(track.points as [number, number][], {
          color: track.color,
          weight: 6, // Export quality thickness
          opacity: 0.8,
        }).addTo(map);
      });

      // Should handle multiple tracks properly
      await expect(
        waitForRender({
          map,
          hasVectorLayers: true,
        })
      ).resolves.toBeUndefined();
    }, 65000);
  });

  describe('Integration', () => {
    it('should handle rendering errors gracefully', async () => {
      map = L.map(container, { preferCanvas: true });
      map.setView([51.505, -0.09], 13);

      // Add polyline with potentially problematic coordinates
      L.polyline(
        [
          [90, 180],  // Edge of world coordinates
          [-90, -180],
        ],
        {
          color: '#ff0000',
          weight: 3,
          opacity: 0.8,
        }
      ).addTo(map);

      // Should still complete without errors
      await expect(
        waitForRender({
          map,
          hasVectorLayers: true,
        })
      ).resolves.toBeUndefined();
    }, 65000);

    it('should work with renderCanvasForBounds flow', async () => {
      // This test verifies the integration path that will be used in actual exports
      map = L.map(container, { preferCanvas: true });
      map.setView([40.7128, -74.0060], 13);

      // Add multiple polylines simulating actual export
      const tracks = [
        { points: [[40.71, -74.01], [40.72, -74.00]], color: '#ff4500' },
        { points: [[40.70, -74.02], [40.71, -74.01]], color: '#0080ff' },
      ];

      tracks.forEach((track) => {
        L.polyline(track.points as [number, number][], {
          color: track.color,
          weight: 6,
          opacity: 0.8,
        }).addTo(map);
      });

      // Verify the render waiter can handle this scenario
      await expect(
        waitForRender({
          map,
          hasVectorLayers: true,
        })
      ).resolves.toBeUndefined();
    }, 65000);
  });
});
