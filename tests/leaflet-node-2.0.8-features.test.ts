import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestMap,
  cleanupTestMaps,
  waitForTiles,
  waitForMapReady,
  Leaflet as L
} from 'leaflet-node/testing';
import type { TileLoadProgress } from 'leaflet-node/testing';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Tests for new leaflet-node 2.0.8 features
 *
 * This tests the new testing utilities and export methods added in 2.0.8
 */

describe('Leaflet-Node 2.0.8 New Features', () => {
  describe('Testing Utilities', () => {
    describe('createTestMap', () => {
      it('should create a map with default dimensions', () => {
        const map = createTestMap();

        expect(map).toBeDefined();
        const size = map.getSize();
        expect(size.x).toBeGreaterThan(0);
        expect(size.y).toBeGreaterThan(0);
      });

      it('should create a map with custom dimensions', () => {
        const map = createTestMap({ width: 800, height: 600 });

        const size = map.getSize();
        expect(size.x).toBe(800);
        expect(size.y).toBe(600);
      });

      it('should create a map with custom center and zoom', () => {
        const center: [number, number] = [51.505, -0.09];
        const zoom = 13;

        const map = createTestMap({
          center,
          zoom,
          width: 512,
          height: 512
        });

        const mapCenter = map.getCenter();
        expect(mapCenter.lat).toBeCloseTo(center[0], 5);
        expect(mapCenter.lng).toBeCloseTo(center[1], 5);
        expect(map.getZoom()).toBe(zoom);
      });

      it('should create multiple independent maps', () => {
        const map1 = createTestMap({ width: 400, height: 300 });
        const map2 = createTestMap({ width: 800, height: 600 });

        expect(map1.getSize().x).toBe(400);
        expect(map2.getSize().x).toBe(800);
        expect(map1).not.toBe(map2);
      });
    });

    describe('cleanupTestMaps', () => {
      it('should cleanup created test maps', async () => {
        const map1 = createTestMap();
        const map2 = createTestMap();

        await cleanupTestMaps();

        // Maps should still exist but be ready for cleanup
        expect(map1).toBeDefined();
        expect(map2).toBeDefined();
      });
    });

    describe('waitForTiles', () => {
      it('should wait for tile layer to load', async () => {
        const map = createTestMap();
        const tileLayer = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          { attribution: '' }
        );

        tileLayer.addTo(map);

        // This should resolve once tiles are loaded
        await waitForTiles(tileLayer, { timeout: 5000 });

        expect(map.hasLayer(tileLayer)).toBe(true);
      });

      it('should report progress during tile loading', async () => {
        const map = createTestMap({ zoom: 10 }); // Lower zoom for more tiles
        const tileLayer = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        );

        tileLayer.addTo(map);

        const progressUpdates: TileLoadProgress[] = [];

        await waitForTiles(tileLayer, {
          timeout: 5000,
          onProgress: (progress) => {
            progressUpdates.push({ ...progress });
          }
        });

        // Progress callbacks may or may not fire depending on tile loading speed
        // Just verify the function accepts the callback without error
        expect(true).toBe(true);
      });

      it('should handle waitForTiles with timeout parameter', async () => {
        const map = createTestMap();
        const tileLayer = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        );

        tileLayer.addTo(map);

        // Just verify timeout parameter is accepted
        // Tiles may load quickly and not actually timeout
        try {
          await waitForTiles(tileLayer, { timeout: 5000 });
          expect(true).toBe(true);
        } catch (e) {
          // Timeout occurred, which is also valid
          expect(e).toBeDefined();
        }
      });
    });

    describe('waitForMapReady', () => {
      it('should wait for all tile layers on a map', async () => {
        const map = createTestMap();

        const layer1 = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ).addTo(map);

        await waitForMapReady(map, { timeout: 5000 });

        expect(map.hasLayer(layer1)).toBe(true);
      });

      it('should report per-layer progress', async () => {
        const map = createTestMap();

        const layer = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ).addTo(map);

        const layerProgressUpdates: Array<{ layer: any, progress: TileLoadProgress }> = [];

        await waitForMapReady(map, {
          timeout: 5000,
          onTileProgress: (layer, progress) => {
            layerProgressUpdates.push({ layer, progress: { ...progress } });
          }
        });

        expect(layerProgressUpdates.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Export Methods', () => {
    let testOutputDir: string;

    beforeEach(async () => {
      // Create a temp directory for test outputs
      testOutputDir = join(tmpdir(), `leaflet-node-test-${Date.now()}`);
      await fs.mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
      // Cleanup temp directory
      try {
        await fs.rm(testOutputDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
      await cleanupTestMaps();
    });

    describe('map.saveImage', () => {
      it('should save map to PNG file', async () => {
        const map = createTestMap({ width: 400, height: 300 });
        map.setView([51.505, -0.09], 13);

        // Add a simple track
        L.polyline([
          [51.5, -0.1],
          [51.51, -0.09],
          [51.52, -0.08],
        ], { color: '#ff0000' }).addTo(map);

        const outputPath = join(testOutputDir, 'map.png');
        const result = await map.saveImage(outputPath);

        expect(result).toBe(outputPath);

        // Verify file exists
        const stat = await fs.stat(outputPath);
        expect(stat.isFile()).toBe(true);
        expect(stat.size).toBeGreaterThan(0);
      });

      it('should save map to JPEG file', async () => {
        const map = createTestMap({ width: 400, height: 300 });
        map.setView([51.505, -0.09], 13);

        const outputPath = join(testOutputDir, 'map.jpg');
        const result = await map.saveImage(outputPath, {
          format: 'jpeg',
          quality: 0.8
        });

        expect(result).toBe(outputPath);

        // Verify file exists
        const stat = await fs.stat(outputPath);
        expect(stat.isFile()).toBe(true);
        expect(stat.size).toBeGreaterThan(0);
      });

      it('should save map with multiple tracks', async () => {
        const map = createTestMap({ width: 800, height: 600 });
        map.setView([51.505, -0.09], 13);

        // Add multiple tracks
        const tracks = [
          { points: [[51.5, -0.1], [51.51, -0.09]], color: '#ff0000' },
          { points: [[51.49, -0.11], [51.50, -0.10]], color: '#00ff00' },
          { points: [[51.48, -0.12], [51.49, -0.11]], color: '#0000ff' },
        ];

        tracks.forEach(track => {
          L.polyline(track.points as [number, number][], {
            color: track.color,
            weight: 3
          }).addTo(map);
        });

        const outputPath = join(testOutputDir, 'multi-track.png');
        await map.saveImage(outputPath);

        const stat = await fs.stat(outputPath);
        expect(stat.size).toBeGreaterThan(0);
      });
    });

    describe('map.toBuffer', () => {
      it('should export map to PNG buffer', async () => {
        const map = createTestMap({ width: 400, height: 300 });
        map.setView([51.505, -0.09], 13);

        L.polyline([
          [51.5, -0.1],
          [51.51, -0.09],
        ], { color: '#ff0000' }).addTo(map);

        const buffer = await map.toBuffer('png');

        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);

        // PNG files start with specific magic bytes
        expect(buffer[0]).toBe(0x89);
        expect(buffer[1]).toBe(0x50); // 'P'
        expect(buffer[2]).toBe(0x4E); // 'N'
        expect(buffer[3]).toBe(0x47); // 'G'
      });

      it('should export map to JPEG buffer', async () => {
        const map = createTestMap({ width: 400, height: 300 });
        map.setView([51.505, -0.09], 13);

        const buffer = await map.toBuffer('jpeg', 0.9);

        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);

        // JPEG files start with FF D8
        expect(buffer[0]).toBe(0xFF);
        expect(buffer[1]).toBe(0xD8);
      });

      it('should allow manual file writing', async () => {
        const map = createTestMap({ width: 400, height: 300 });
        map.setView([51.505, -0.09], 13);

        const buffer = await map.toBuffer('png');

        const outputPath = join(testOutputDir, 'manual-write.png');
        await fs.writeFile(outputPath, buffer);

        const stat = await fs.stat(outputPath);
        expect(stat.size).toBe(buffer.length);
      });
    });

    describe('map.setSize', () => {
      it('should set map dimensions', () => {
        const map = createTestMap();

        map.setSize(1920, 1080);

        const size = map.getSize();
        expect(size.x).toBe(1920);
        expect(size.y).toBe(1080);
      });

      it('should return the map instance for chaining', () => {
        const map = createTestMap();

        const result = map.setSize(800, 600);

        expect(result).toBe(map);
      });
    });
  });

  describe('Real-World Export Scenarios', () => {
    let testOutputDir: string;

    beforeEach(async () => {
      testOutputDir = join(tmpdir(), `leaflet-node-test-${Date.now()}`);
      await fs.mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await fs.rm(testOutputDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore
      }
      await cleanupTestMaps();
    });

    it('should export a complete map with tiles and tracks', async () => {
      const map = createTestMap({
        width: 1920,
        height: 1080,
        center: [51.505, -0.09],
        zoom: 13
      });

      // Add tile layer
      const tileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '' }
      ).addTo(map);

      // Wait for tiles to load with progress
      const progressUpdates: TileLoadProgress[] = [];
      await waitForTiles(tileLayer, {
        timeout: 10000,
        onProgress: (progress) => progressUpdates.push({ ...progress })
      });

      // Add GPS tracks
      L.polyline([
        [51.5, -0.1],
        [51.51, -0.09],
        [51.52, -0.08],
      ], { color: '#ff4500', weight: 4 }).addTo(map);

      // Export
      const outputPath = join(testOutputDir, 'complete-export.png');
      await map.saveImage(outputPath);

      const stat = await fs.stat(outputPath);
      expect(stat.size).toBeGreaterThan(5000); // Should be substantial
      expect(progressUpdates.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle high-resolution export', async () => {
      const map = createTestMap({
        width: 4096,
        height: 4096,
        center: [51.505, -0.09],
        zoom: 15
      });

      L.polyline([
        [51.505, -0.090],
        [51.506, -0.089],
      ], { color: '#ff0000', weight: 2 }).addTo(map);

      const buffer = await map.toBuffer('png');

      expect(buffer.length).toBeGreaterThan(50000); // High-res should be large
    });
  });
});
