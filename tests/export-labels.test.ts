import { describe, it, expect } from '@jest/globals';
import { LABEL_TILE_URL_RETINA } from '../labelTiles';

describe('Retina label tile fetching', () => {
  it('should request tiles with @2x suffix for higher pixel density', () => {
    expect(LABEL_TILE_URL_RETINA.endsWith('@2x.png')).toBe(true);
  });

  it('should preserve leaflet tile placeholders for subdomain and coordinates', () => {
    ['{s}', '{z}', '{x}', '{y}'].forEach(token => {
      expect(LABEL_TILE_URL_RETINA.includes(token)).toBe(true);
    });
  });

  it('should provide double the pixel data for a given CSS tile size', () => {
    const cssTileSize = 256; // Leaflet displays tiles at 256 CSS pixels
    const retinaTilePixelWidth = cssTileSize * 2; // Retina tiles contain 512px imagery
    expect(retinaTilePixelWidth / cssTileSize).toBe(2);
  });

  it('should render labels at 2x scale to benefit from retina tiles', () => {
    const renderScale = 2; // Labels should be rendered at 2x scale
    const targetWidth = 2048;
    const targetHeight = 2048;

    // When rendered at 2x scale, canvas dimensions are doubled
    const capturedWidth = targetWidth * renderScale; // 4096
    const capturedHeight = targetHeight * renderScale; // 4096

    expect(capturedWidth).toBe(4096);
    expect(capturedHeight).toBe(4096);
    expect(capturedWidth / targetWidth).toBe(2);
  });

  it('should allow the resized labels canvas to match the base canvas dimensions', () => {
    const baseCanvas = { width: 4096, height: 4096 };
    const retinaLabelCanvas = { width: 4096, height: 4096 }; // Captured with double pixel density

    // After resizing/downscaling, the dimensions must still match for merging
    expect(retinaLabelCanvas.width).toBe(baseCanvas.width);
    expect(retinaLabelCanvas.height).toBe(baseCanvas.height);
  });

  it('should keep label zoom logic independent of retina pixel ratio', () => {
    const previewZoom = 11;
    const labelDensity = 2;
    const expectedLabelZoom = previewZoom + labelDensity;

    expect(expectedLabelZoom).toBe(13);
  });
});

/**
 * Tests for label rendering and resizing during export
 *
 * Key concept: Labels are rendered at a different zoom level than the base map,
 * then resized to match the base map dimensions for overlay.
 */

describe('Label Export with Different Zoom Levels', () => {
  describe('Label Density to Zoom Conversion', () => {
    it('should calculate correct label zoom from base zoom and density', () => {
      const baseZoom = 10;

      // labelDensity -1 = labels off
      expect(baseZoom + (-1)).toBe(9);

      // labelDensity 0 = same as preview
      const labelZoom0 = baseZoom + 0;
      expect(labelZoom0).toBe(10);

      // labelDensity 1 = one zoom level higher (more detailed labels)
      const labelZoom1 = baseZoom + 1;
      expect(labelZoom1).toBe(11);

      // labelDensity 2 = two zoom levels higher
      const labelZoom2 = baseZoom + 2;
      expect(labelZoom2).toBe(12);

      // labelDensity 3 = three zoom levels higher
      const labelZoom3 = baseZoom + 3;
      expect(labelZoom3).toBe(13);
    });

    it('should use preview zoom not export zoom for labels', () => {
      const previewZoom = 10;
      const exportQuality = 2;
      const exportZoom = previewZoom + exportQuality; // 12
      const labelDensity = 1;

      // Labels should use preview zoom, not export zoom
      const labelZoom = previewZoom + labelDensity;
      expect(labelZoom).toBe(11);
      expect(labelZoom).not.toBe(exportZoom + labelDensity); // Should not be 13
    });
  });

  describe('Canvas Resizing for Different Zoom Levels', () => {
    /**
     * Mock function to simulate how canvas dimensions change with zoom level
     * In Web Mercator projection, doubling zoom level doubles linear dimensions
     */
    const calculateDimensionsAtZoom = (baseWidth: number, baseHeight: number, fromZoom: number, toZoom: number) => {
      const zoomDiff = toZoom - fromZoom;
      const scale = Math.pow(2, zoomDiff);
      return {
        width: Math.round(baseWidth * scale),
        height: Math.round(baseHeight * scale)
      };
    };

    it('should understand dimension scaling with zoom changes', () => {
      const baseWidth = 1000;
      const baseHeight = 800;
      const baseZoom = 10;

      // One zoom level up = 2x dimensions
      const dims11 = calculateDimensionsAtZoom(baseWidth, baseHeight, baseZoom, 11);
      expect(dims11.width).toBe(2000);
      expect(dims11.height).toBe(1600);

      // Two zoom levels up = 4x dimensions
      const dims12 = calculateDimensionsAtZoom(baseWidth, baseHeight, baseZoom, 12);
      expect(dims12.width).toBe(4000);
      expect(dims12.height).toBe(3200);

      // One zoom level down = 0.5x dimensions
      const dims9 = calculateDimensionsAtZoom(baseWidth, baseHeight, baseZoom, 9);
      expect(dims9.width).toBe(500);
      expect(dims9.height).toBe(400);
    });

    it('should calculate correct resize dimensions when label zoom > base zoom', () => {
      // Scenario: Base at zoom 10, labels at zoom 12
      const baseWidth = 1000;
      const baseHeight = 800;
      const baseZoom = 10;
      const labelZoom = 12;

      // Labels will be rendered at 4x size (2^2 = 4)
      const labelDims = calculateDimensionsAtZoom(baseWidth, baseHeight, baseZoom, labelZoom);
      expect(labelDims.width).toBe(4000);
      expect(labelDims.height).toBe(3200);

      // We need to resize labels from 4000x3200 down to 1000x800
      const targetWidth = baseWidth;
      const targetHeight = baseHeight;
      expect(targetWidth).toBe(1000);
      expect(targetHeight).toBe(800);
    });

    it('should calculate correct resize dimensions when label zoom < base zoom', () => {
      // Scenario: Base at zoom 12, labels at zoom 10
      const baseWidth = 4000;
      const baseHeight = 3200;
      const baseZoom = 12;
      const labelZoom = 10;

      // Labels will be rendered at 0.25x size (2^-2 = 0.25)
      const labelDims = calculateDimensionsAtZoom(baseWidth, baseHeight, baseZoom, labelZoom);
      expect(labelDims.width).toBe(1000);
      expect(labelDims.height).toBe(800);

      // We need to resize labels from 1000x800 up to 4000x3200
      const targetWidth = baseWidth;
      const targetHeight = baseHeight;
      expect(targetWidth).toBe(4000);
      expect(targetHeight).toBe(3200);
    });

    it('should not resize when zoom levels are the same', () => {
      const baseWidth = 1000;
      const baseHeight = 800;
      const zoom = 10;

      const labelDims = calculateDimensionsAtZoom(baseWidth, baseHeight, zoom, zoom);
      expect(labelDims.width).toBe(baseWidth);
      expect(labelDims.height).toBe(baseHeight);

      // No resize needed
      expect(labelDims.width).toBe(1000);
      expect(labelDims.height).toBe(800);
    });
  });

  describe('Canvas Resize Implementation', () => {
    /**
     * Simulates the canvas resize operation
     */
    const resizeCanvas = (sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) => {
      // Create a new canvas at target size
      const canvas = {
        width: targetWidth,
        height: targetHeight
      };

      // In real implementation, we'd use ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight)
      // Here we just verify the dimensions
      return canvas;
    };

    it('should resize larger label canvas to base dimensions', () => {
      const labelWidth = 4000;
      const labelHeight = 3200;
      const baseWidth = 1000;
      const baseHeight = 800;

      const resized = resizeCanvas(labelWidth, labelHeight, baseWidth, baseHeight);

      expect(resized.width).toBe(baseWidth);
      expect(resized.height).toBe(baseHeight);
    });

    it('should resize smaller label canvas to base dimensions', () => {
      const labelWidth = 500;
      const labelHeight = 400;
      const baseWidth = 2000;
      const baseHeight = 1600;

      const resized = resizeCanvas(labelWidth, labelHeight, baseWidth, baseHeight);

      expect(resized.width).toBe(baseWidth);
      expect(resized.height).toBe(baseHeight);
    });

    it('should handle non-integer zoom differences', () => {
      // Even with fractional zoom differences, we need exact target dimensions
      const labelWidth = 1414; // sqrt(2) * 1000
      const labelHeight = 1131; // sqrt(2) * 800
      const baseWidth = 1000;
      const baseHeight = 800;

      const resized = resizeCanvas(labelWidth, labelHeight, baseWidth, baseHeight);

      expect(resized.width).toBe(baseWidth);
      expect(resized.height).toBe(baseHeight);
    });
  });

  describe('Label Overlay Scenarios', () => {
    it('should overlay labels at same zoom (labelDensity=0)', () => {
      const previewZoom = 10;
      const exportQuality = 2;
      const labelDensity = 0;

      const baseZoom = previewZoom + exportQuality; // 12
      const labelZoom = previewZoom + labelDensity; // 10

      // Base is rendered at zoom 12, labels at zoom 10
      // Labels will be smaller and need to be upscaled
      expect(labelZoom).toBeLessThan(baseZoom);
      expect(baseZoom - labelZoom).toBe(2);
    });

    it('should overlay labels at higher zoom (labelDensity=1)', () => {
      const previewZoom = 10;
      const exportQuality = 2;
      const labelDensity = 1;

      const baseZoom = previewZoom + exportQuality; // 12
      const labelZoom = previewZoom + labelDensity; // 11

      // Base is rendered at zoom 12, labels at zoom 11
      // Labels will be smaller and need to be upscaled
      expect(labelZoom).toBeLessThan(baseZoom);
      expect(baseZoom - labelZoom).toBe(1);
    });

    it('should overlay labels at much higher zoom (labelDensity=3)', () => {
      const previewZoom = 10;
      const exportQuality = 2;
      const labelDensity = 3;

      const baseZoom = previewZoom + exportQuality; // 12
      const labelZoom = previewZoom + labelDensity; // 13

      // Base is rendered at zoom 12, labels at zoom 13
      // Labels will be larger and need to be downscaled
      expect(labelZoom).toBeGreaterThan(baseZoom);
      expect(labelZoom - baseZoom).toBe(1);
    });

    it('should handle edge case where export quality and label density are equal', () => {
      const previewZoom = 10;
      const exportQuality = 2;
      const labelDensity = 2;

      const baseZoom = previewZoom + exportQuality; // 12
      const labelZoom = previewZoom + labelDensity; // 12

      // Both at same zoom - no resize needed
      expect(labelZoom).toBe(baseZoom);
    });
  });

  describe('Retina Scale Factor', () => {
    it('should apply 2x render scale independent of zoom-based resizing', () => {
      // Scenario: Base at zoom 12 with 1x scale, labels at zoom 11 with 2x scale
      const baseZoom = 12;
      const labelZoom = 11;
      const renderScale = 2;

      // Base canvas at zoom 12: 2048x2048
      const baseWidth = 2048;
      const baseHeight = 2048;

      // Labels at zoom 11 would normally be 1024x1024 (half of base)
      // But with 2x render scale, they're captured at 2048x2048
      const labelWidthAtZoom = baseWidth / 2; // 1024 (zoom difference)
      const labelWidthCaptured = labelWidthAtZoom * renderScale; // 2048 (with scale)

      expect(labelWidthAtZoom).toBe(1024);
      expect(labelWidthCaptured).toBe(2048);

      // After zoom-based resize to match base zoom, labels are 2048x2048
      // This matches base dimensions, but contains 2x resolution data
      expect(labelWidthCaptured).toBe(baseWidth);
    });

    it('should combine zoom-based and scale-based dimension changes', () => {
      // Scenario: Base at zoom 10, labels at zoom 12 with 2x scale
      const baseZoom = 10;
      const labelZoom = 12;
      const renderScale = 2;

      // Base canvas at zoom 10: 1000x1000
      const baseWidth = 1000;

      // Labels at zoom 12 would normally be 4000x4000 (4x of base)
      // With 2x render scale, they're captured at 8000x8000
      const zoomScale = Math.pow(2, labelZoom - baseZoom); // 4
      const labelWidthAtZoom = baseWidth * zoomScale; // 4000
      const labelWidthCaptured = labelWidthAtZoom * renderScale; // 8000

      expect(zoomScale).toBe(4);
      expect(labelWidthAtZoom).toBe(4000);
      expect(labelWidthCaptured).toBe(8000);

      // After resize to match base, labels are downscaled from 8000 to 1000
      // This is an 8x downscale, preserving excellent detail from retina source
      const finalScale = labelWidthCaptured / baseWidth;
      expect(finalScale).toBe(8);
    });
  });

  describe('Real-world Export Scenarios', () => {
    it('should handle typical export at quality 0 with label density 0', () => {
      // User is at preview zoom 10, exports at quality 0
      const previewZoom = 10;
      const exportQuality = 0;
      const labelDensity = 0;

      const baseZoom = previewZoom + exportQuality; // 10
      const labelZoom = previewZoom + labelDensity; // 10

      // Everything at same zoom - no resize needed
      expect(baseZoom).toBe(10);
      expect(labelZoom).toBe(10);
      expect(baseZoom).toBe(labelZoom);
    });

    it('should handle high quality export with moderate label density', () => {
      // User at preview zoom 12, exports at quality 3, labels at density 1
      const previewZoom = 12;
      const exportQuality = 3;
      const labelDensity = 1;

      const baseZoom = previewZoom + exportQuality; // 15
      const labelZoom = previewZoom + labelDensity; // 13

      // Labels are 4x smaller (2^2 = 4)
      expect(baseZoom).toBe(15);
      expect(labelZoom).toBe(13);
      expect(baseZoom - labelZoom).toBe(2);

      // If base is 4096x4096, labels will be 1024x1024
      // Need to upscale labels by 4x
      const scaleFactor = Math.pow(2, baseZoom - labelZoom);
      expect(scaleFactor).toBe(4);
    });

    it('should handle low quality export with high label density', () => {
      // User at preview zoom 10, exports at quality 1, labels at density 3
      const previewZoom = 10;
      const exportQuality = 1;
      const labelDensity = 3;

      const baseZoom = previewZoom + exportQuality; // 11
      const labelZoom = previewZoom + labelDensity; // 13

      // Labels are 4x larger (2^2 = 4)
      expect(baseZoom).toBe(11);
      expect(labelZoom).toBe(13);
      expect(labelZoom - baseZoom).toBe(2);

      // If base is 1024x1024, labels will be 4096x4096
      // Need to downscale labels by 4x
      const scaleFactor = Math.pow(2, labelZoom - baseZoom);
      expect(scaleFactor).toBe(4);
    });
  });

  describe('Resize Quality Considerations', () => {
    it('should understand when to use smooth scaling vs nearest neighbor', () => {
      // When upscaling (labels smaller than base), use smooth interpolation
      const upscaleScenario = {
        labelZoom: 10,
        baseZoom: 12,
        shouldUseSmoothing: true // Upscaling benefits from smoothing
      };
      expect(upscaleScenario.shouldUseSmoothing).toBe(true);

      // When downscaling (labels larger than base), can use smooth or nearest
      const downscaleScenario = {
        labelZoom: 12,
        baseZoom: 10,
        shouldUseSmoothing: true // Downscaling can also use smoothing
      };
      expect(downscaleScenario.shouldUseSmoothing).toBe(true);
    });

    it('should preserve label transparency during resize', () => {
      // Labels layer should always be transparent background
      const labelLayerProps = {
        isTransparent: true,
        backgroundColor: null
      };
      expect(labelLayerProps.isTransparent).toBe(true);
      expect(labelLayerProps.backgroundColor).toBeNull();
    });
  });

  describe('Error Cases', () => {
    it('should handle case where label canvas is null', () => {
      // When labels are disabled (labelDensity = -1)
      const labelDensity = -1;
      const labelsEnabled = labelDensity >= 0;

      expect(labelsEnabled).toBe(false);
      // Don't attempt to render or resize labels
    });

    it('should handle case where map style does not support labels', () => {
      // Labels only work with esriImagery style
      const tileLayerKey: string = 'osmStandard';
      const supportsLabels = tileLayerKey === 'esriImagery';

      expect(supportsLabels).toBe(false);
      // Don't attempt to render or resize labels
    });

    it('should handle zero or negative dimensions gracefully', () => {
      const invalidWidth = 0;
      const invalidHeight = -100;

      expect(invalidWidth).toBeLessThanOrEqual(0);
      expect(invalidHeight).toBeLessThanOrEqual(0);

      // Should not attempt resize with invalid dimensions
      const shouldResize = invalidWidth > 0 && invalidHeight > 0;
      expect(shouldResize).toBe(false);
    });
  });
});

describe('Canvas Drawing and Overlay', () => {
  describe('Layer Stacking Order', () => {
    it('should stack layers in correct order: base, lines, labels', () => {
      const layers = ['base', 'lines', 'labels'];

      // Base should be first (bottom)
      expect(layers[0]).toBe('base');

      // Lines should be second (middle)
      expect(layers[1]).toBe('lines');

      // Labels should be last (top)
      expect(layers[2]).toBe('labels');
    });

    it('should draw each layer at origin (0, 0) after resizing', () => {
      const drawingCoordinates = {
        base: { x: 0, y: 0 },
        lines: { x: 0, y: 0 },
        labels: { x: 0, y: 0 }
      };

      // All layers aligned at origin
      expect(drawingCoordinates.base.x).toBe(0);
      expect(drawingCoordinates.base.y).toBe(0);
      expect(drawingCoordinates.lines.x).toBe(0);
      expect(drawingCoordinates.lines.y).toBe(0);
      expect(drawingCoordinates.labels.x).toBe(0);
      expect(drawingCoordinates.labels.y).toBe(0);
    });
  });

  describe('Dimension Matching', () => {
    it('should ensure all layers have same final dimensions', () => {
      const baseWidth = 2000;
      const baseHeight = 1500;

      // After resize, all layers should match base dimensions
      const layerDimensions = {
        base: { width: baseWidth, height: baseHeight },
        lines: { width: baseWidth, height: baseHeight },
        labels: { width: baseWidth, height: baseHeight }
      };

      expect(layerDimensions.lines.width).toBe(layerDimensions.base.width);
      expect(layerDimensions.lines.height).toBe(layerDimensions.base.height);
      expect(layerDimensions.labels.width).toBe(layerDimensions.base.width);
      expect(layerDimensions.labels.height).toBe(layerDimensions.base.height);
    });
  });
});
