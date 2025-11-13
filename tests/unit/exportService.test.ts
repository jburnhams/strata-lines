import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import L from 'leaflet';
import { createCanvas } from '@napi-rs/canvas';
import type { Track } from '../../types';
import type { ExportConfig, ExportCallbacks } from '../../services/exportService';

// Mock the browser-specific APIs first, before any imports
const mockToBlob = jest.fn((callback: (blob: Blob | null) => void) => {
  const mockBlob = new Blob(['mock'], { type: 'image/png' });
  callback(mockBlob);
});

const mockCreateElement = jest.fn((tagName: string) => {
  if (tagName === 'canvas') {
    const canvas = createCanvas(100, 100);
    (canvas as any).toBlob = mockToBlob;
    return canvas;
  }
  if (tagName === 'a') {
    return {
      download: '',
      href: '',
      click: jest.fn(),
    };
  }
  if (tagName === 'div') {
    return {
      style: {},
      classList: { add: jest.fn(), remove: jest.fn() },
    };
  }
  return {};
});

const mockBody = {
  appendChild: jest.fn(),
  removeChild: jest.fn(),
};

// Set up global mocks
(global as any).document = {
  createElement: mockCreateElement,
  body: mockBody,
};

(global as any).URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn(),
};

// Mock the exportHelpers module completely
jest.mock('../../utils/exportHelpers', () => ({
  renderCanvasForBounds: jest.fn(),
  calculateSubdivisions: jest.fn(),
  calculateGridLayout: jest.fn(),
  resizeCanvas: jest.fn(),
}));

// Mock image-stitch library
jest.mock('image-stitch/bundle', () => ({
  concatToBuffer: jest.fn(),
}));

// Now import after mocks are set up
import { performPngExport } from '../../services/exportService';
import * as exportHelpers from '../../utils/exportHelpers';
import * as imageStitch from 'image-stitch/bundle';

describe('Export Service Integration Tests', () => {
  let mockTrack: Track;
  let mockConfig: ExportConfig;
  let mockCallbacks: ExportCallbacks;
  let renderCanvasForBoundsMock: jest.MockedFunction<typeof exportHelpers.renderCanvasForBounds>;
  let calculateSubdivisionsMock: jest.MockedFunction<typeof exportHelpers.calculateSubdivisions>;
  let calculateGridLayoutMock: jest.MockedFunction<typeof exportHelpers.calculateGridLayout>;
  let resizeCanvasMock: jest.MockedFunction<typeof exportHelpers.resizeCanvas>;
  let concatToBufferMock: jest.MockedFunction<typeof imageStitch.concatToBuffer>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTrack = {
      id: 'test-1',
      name: 'Test Track',
      points: [
        [51.5, -0.1],
        [51.6, -0.05],
      ],
      length: 10.5,
      isVisible: true,
      color: '#ff0000',
    };

    const bounds = L.latLngBounds(
      L.latLng(51.5, -0.1),
      L.latLng(51.6, 0.0)
    );

    mockConfig = {
      exportBounds: bounds,
      derivedExportZoom: 12,
      previewZoom: 10,
      zoom: 10,
      maxDimension: 4000,
      labelDensity: 1,
      tileLayerKey: 'esriImagery',
      lineThickness: 3,
      exportQuality: 2,
    };

    mockCallbacks = {
      onSubdivisionsCalculated: jest.fn(),
      onSubdivisionProgress: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    // Set up mock implementation to return canvases
    renderCanvasForBoundsMock = exportHelpers.renderCanvasForBounds as jest.MockedFunction<typeof exportHelpers.renderCanvasForBounds>;
    renderCanvasForBoundsMock.mockImplementation(async (options) => {
      const canvas = createCanvas(800, 600);
      (canvas as any).toBlob = mockToBlob;
      return canvas as any;
    });

    // Mock calculateSubdivisions - default to single subdivision
    calculateSubdivisionsMock = exportHelpers.calculateSubdivisions as jest.MockedFunction<typeof exportHelpers.calculateSubdivisions>;
    calculateSubdivisionsMock.mockImplementation((bounds) => {
      return [bounds];
    });

    // Mock resizeCanvas
    resizeCanvasMock = exportHelpers.resizeCanvas as jest.MockedFunction<typeof exportHelpers.resizeCanvas>;
    resizeCanvasMock.mockImplementation((sourceCanvas, width, height) => {
      const canvas = createCanvas(width, height);
      (canvas as any).toBlob = mockToBlob;
      return canvas as any;
    });

    // Mock calculateGridLayout
    calculateGridLayoutMock = exportHelpers.calculateGridLayout as jest.MockedFunction<typeof exportHelpers.calculateGridLayout>;
    calculateGridLayoutMock.mockImplementation((subdivisions) => {
      // For a simple 2x2 grid layout (most common case with 4 subdivisions)
      const rows = Math.ceil(Math.sqrt(subdivisions.length));
      const columns = Math.ceil(subdivisions.length / rows);
      return {
        rows,
        columns,
        orderedSubdivisions: subdivisions,
      };
    });

    // Mock image-stitch concatToBuffer function
    concatToBufferMock = imageStitch.concatToBuffer as jest.MockedFunction<typeof imageStitch.concatToBuffer>;
    concatToBufferMock.mockImplementation(async (options: any) => {
      // Return a mock Uint8Array representing a stitched PNG
      return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) as any; // PNG header
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performPngExport - combined type', () => {
    it('should export combined type with base, lines, and labels', async () => {
      await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

      // Should render 3 layers: base, lines, labels
      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(3);

      // Verify base layer render
      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          layerType: 'base',
          zoomForRender: 12,
          tileLayerKey: 'esriImagery',
        })
      );

      // Verify lines layer render
      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          layerType: 'lines',
          zoomForRender: 12,
          visibleTracks: [mockTrack],
        })
      );

      // Verify labels layer render (at different zoom)
      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          layerType: 'labels-only',
          zoomForRender: 11, // previewZoom (10) + labelDensity (1)
        })
      );

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
      expect(mockCallbacks.onError).not.toHaveBeenCalled();
    });

    it('should skip lines layer when no visible tracks', async () => {
      await performPngExport('combined', [], mockConfig, mockCallbacks);

      // Should render only 2 layers: base and labels (no lines)
      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(2);

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should skip labels layer when not using esriImagery', async () => {
      const configWithoutLabels = {
        ...mockConfig,
        tileLayerKey: 'osm',
      };

      await performPngExport('combined', [mockTrack], configWithoutLabels, mockCallbacks);

      // Should render only 2 layers: base and lines (no labels)
      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(2);

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should skip labels layer when labelDensity is negative', async () => {
      const configWithNegativeDensity = {
        ...mockConfig,
        labelDensity: -1,
      };

      await performPngExport('combined', [mockTrack], configWithNegativeDensity, mockCallbacks);

      // Should render only 2 layers: base and lines (no labels)
      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(2);

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should create final canvas and composite layers', async () => {
      await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

      // Should create a final composite canvas
      expect(mockCreateElement).toHaveBeenCalledWith('canvas');
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });
  });

  describe('performPngExport - base type', () => {
    it('should export base layer only', async () => {
      await performPngExport('base', [mockTrack], mockConfig, mockCallbacks);

      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(1);
      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          layerType: 'base',
          zoomForRender: 12,
        })
      );

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
      expect(mockCallbacks.onError).not.toHaveBeenCalled();
    });
  });

  describe('performPngExport - lines type', () => {
    it('should export lines layer only', async () => {
      await performPngExport('lines', [mockTrack], mockConfig, mockCallbacks);

      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(1);
      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          layerType: 'lines',
          zoomForRender: 12,
          visibleTracks: [mockTrack],
        })
      );

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });
  });

  describe('performPngExport - labels type', () => {
    it('should export labels layer only at correct zoom', async () => {
      await performPngExport('labels', [mockTrack], mockConfig, mockCallbacks);

      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(1);
      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          layerType: 'labels-only',
          zoomForRender: 11, // previewZoom (10) + labelDensity (1)
        })
      );

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should use zoom when previewZoom is null', async () => {
      const configWithoutPreview = {
        ...mockConfig,
        previewZoom: null as any,
      };

      await performPngExport('labels', [mockTrack], configWithoutPreview, mockCallbacks);

      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          zoomForRender: 11, // zoom (10) + labelDensity (1)
        })
      );
    });
  });

  describe('Subdivision handling', () => {
    it('should calculate subdivisions and export each one', async () => {
      // Use a smaller maxDimension to force subdivisions
      const configWithSubdivisions = {
        ...mockConfig,
        maxDimension: 100,
      };

      // Override mock to return 4 subdivisions
      const bounds = mockConfig.exportBounds;
      const center = bounds.getCenter();
      const subdivisions = [
        L.latLngBounds(bounds.getSouthWest(), center),
        L.latLngBounds(L.latLng(center.lat, bounds.getWest()), L.latLng(bounds.getNorth(), center.lng)),
        L.latLngBounds(L.latLng(bounds.getSouth(), center.lng), L.latLng(center.lat, bounds.getEast())),
        L.latLngBounds(center, bounds.getNorthEast()),
      ];
      calculateSubdivisionsMock.mockReturnValueOnce(subdivisions);

      await performPngExport('base', [mockTrack], configWithSubdivisions, mockCallbacks);

      // Should calculate subdivisions
      expect(mockCallbacks.onSubdivisionsCalculated).toHaveBeenCalled();
      const calledSubdivisions = (mockCallbacks.onSubdivisionsCalculated as jest.Mock).mock.calls[0][0] as L.LatLngBounds[];
      expect(calledSubdivisions.length).toBe(4);

      // Should call onSubdivisionProgress for each subdivision
      expect(mockCallbacks.onSubdivisionProgress).toHaveBeenCalledTimes(4);

      // Should render a canvas for each subdivision
      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(4);

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should stitch subdivisions into a single download', async () => {
      const configWithSubdivisions = {
        ...mockConfig,
        maxDimension: 100,
      };

      // Override mock to return 4 subdivisions
      const bounds = mockConfig.exportBounds;
      const center = bounds.getCenter();
      const subdivisions = [
        L.latLngBounds(bounds.getSouthWest(), center),
        L.latLngBounds(L.latLng(center.lat, bounds.getWest()), L.latLng(bounds.getNorth(), center.lng)),
        L.latLngBounds(L.latLng(bounds.getSouth(), center.lng), L.latLng(center.lat, bounds.getEast())),
        L.latLngBounds(center, bounds.getNorthEast()),
      ];
      calculateSubdivisionsMock.mockReturnValueOnce(subdivisions);

      await performPngExport('base', [mockTrack], configWithSubdivisions, mockCallbacks);

      const calledSubdivisions = (mockCallbacks.onSubdivisionsCalculated as jest.Mock).mock.calls[0][0] as L.LatLngBounds[];

      // Should render all subdivisions
      expect(calledSubdivisions.length).toBe(4);
      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(4);

      // Should create only ONE download link (stitched image)
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      const linkCreations = (mockCreateElement as jest.Mock).mock.calls.filter(
        (call: any) => call[0] === 'a'
      );
      expect(linkCreations.length).toBe(1);

      // Should complete successfully
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should handle single subdivision (no split needed)', async () => {
      // Large maxDimension means no subdivisions needed
      const configNoSubdivisions = {
        ...mockConfig,
        maxDimension: 10000,
      };

      await performPngExport('base', [mockTrack], configNoSubdivisions, mockCallbacks);

      expect(mockCallbacks.onSubdivisionsCalculated).toHaveBeenCalled();
      const subdivisions = (mockCallbacks.onSubdivisionsCalculated as jest.Mock).mock.calls[0][0] as L.LatLngBounds[];
      expect(subdivisions.length).toBe(1);

      expect(mockCallbacks.onSubdivisionProgress).toHaveBeenCalledWith(0);
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });
  });

  describe('Download handling', () => {
    it('should create blob and download link', async () => {
      await performPngExport('base', [mockTrack], mockConfig, mockCallbacks);

      expect(mockToBlob).toHaveBeenCalled();
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockBody.appendChild).toHaveBeenCalled();
      expect(mockBody.removeChild).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should include export type in filename', async () => {
      await performPngExport('base', [mockTrack], mockConfig, mockCallbacks);

      const linkElement = (mockCreateElement as jest.Mock).mock.results.find(
        (result: any) => result.value.download !== undefined
      )?.value as any;

      expect(linkElement).toBeDefined();
      expect(linkElement.download).toContain('base');
      expect(linkElement.download).toContain('.png');
    });

    it('should NOT include part numbers in filename when subdivisions are stitched', async () => {
      const configWithSubdivisions = {
        ...mockConfig,
        maxDimension: 100,
      };

      // Override mock to return 4 subdivisions
      const bounds = mockConfig.exportBounds;
      const center = bounds.getCenter();
      const subdivisions = [
        L.latLngBounds(bounds.getSouthWest(), center),
        L.latLngBounds(L.latLng(center.lat, bounds.getWest()), L.latLng(bounds.getNorth(), center.lng)),
        L.latLngBounds(L.latLng(bounds.getSouth(), center.lng), L.latLng(center.lat, bounds.getEast())),
        L.latLngBounds(center, bounds.getNorthEast()),
      ];
      calculateSubdivisionsMock.mockReturnValueOnce(subdivisions);

      await performPngExport('base', [mockTrack], configWithSubdivisions, mockCallbacks);

      const linkElements = (mockCreateElement as jest.Mock).mock.results
        .filter((result: any) => result.value.download !== undefined)
        .map((result: any) => result.value);

      // Should have only ONE stitched file without part numbers
      expect(linkElements.length).toBe(1);
      expect((linkElements[0] as any).download).not.toMatch(/_part/);
      expect((linkElements[0] as any).download).toContain('base');
    });
  });

  describe('Error handling', () => {
    it('should call onError when base layer render fails', async () => {
      renderCanvasForBoundsMock.mockRejectedValueOnce(new Error('Render failed'));

      await performPngExport('base', [mockTrack], mockConfig, mockCallbacks);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Render failed',
        })
      );
      expect(mockCallbacks.onComplete).not.toHaveBeenCalled();
    });

    it('should call onError when base layer returns null in combined mode', async () => {
      renderCanvasForBoundsMock.mockResolvedValueOnce(null);

      await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to render base layer',
        })
      );
    });

    it('should call onError when single layer returns null', async () => {
      renderCanvasForBoundsMock.mockResolvedValueOnce(null);

      await performPngExport('base', [mockTrack], mockConfig, mockCallbacks);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to render'),
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      renderCanvasForBoundsMock.mockRejectedValueOnce('String error');

      await performPngExport('base', [mockTrack], mockConfig, mockCallbacks);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(
        expect.any(Error)
      );
      expect(mockCallbacks.onComplete).not.toHaveBeenCalled();
    });
  });

  describe('Memory management', () => {
    it('should successfully composite and export without memory leaks', async () => {
      // Test that combined export completes successfully with all layers
      await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

      // Verify all layers were rendered
      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(3); // base, lines, labels

      // Verify export completed successfully
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
      expect(mockCallbacks.onError).not.toHaveBeenCalled();

      // Verify final composite was created and downloaded
      expect(mockToBlob).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Layer compositing', () => {
    it('should use correct zoom levels for different layers', async () => {
      await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

      const calls = renderCanvasForBoundsMock.mock.calls;

      // Base layer at derivedExportZoom
      expect(calls[0][0]).toMatchObject({
        layerType: 'base',
        zoomForRender: 12,
      });

      // Lines layer at derivedExportZoom
      expect(calls[1][0]).toMatchObject({
        layerType: 'lines',
        zoomForRender: 12,
      });

      // Labels layer at previewZoom + labelDensity
      expect(calls[2][0]).toMatchObject({
        layerType: 'labels-only',
        zoomForRender: 11,
      });
    });

    it('should pass correct configuration to render functions', async () => {
      await performPngExport('lines', [mockTrack], mockConfig, mockCallbacks);

      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith({
        bounds: mockConfig.exportBounds,
        layerType: 'lines',
        zoomForRender: 12,
        visibleTracks: [mockTrack],
        tileLayerKey: 'esriImagery',
        lineThickness: 3,
        exportQuality: 2,
      });
    });
  });

  describe('Progress Callbacks - Combined Mode', () => {
    it('should call onStageProgress for base layer in combined mode', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      await performPngExport('combined', [mockTrack], mockConfig, callbacksWithProgress);

      // Should be called at least once for base stage
      expect(onStageProgress).toHaveBeenCalledWith(
        0, // subdivision index
        expect.objectContaining({
          stage: 'base',
          stageLabel: 'base 1/3',
        })
      );
    });

    it('should call onTileProgress callback for base layer', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      // Mock renderCanvasForBounds to simulate tile loading progress
      renderCanvasForBoundsMock.mockImplementation(async (options) => {
        // Simulate tile progress callbacks
        if (options.onTileProgress) {
          options.onTileProgress(5, 10);
          options.onTileProgress(10, 10);
        }
        const canvas = createCanvas(800, 600);
        (canvas as any).toBlob = mockToBlob;
        return canvas as any;
      });

      await performPngExport('combined', [mockTrack], mockConfig, callbacksWithProgress);

      // Verify onStageProgress was called with tile progress
      expect(onStageProgress).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          stage: 'base',
          current: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        })
      );
    });

    it('should call onStageProgress for lines layer when tracks exist', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      await performPngExport('combined', [mockTrack], mockConfig, callbacksWithProgress);

      // Should be called for lines stage
      expect(onStageProgress).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          stage: 'lines',
          stageLabel: 'lines 2/3',
        })
      );
    });

    it('should call onLineProgress callback for lines layer', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      // Mock renderCanvasForBounds to simulate line rendering progress
      renderCanvasForBoundsMock.mockImplementation(async (options) => {
        // Simulate line progress callbacks
        if (options.onLineProgress) {
          options.onLineProgress(25, 50);
          options.onLineProgress(50, 50);
        }
        const canvas = createCanvas(800, 600);
        (canvas as any).toBlob = mockToBlob;
        return canvas as any;
      });

      await performPngExport('combined', [mockTrack], mockConfig, callbacksWithProgress);

      // Verify onStageProgress was called with line progress
      expect(onStageProgress).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          stage: 'lines',
          current: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        })
      );
    });

    it('should call onStageProgress for labels layer', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      await performPngExport('combined', [mockTrack], mockConfig, callbacksWithProgress);

      // Should be called for labels stage (tiles)
      expect(onStageProgress).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          stage: 'tiles',
          stageLabel: 'labels 3/3',
        })
      );
    });

    it('should call onTileProgress callback for labels layer', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      // Mock renderCanvasForBounds to simulate tile loading progress
      let callCount = 0;
      renderCanvasForBoundsMock.mockImplementation(async (options) => {
        // Simulate tile progress for labels (third call)
        if (callCount === 2 && options.onTileProgress) {
          options.onTileProgress(3, 6);
          options.onTileProgress(6, 6);
        }
        callCount++;
        const canvas = createCanvas(800, 600);
        (canvas as any).toBlob = mockToBlob;
        return canvas as any;
      });

      await performPngExport('combined', [mockTrack], mockConfig, callbacksWithProgress);

      // Verify onStageProgress was called with tile progress for labels
      const labelsStageCalls = onStageProgress.mock.calls.filter(
        (call: any) => call[1].stage === 'tiles'
      );
      expect(labelsStageCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Progress Callbacks - Non-Combined Mode', () => {
    it('should call onStageProgress for base export type', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      await performPngExport('base', [mockTrack], mockConfig, callbacksWithProgress);

      // Should be called for base stage
      expect(onStageProgress).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          stage: 'base',
          stageLabel: 'base',
        })
      );
    });

    it('should call onTileProgress for base export type', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      // Mock to simulate tile progress
      renderCanvasForBoundsMock.mockImplementation(async (options) => {
        if (options.onTileProgress) {
          options.onTileProgress(4, 8);
        }
        const canvas = createCanvas(800, 600);
        (canvas as any).toBlob = mockToBlob;
        return canvas as any;
      });

      await performPngExport('base', [mockTrack], mockConfig, callbacksWithProgress);

      expect(onStageProgress).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          stage: 'base',
          current: 4,
          total: 8,
          percentage: 50,
        })
      );
    });

    it('should call onLineProgress for lines export type', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      // Mock to simulate line progress
      renderCanvasForBoundsMock.mockImplementation(async (options) => {
        if (options.onLineProgress) {
          options.onLineProgress(30, 60);
        }
        const canvas = createCanvas(800, 600);
        (canvas as any).toBlob = mockToBlob;
        return canvas as any;
      });

      await performPngExport('lines', [mockTrack], mockConfig, callbacksWithProgress);

      expect(onStageProgress).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          stage: 'lines',
          current: 30,
          total: 60,
          percentage: 50,
        })
      );
    });

    it('should call onStageProgress for labels export type', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      await performPngExport('labels', [mockTrack], mockConfig, callbacksWithProgress);

      // Should be called for tiles stage
      expect(onStageProgress).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          stage: 'tiles',
          stageLabel: 'labels',
        })
      );
    });

    it('should call onTileProgress for labels export type', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      // Mock to simulate tile progress
      renderCanvasForBoundsMock.mockImplementation(async (options) => {
        if (options.onTileProgress) {
          options.onTileProgress(2, 4);
        }
        const canvas = createCanvas(800, 600);
        (canvas as any).toBlob = mockToBlob;
        return canvas as any;
      });

      await performPngExport('labels', [mockTrack], mockConfig, callbacksWithProgress);

      expect(onStageProgress).toHaveBeenCalledWith(
        0,
        expect.objectContaining({
          stage: 'tiles',
          current: 2,
          total: 4,
          percentage: 50,
        })
      );
    });
  });

  describe('Canvas Resizing Logic', () => {
    it('should resize labels canvas when dimensions do not match base', async () => {
      // Mock renderCanvasForBounds to return canvases with different dimensions
      let callCount = 0;
      renderCanvasForBoundsMock.mockImplementation(async (options) => {
        callCount++;
        if (callCount === 1) {
          // Base layer: 800x600
          const canvas = createCanvas(800, 600);
          (canvas as any).toBlob = mockToBlob;
          return canvas as any;
        } else if (callCount === 2) {
          // Lines layer: 800x600
          const canvas = createCanvas(800, 600);
          (canvas as any).toBlob = mockToBlob;
          return canvas as any;
        } else {
          // Labels layer: different size 1600x1200 (at higher zoom)
          const canvas = createCanvas(1600, 1200);
          (canvas as any).toBlob = mockToBlob;
          return canvas as any;
        }
      });

      await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

      // resizeCanvas should have been called to match dimensions
      expect(resizeCanvasMock).toHaveBeenCalledWith(
        expect.anything(),
        800, // target width
        600  // target height
      );
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should not resize labels canvas when dimensions already match', async () => {
      // Mock all canvases to have same dimensions
      renderCanvasForBoundsMock.mockImplementation(async () => {
        const canvas = createCanvas(800, 600);
        (canvas as any).toBlob = mockToBlob;
        return canvas as any;
      });

      await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

      // resizeCanvas should NOT be called
      expect(resizeCanvasMock).not.toHaveBeenCalled();
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should handle both width and height mismatches', async () => {
      let callCount = 0;
      renderCanvasForBoundsMock.mockImplementation(async (options) => {
        callCount++;
        if (callCount === 1) {
          // Base layer: 1000x500
          const canvas = createCanvas(1000, 500);
          (canvas as any).toBlob = mockToBlob;
          return canvas as any;
        } else if (callCount === 2) {
          // Lines layer: 1000x500
          const canvas = createCanvas(1000, 500);
          (canvas as any).toBlob = mockToBlob;
          return canvas as any;
        } else {
          // Labels layer: different size 2000x1500
          const canvas = createCanvas(2000, 1500);
          (canvas as any).toBlob = mockToBlob;
          return canvas as any;
        }
      });

      await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

      expect(resizeCanvasMock).toHaveBeenCalledWith(
        expect.anything(),
        1000,
        500
      );
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });
  });

  describe('Subdivision Stitching Progress', () => {
    it('should call onSubdivisionStitched during stitching', async () => {
      const onSubdivisionStitched = jest.fn();
      const callbacksWithStitching = {
        ...mockCallbacks,
        onSubdivisionStitched,
      };

      const configWithSubdivisions = {
        ...mockConfig,
        maxDimension: 100,
      };

      // Override mock to return 4 subdivisions
      const bounds = mockConfig.exportBounds;
      const center = bounds.getCenter();
      const subdivisions = [
        L.latLngBounds(bounds.getSouthWest(), center),
        L.latLngBounds(L.latLng(center.lat, bounds.getWest()), L.latLng(bounds.getNorth(), center.lng)),
        L.latLngBounds(L.latLng(bounds.getSouth(), center.lng), L.latLng(center.lat, bounds.getEast())),
        L.latLngBounds(center, bounds.getNorthEast()),
      ];
      calculateSubdivisionsMock.mockReturnValueOnce(subdivisions);

      // Mock concatToBuffer to simulate progress
      concatToBufferMock.mockImplementation(async (options: any) => {
        if (options.onProgress) {
          options.onProgress(1, 4);
          options.onProgress(2, 4);
          options.onProgress(3, 4);
          options.onProgress(4, 4);
        }
        return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) as any;
      });

      await performPngExport('base', [mockTrack], configWithSubdivisions, callbacksWithStitching);

      // Should have been called with progress updates
      expect(onSubdivisionStitched).toHaveBeenCalledWith(1, 4);
      expect(onSubdivisionStitched).toHaveBeenCalledWith(2, 4);
      expect(onSubdivisionStitched).toHaveBeenCalledWith(3, 4);
      expect(onSubdivisionStitched).toHaveBeenCalledWith(4, 4);
    });

    it('should handle stitching without progress callback', async () => {
      // No onSubdivisionStitched callback provided
      const configWithSubdivisions = {
        ...mockConfig,
        maxDimension: 100,
      };

      const bounds = mockConfig.exportBounds;
      const center = bounds.getCenter();
      const subdivisions = [
        L.latLngBounds(bounds.getSouthWest(), center),
        L.latLngBounds(L.latLng(center.lat, bounds.getWest()), L.latLng(bounds.getNorth(), center.lng)),
        L.latLngBounds(L.latLng(bounds.getSouth(), center.lng), L.latLng(center.lat, bounds.getEast())),
        L.latLngBounds(center, bounds.getNorthEast()),
      ];
      calculateSubdivisionsMock.mockReturnValueOnce(subdivisions);

      // Should complete without errors even though no callback provided
      await performPngExport('base', [mockTrack], configWithSubdivisions, mockCallbacks);

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
      expect(mockCallbacks.onError).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases with Progress Callbacks', () => {
    it('should handle combined export with no tracks and progress callbacks', async () => {
      const onStageProgress = jest.fn();
      const callbacksWithProgress = {
        ...mockCallbacks,
        onStageProgress,
      };

      await performPngExport('combined', [], mockConfig, callbacksWithProgress);

      // Should call progress for base and labels, but not lines
      const stages = onStageProgress.mock.calls.map((call: any) => call[1].stage);
      expect(stages).toContain('base');
      expect(stages).toContain('tiles'); // labels
      // Lines stage should not be called since no tracks
      const linesCalls = onStageProgress.mock.calls.filter((call: any) => call[1].stage === 'lines');
      expect(linesCalls.length).toBe(0);
    });

    it('should handle all three stages in combined mode with all callbacks', async () => {
      const onStageProgress = jest.fn();
      const onSubdivisionStitched = jest.fn();
      const callbacksWithAll = {
        ...mockCallbacks,
        onStageProgress,
        onSubdivisionStitched,
      };

      // Mock to trigger all progress callbacks
      let callCount = 0;
      renderCanvasForBoundsMock.mockImplementation(async (options) => {
        callCount++;
        if (options.onTileProgress) {
          options.onTileProgress(1, 2);
        }
        if (options.onLineProgress) {
          options.onLineProgress(10, 20);
        }
        const canvas = createCanvas(800, 600);
        (canvas as any).toBlob = mockToBlob;
        return canvas as any;
      });

      await performPngExport('combined', [mockTrack], mockConfig, callbacksWithAll);

      // Verify all three stages were tracked
      const stages = new Set(onStageProgress.mock.calls.map((call: any) => call[1].stage));
      expect(stages.has('base')).toBe(true);
      expect(stages.has('lines')).toBe(true);
      expect(stages.has('tiles')).toBe(true); // labels

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should track progress across multiple subdivisions', async () => {
      const onStageProgress = jest.fn();
      const onSubdivisionStitched = jest.fn();
      const callbacksWithAll = {
        ...mockCallbacks,
        onStageProgress,
        onSubdivisionStitched,
      };

      const configWithSubdivisions = {
        ...mockConfig,
        maxDimension: 100,
      };

      // Create 2 subdivisions
      const bounds = mockConfig.exportBounds;
      const center = bounds.getCenter();
      const subdivisions = [
        L.latLngBounds(bounds.getSouthWest(), L.latLng(bounds.getNorth(), center.lng)),
        L.latLngBounds(L.latLng(bounds.getSouth(), center.lng), bounds.getNorthEast()),
      ];
      calculateSubdivisionsMock.mockReturnValueOnce(subdivisions);

      concatToBufferMock.mockImplementation(async (options: any) => {
        if (options.onProgress) {
          options.onProgress(1, 2);
          options.onProgress(2, 2);
        }
        return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]) as any;
      });

      await performPngExport('combined', [mockTrack], configWithSubdivisions, callbacksWithAll);

      // Should track progress for each subdivision (index 0 and 1)
      const subdivisionIndices = onStageProgress.mock.calls.map((call: any) => call[0]);
      expect(subdivisionIndices).toContain(0);
      expect(subdivisionIndices).toContain(1);

      // Should track stitching progress
      expect(onSubdivisionStitched).toHaveBeenCalledWith(1, 2);
      expect(onSubdivisionStitched).toHaveBeenCalledWith(2, 2);
    });
  });
});
