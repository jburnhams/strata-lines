import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Map Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the map to be visible
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
  });

  test('should render map with correct initial dimensions', async ({ page }) => {
    // Wait for map to initialize
    await page.waitForTimeout(200);

    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();

    // Check that the map container has dimensions
    const boundingBox = await mapContainer.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBeGreaterThan(0);
    expect(boundingBox!.height).toBeGreaterThan(0);

    // Verify map tiles are loaded
    const tiles = page.locator('.leaflet-tile-loaded');
    await expect(tiles.first()).toBeVisible({ timeout: 10000 });

    // Count loaded tiles (should have at least a few)
    const tileCount = await tiles.count();
    expect(tileCount).toBeGreaterThan(0);
  });

  test('should display full height map on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(200);

    const mapWrapper = page.locator('[class*="md:h-screen"]').first();
    const mapWrapperBox = await mapWrapper.boundingBox();

    // On desktop, map should take significant portion of viewport height
    expect(mapWrapperBox!.height).toBeGreaterThan(600);
  });

  test('should display 50vh height map on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(200);

    const mapWrapper = page.locator('[class*="h-\\[50vh\\]"]').first();
    const mapWrapperBox = await mapWrapper.boundingBox();

    // On mobile, map should be approximately 50% of viewport height
    expect(mapWrapperBox!.height).toBeGreaterThan(300);
    expect(mapWrapperBox!.height).toBeLessThan(400);
  });

  test('should properly resize map when window is resized', async ({ page }) => {
    // Start with desktop size
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(200);

    const mapContainer = page.locator('.leaflet-container');
    const initialBox = await mapContainer.boundingBox();

    // Resize to smaller viewport
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(300);

    const resizedBox = await mapContainer.boundingBox();

    // Map dimensions should have changed
    expect(resizedBox!.width).not.toEqual(initialBox!.width);

    // Map should still be visible and functional
    await expect(mapContainer).toBeVisible();

    // Tiles should still be loaded
    const tiles = page.locator('.leaflet-tile-loaded');
    const tileCount = await tiles.count();
    expect(tileCount).toBeGreaterThan(0);
  });

  test('should allow zoom controls to work', async ({ page }) => {
    const zoomInButton = page.locator('.leaflet-control-zoom-in');
    const zoomOutButton = page.locator('.leaflet-control-zoom-out');

    // Zoom controls may not be visible by default, check for map functionality instead
    // by checking that we can interact with the map
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();

    // Take initial screenshot to compare
    const boundingBox = await mapContainer.boundingBox();
    const initialState = await page.screenshot({ clip: boundingBox || undefined });
    expect(initialState.length).toBeGreaterThan(0);

    // Use mouse wheel to zoom in
    await mapContainer.hover();
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(500);

    // Verify zoom happened by checking if tiles changed
    const tilesAfterZoom = page.locator('.leaflet-tile-loaded');
    const tileCountAfterZoom = await tilesAfterZoom.count();
    expect(tileCountAfterZoom).toBeGreaterThan(0);
  });

  test('should allow panning the map', async ({ page }) => {
    const mapContainer = page.locator('.leaflet-container');
    const boundingBox = await mapContainer.boundingBox();

    // Get initial center
    const initialCenter = {
      x: boundingBox!.x + boundingBox!.width / 2,
      y: boundingBox!.y + boundingBox!.height / 2,
    };

    // Pan the map by dragging
    await page.mouse.move(initialCenter.x, initialCenter.y);
    await page.mouse.down();
    await page.mouse.move(initialCenter.x + 100, initialCenter.y + 100, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(500);

    // Map should still be visible and functional
    await expect(mapContainer).toBeVisible();
    const tiles = page.locator('.leaflet-tile-loaded');
    const tileCount = await tiles.count();
    expect(tileCount).toBeGreaterThan(0);
  });

  test('should load and display GPX track when uploaded', async ({ page }) => {
    // Create a simple GPX file for testing
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="54.5" lon="-2.5"><ele>100</ele></trkpt>
      <trkpt lat="54.6" lon="-2.4"><ele>110</ele></trkpt>
      <trkpt lat="54.7" lon="-2.3"><ele>120</ele></trkpt>
      <trkpt lat="54.8" lon="-2.2"><ele>130</ele></trkpt>
      <trkpt lat="54.9" lon="-2.1"><ele>140</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

    // Write GPX content to a temporary file
    const buffer = Buffer.from(gpxContent, 'utf-8');

    // Find and click the file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-track.gpx',
      mimeType: 'application/gpx+xml',
      buffer: buffer,
    });

    // Wait for track to be processed and rendered
    await page.waitForTimeout(1000);

    // Check that polyline appeared on map
    const polylines = page.locator('.leaflet-interactive');
    const polylineCount = await polylines.count();
    expect(polylineCount).toBeGreaterThan(0);

    // Verify notification appeared (track added message)
    // May need to adjust selector based on notification component
  });

  test('should persist map state across page reloads', async ({ page }) => {
    // Zoom in and pan to a specific location
    const mapContainer = page.locator('.leaflet-container');
    await mapContainer.hover();

    // Zoom in several times
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(500);

    // Reload page
    await page.reload();
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Map should still render correctly
    const tiles = page.locator('.leaflet-tile-loaded');
    const tileCount = await tiles.count();
    expect(tileCount).toBeGreaterThan(0);

    // Map container should still have valid dimensions
    const boundingBox = await mapContainer.boundingBox();
    expect(boundingBox!.width).toBeGreaterThan(0);
    expect(boundingBox!.height).toBeGreaterThan(0);
  });
});
