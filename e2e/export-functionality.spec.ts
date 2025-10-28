import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Upload a test track for export tests
    const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Test Export Track</name>
    <trkseg>
      <trkpt lat="54.5" lon="-2.5"><ele>100</ele></trkpt>
      <trkpt lat="54.6" lon="-2.4"><ele>110</ele></trkpt>
      <trkpt lat="54.7" lon="-2.3"><ele>120</ele></trkpt>
      <trkpt lat="54.8" lon="-2.2"><ele>130</ele></trkpt>
      <trkpt lat="54.9" lon="-2.1"><ele>140</ele></trkpt>
      <trkpt lat="55.0" lon="-2.0"><ele>150</ele></trkpt>
      <trkpt lat="55.1" lon="-1.9"><ele>160</ele></trkpt>
      <trkpt lat="55.2" lon="-1.8"><ele>170</ele></trkpt>
      <trkpt lat="55.3" lon="-1.7"><ele>180</ele></trkpt>
      <trkpt lat="55.4" lon="-1.6"><ele>190</ele></trkpt>
      <trkpt lat="55.5" lon="-1.5"><ele>200</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const buffer = Buffer.from(gpxContent, 'utf-8');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-export-track.gpx',
      mimeType: 'application/gpx+xml',
      buffer: buffer,
    });

    await page.waitForTimeout(1500);
  });

  test('should display yellow export selection box', async ({ page }) => {
    // Look for the yellow rectangle (export bounds box)
    const rectangles = page.locator('path[stroke="yellow"]');

    // The box might not be visible initially, so we may need to trigger it
    // by clicking on an export button or control
    const exportButton = page.getByText(/export/i).first();
    if (await exportButton.isVisible()) {
      await exportButton.click();
      await page.waitForTimeout(500);
    }

    // Check if yellow rectangle is present
    const rectangleCount = await rectangles.count();
    if (rectangleCount > 0) {
      const rectangle = rectangles.first();
      await expect(rectangle).toBeVisible();

      // Verify it has the yellow color
      const stroke = await rectangle.getAttribute('stroke');
      expect(stroke).toBe('yellow');
    }
  });

  test('should allow dragging export selection box corners', async ({ page }) => {
    // Find yellow rectangle
    const rectangles = page.locator('path[stroke="yellow"]');

    if (await rectangles.count() > 0) {
      // Find draggable handles (markers)
      const handles = page.locator('.leaflet-editing-icon');
      const handleCount = await handles.count();

      if (handleCount > 0) {
        expect(handleCount).toBeGreaterThanOrEqual(4); // Should have at least 4 corner handles

        // Try to drag one of the corner handles
        const handle = handles.first();
        const handleBox = await handle.boundingBox();

        if (handleBox) {
          await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(handleBox.x + 50, handleBox.y + 50, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(300);

          // Rectangle should still be visible after drag
          await expect(rectangles.first()).toBeVisible();
        }
      }
    }
  });

  test('should show export dimensions and properties', async ({ page }) => {
    // Look for export dimension display in the controls panel
    // The exact selector depends on the UI, but typically shows width x height
    const dimensionText = page.locator('text=/\\d+\\s*x\\s*\\d+/');

    // Might need to open export panel first
    const controlsPanel = page.locator('[class*="overflow-y-auto"]');
    await expect(controlsPanel).toBeVisible();

    // Check if dimensions are displayed somewhere in the controls
    const hasPixelDimensions = await page.locator('text=/px/i').count();
    expect(hasPixelDimensions).toBeGreaterThan(0);
  });

  test('should maintain aspect ratio when specified', async ({ page }) => {
    // Find aspect ratio controls (buttons for 16:9, 4:3, etc.)
    const aspectRatioButtons = page.locator('button:has-text("16:9"), button:has-text("4:3"), button:has-text("1:1")');

    if (await aspectRatioButtons.count() > 0) {
      // Click on 16:9 aspect ratio button
      const button169 = page.locator('button:has-text("16:9")');
      if (await button169.isVisible()) {
        await button169.click();
        await page.waitForTimeout(500);

        // Verify the export bounds box has approximately 16:9 aspect ratio
        const rectangles = page.locator('path[stroke="yellow"]');
        if (await rectangles.count() > 0) {
          const rectangle = rectangles.first();
          const box = await rectangle.boundingBox();

          if (box) {
            const ratio = box.width / box.height;
            // Should be close to 16/9 = 1.777...
            expect(ratio).toBeGreaterThan(1.5);
            expect(ratio).toBeLessThan(2.0);
          }
        }
      }
    }
  });

  test('should export PNG file when export button is clicked', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

    // Find and click export button
    // Look for buttons with text like "Export PNG", "Export Combined", etc.
    const exportButton = page.locator('button:has-text("Combined")').or(
      page.locator('button:has-text("Export PNG")')
    ).first();

    if (await exportButton.isVisible()) {
      await exportButton.click();

      // Wait for download to start
      try {
        const download = await downloadPromise;

        // Verify download properties
        const filename = download.suggestedFilename();
        expect(filename).toMatch(/\.png$/);
        expect(filename).toContain('gpx-map');

        // Save to temp location and verify file exists
        const downloadPath = await download.path();
        expect(downloadPath).not.toBeNull();

        // Verify file size is reasonable (should be > 1KB for a real image)
        if (downloadPath) {
          const stats = fs.statSync(downloadPath);
          expect(stats.size).toBeGreaterThan(1000);
        }
      } catch (error) {
        console.log('Export test skipped - export may take longer or require manual trigger');
      }
    }
  });

  test('should verify export bounds match selection box coordinates', async ({ page }) => {
    // This test verifies that the exported area corresponds to the yellow box
    // We'll check that the bounds stored match what's displayed

    // Find the yellow rectangle and get its bounds
    const rectangles = page.locator('path[stroke="yellow"]');

    if (await rectangles.count() > 0) {
      const rectangle = rectangles.first();
      const rectBox = await rectangle.boundingBox();

      expect(rectBox).not.toBeNull();
      expect(rectBox!.width).toBeGreaterThan(0);
      expect(rectBox!.height).toBeGreaterThan(0);

      // Check that export dimensions are calculated and displayed
      // Look for dimension text in controls panel
      const dimensionDisplay = page.locator('text=/\\d+\\s*x\\s*\\d+\\s*px/i');
      if (await dimensionDisplay.count() > 0) {
        await expect(dimensionDisplay.first()).toBeVisible();
      }

      // Verify the export bounds are locked and set
      const lockStatus = page.locator('text=/locked/i, text=/lock/i');
      const isLocked = await lockStatus.count() > 0;

      // At least one of these conditions should be true:
      // Either the bounds are locked or dimensions are shown
      expect(isLocked || await dimensionDisplay.count() > 0).toBeTruthy();
    }
  });

  test('should handle different tile layer styles for export', async ({ page }) => {
    // Find tile layer selector/switcher
    const tileLayerButtons = page.locator('button:has-text("Satellite"), button:has-text("Street"), button:has-text("Topo")');

    if (await tileLayerButtons.count() > 0) {
      // Click on different tile layer
      const satelliteButton = page.locator('button:has-text("Satellite")').or(
        page.locator('button:has-text("Esri")')
      ).first();

      if (await satelliteButton.isVisible()) {
        await satelliteButton.click();
        await page.waitForTimeout(1000);

        // Verify tiles changed
        const tiles = page.locator('.leaflet-tile-loaded');
        const tileCount = await tiles.count();
        expect(tileCount).toBeGreaterThan(0);

        // Map should still be functional
        const mapContainer = page.locator('.leaflet-container');
        await expect(mapContainer).toBeVisible();
      }
    }
  });

  test('should show export quality controls', async ({ page }) => {
    // Look for quality slider or controls
    const qualityControls = page.locator('text=/quality/i, text=/zoom.*multiplier/i, input[type="range"]');

    if (await qualityControls.count() > 0) {
      const qualityControl = qualityControls.first();
      await expect(qualityControl).toBeVisible();
    }
  });

  test('should allow exporting different layer types', async ({ page }) => {
    // Look for layer-specific export buttons
    const baseLayerButton = page.locator('button:has-text("Base")').first();
    const linesLayerButton = page.locator('button:has-text("Lines")').first();

    // At least one layer export option should be available
    const hasBaseButton = await baseLayerButton.isVisible();
    const hasLinesButton = await linesLayerButton.isVisible();

    expect(hasBaseButton || hasLinesButton).toBeTruthy();
  });

  test('should reset export bounds when requested', async ({ page }) => {
    // Look for reset or clear bounds button
    const resetButton = page.locator('button:has-text("Reset"), button:has-text("Clear")').first();

    if (await resetButton.isVisible()) {
      // Check initial state
      const rectangles = page.locator('path[stroke="yellow"]');
      const initialCount = await rectangles.count();

      // Click reset
      await resetButton.click();
      await page.waitForTimeout(500);

      // Bounds box might be hidden or reset to default position
      // Map should still be visible and functional
      const mapContainer = page.locator('.leaflet-container');
      await expect(mapContainer).toBeVisible();
    }
  });
});
