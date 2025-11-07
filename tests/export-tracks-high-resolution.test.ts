/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestMap,
  cleanupTestMaps,
  Leaflet as L
} from 'leaflet-node/testing';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadImage } from '@napi-rs/canvas';

/**
 * Integration test for track rendering at high resolutions
 *
 * This test reproduces the issue where tracks are missing from exports at higher
 * quality levels (higher zoom/resolution), especially when exporting tracks by themselves.
 *
 * The issue is likely a timing problem where tracks aren't fully rendered on the canvas
 * before the export is captured.
 */

describe('Track Export at High Resolution', () => {
  let testOutputDir: string;

  beforeEach(async () => {
    // Create a temp directory for test outputs
    testOutputDir = join(tmpdir(), `track-export-test-${Date.now()}`);
    await fs.mkdir(testOutputDir, { recursive: true });
    console.log(`Test output directory: ${testOutputDir}`);
  });

  afterEach(async () => {
    // Keep the test output directory for inspection - don't cleanup
    // This allows manual verification of whether tracks are rendered
    console.log(`Test images saved in: ${testOutputDir}`);
    await cleanupTestMaps();
  });

  /**
   * Helper function to wait for canvas rendering to complete
   * This simulates the browser's rendering pipeline
   */
  const waitForCanvasRender = async (map: any, delayMs: number = 500): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, delayMs));
  };

  /**
   * Helper to check if specific colors are present in the exported image
   * This verifies that tracks are actually rendered, not just that the file exists
   */
  const checkForTrackColors = async (imagePath: string, expectedColors: string[]): Promise<{ found: boolean; details: string }> => {
    const buffer = await fs.readFile(imagePath);
    const img = await loadImage(buffer);

    // Access the canvas from the map to read pixels
    // For leaflet-node, we need to get the actual canvas element
    const canvas = (global as any).document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Convert expected hex colors to RGB
    const expectedRGB = expectedColors.map(hex => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b, hex };
    });

    // Track which colors we found
    const foundColors = new Set<string>();

    // Sample pixels throughout the image
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // Only check non-transparent pixels
      if (a > 128) {
        // Check if this pixel matches any of our expected colors (with some tolerance)
        for (const color of expectedRGB) {
          const tolerance = 30; // Allow some color variation
          if (Math.abs(r - color.r) <= tolerance &&
              Math.abs(g - color.g) <= tolerance &&
              Math.abs(b - color.b) <= tolerance) {
            foundColors.add(color.hex);
          }
        }
      }
    }

    const allColorsFound = expectedColors.every(c => foundColors.has(c));
    return {
      found: allColorsFound,
      details: `Found ${foundColors.size}/${expectedColors.length} colors: ${Array.from(foundColors).join(', ')}`
    };
  };

  it('should render tracks at low resolution (baseline)', async () => {
    const previewZoom = 10;
    const exportQuality = 0; // Low quality
    const exportZoom = previewZoom + exportQuality;

    const map = createTestMap({
      width: 800,
      height: 600
    });
    map.setView([51.505, -0.09], exportZoom);

    // Add test tracks
    const tracks = [
      { points: [[51.50, -0.10], [51.51, -0.09], [51.52, -0.08]], color: '#ff4500' },
      { points: [[51.48, -0.11], [51.49, -0.10], [51.50, -0.09]], color: '#0000ff' },
    ];

    const baseThickness = 3;
    const exportLineThickness = baseThickness * (1 + exportQuality / 2);

    tracks.forEach(track => {
      L.polyline(track.points as [number, number][], {
        color: track.color,
        weight: exportLineThickness,
        opacity: 0.8
      }).addTo(map);
    });

    // Wait for rendering (current implementation: 500ms)
    await waitForCanvasRender(map, 500);

    const outputPath = join(testOutputDir, 'tracks-low-res.png');
    await map.saveImage(outputPath);

    // Verify file exists
    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeGreaterThan(0);

    // Check for actual track colors in the image
    const colorCheck = await checkForTrackColors(outputPath, ['#ff4500', '#0000ff']);
    console.log(`Low-res color check: ${colorCheck.details}`);
    expect(colorCheck.found).toBe(true);
  });

  it('should render tracks at medium resolution (quality 1)', async () => {
    const previewZoom = 10;
    const exportQuality = 1;
    const exportZoom = previewZoom + exportQuality;

    const map = createTestMap({
      width: 1200,
      height: 900
    });
    map.setView([51.505, -0.09], exportZoom);

    const tracks = [
      { points: [[51.50, -0.10], [51.51, -0.09], [51.52, -0.08]], color: '#ff4500' },
      { points: [[51.48, -0.11], [51.49, -0.10], [51.50, -0.09]], color: '#0000ff' },
    ];

    const baseThickness = 3;
    const exportLineThickness = baseThickness * (1 + exportQuality / 2);

    tracks.forEach(track => {
      L.polyline(track.points as [number, number][], {
        color: track.color,
        weight: exportLineThickness,
        opacity: 0.8
      }).addTo(map);
    });

    // Wait for rendering (current implementation: 500ms)
    await waitForCanvasRender(map, 500);

    const outputPath = join(testOutputDir, 'tracks-medium-res.png');
    await map.saveImage(outputPath);

    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeGreaterThan(0);

    // Check for actual track colors
    const colorCheck = await checkForTrackColors(outputPath, ['#ff4500', '#0000ff']);
    console.log(`Medium-res color check: ${colorCheck.details}`);
    expect(colorCheck.found).toBe(true);
  });

  it('should render tracks at high resolution (quality 2) - REPRODUCES BUG', async () => {
    const previewZoom = 10;
    const exportQuality = 2; // High quality - this is where tracks go missing
    const exportZoom = previewZoom + exportQuality;

    const map = createTestMap({
      width: 2000,
      height: 1500
    });
    map.setView([51.505, -0.09], exportZoom);

    const tracks = [
      { points: [[51.50, -0.10], [51.51, -0.09], [51.52, -0.08]], color: '#ff4500' },
      { points: [[51.48, -0.11], [51.49, -0.10], [51.50, -0.09]], color: '#0000ff' },
      { points: [[51.46, -0.12], [51.47, -0.11], [51.48, -0.10]], color: '#00ff00' },
    ];

    const baseThickness = 3;
    const exportLineThickness = baseThickness * (1 + exportQuality / 2);

    tracks.forEach(track => {
      L.polyline(track.points as [number, number][], {
        color: track.color,
        weight: exportLineThickness,
        opacity: 0.8
      }).addTo(map);
    });

    // Wait for rendering (current implementation: 500ms)
    // This may not be enough at high resolutions!
    await waitForCanvasRender(map, 500);

    const outputPath = join(testOutputDir, 'tracks-high-res.png');
    await map.saveImage(outputPath);

    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeGreaterThan(0);

    // This is where the bug manifests - check if track colors are actually present!
    const colorCheck = await checkForTrackColors(outputPath, ['#ff4500', '#0000ff', '#00ff00']);
    console.log(`High-res color check: ${colorCheck.details}`);
    expect(colorCheck.found).toBe(true);
  });

  it('should render tracks at very high resolution (quality 3) - REPRODUCES BUG', async () => {
    const previewZoom = 10;
    const exportQuality = 3; // Very high quality
    const exportZoom = previewZoom + exportQuality;

    const map = createTestMap({
      width: 3000,
      height: 2000
    });
    map.setView([51.505, -0.09], exportZoom);

    const tracks = [
      { points: [[51.50, -0.10], [51.51, -0.09], [51.52, -0.08]], color: '#ff4500' },
      { points: [[51.48, -0.11], [51.49, -0.10], [51.50, -0.09]], color: '#0000ff' },
      { points: [[51.46, -0.12], [51.47, -0.11], [51.48, -0.10]], color: '#00ff00' },
      { points: [[51.44, -0.13], [51.45, -0.12], [51.46, -0.11]], color: '#ffff00' },
    ];

    const baseThickness = 3;
    const exportLineThickness = baseThickness * (1 + exportQuality / 2);

    tracks.forEach(track => {
      L.polyline(track.points as [number, number][], {
        color: track.color,
        weight: exportLineThickness,
        opacity: 0.8
      }).addTo(map);
    });

    // Wait for rendering (current implementation: 500ms)
    await waitForCanvasRender(map, 500);

    const outputPath = join(testOutputDir, 'tracks-very-high-res.png');
    await map.saveImage(outputPath);

    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeGreaterThan(0);

    // Check for all track colors
    const colorCheck = await checkForTrackColors(outputPath, ['#ff4500', '#0000ff', '#00ff00', '#ffff00']);
    console.log(`Very high-res color check: ${colorCheck.details}`);
    expect(colorCheck.found).toBe(true);
  });

  it('should render tracks with increased delay at high resolution (proposed fix)', async () => {
    const previewZoom = 10;
    const exportQuality = 2;
    const exportZoom = previewZoom + exportQuality;

    const map = createTestMap({
      width: 2000,
      height: 1500
    });
    map.setView([51.505, -0.09], exportZoom);

    const tracks = [
      { points: [[51.50, -0.10], [51.51, -0.09], [51.52, -0.08]], color: '#ff4500' },
      { points: [[51.48, -0.11], [51.49, -0.10], [51.50, -0.09]], color: '#0000ff' },
      { points: [[51.46, -0.12], [51.47, -0.11], [51.48, -0.10]], color: '#00ff00' },
    ];

    const baseThickness = 3;
    const exportLineThickness = baseThickness * (1 + exportQuality / 2);

    tracks.forEach(track => {
      L.polyline(track.points as [number, number][], {
        color: track.color,
        weight: exportLineThickness,
        opacity: 0.8
      }).addTo(map);
    });

    // Proposed fix: Scale delay with export quality
    // Base delay: 500ms + (exportQuality * 500ms)
    const scaledDelay = 500 + (exportQuality * 500);
    await waitForCanvasRender(map, scaledDelay);

    const outputPath = join(testOutputDir, 'tracks-high-res-fixed.png');
    await map.saveImage(outputPath);

    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeGreaterThan(0);

    // Check for all track colors with improved delay
    const colorCheck = await checkForTrackColors(outputPath, ['#ff4500', '#0000ff', '#00ff00']);
    console.log(`Fixed high-res color check: ${colorCheck.details}`);
    expect(colorCheck.found).toBe(true);
  });

  it('should render multiple tracks at high resolution with proper delays', async () => {
    const previewZoom = 11;
    const exportQuality = 2;
    const exportZoom = previewZoom + exportQuality;

    const map = createTestMap({
      width: 2400,
      height: 1800
    });
    map.setView([37.7749, -122.4194], exportZoom); // San Francisco

    // Create more complex tracks to test rendering under load
    const tracks = [];
    for (let i = 0; i < 10; i++) {
      const latOffset = i * 0.01;
      const lngOffset = i * 0.01;
      tracks.push({
        points: [
          [37.77 + latOffset, -122.42 + lngOffset],
          [37.78 + latOffset, -122.41 + lngOffset],
          [37.79 + latOffset, -122.40 + lngOffset],
        ],
        color: `hsl(${i * 36}, 100%, 50%)`
      });
    }

    const baseThickness = 3;
    const exportLineThickness = baseThickness * (1 + exportQuality / 2);

    tracks.forEach(track => {
      L.polyline(track.points as [number, number][], {
        color: track.color,
        weight: exportLineThickness,
        opacity: 0.8
      }).addTo(map);
    });

    // Use scaled delay based on quality
    const scaledDelay = 500 + (exportQuality * 500);
    await waitForCanvasRender(map, scaledDelay);

    const outputPath = join(testOutputDir, 'multiple-tracks-high-res.png');
    await map.saveImage(outputPath);

    const stat = await fs.stat(outputPath);
    expect(stat.size).toBeGreaterThan(0);

    // Just check for presence of some colored pixels (with 10 tracks, there should be plenty)
    // We'll just check one color to verify tracks are rendering
    const colorCheck = await checkForTrackColors(outputPath, ['#ff0000']);
    console.log(`Multiple tracks color check: ${colorCheck.details}`);
    expect(colorCheck.found).toBe(true);
  });
});
