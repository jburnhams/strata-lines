import { describe, it, expect, jest, beforeEach, afterEach, afterAll } from '@jest/globals';
import L from 'leaflet';
import type { Track } from '@/types';
import type { ExportConfig, ExportCallbacks } from '@/services/exportService';
import {
  createMockBlob,
  createMockCanvas,
  installMockCanvasSpies,
} from './testUtils/canvas';

// UNIT TEST - Uses mocks, no real leaflet-node or real canvas implementations
// Mock the browser-specific APIs first, before any imports
const mockToBlob = jest.fn((callback: (blob: Blob | null) => void) => {
  callback(createMockBlob());
});

const createMockCanvasWithBlob = (width: number, height: number) =>
  createMockCanvas(width, height, {
    toBlob: (callback) => {
      mockToBlob(callback);
    },
    contextOverrides: {
        getImageData: jest.fn((x: number, y: number, w: number, h: number) => ({
            data: new Uint8ClampedArray(w * h * 4).fill(0),
            width: w,
            height: h,
            colorSpace: 'srgb',
        } as ImageData)),
        putImageData: jest.fn(),
        fillRect: jest.fn(),
        fillStyle: '#000000',
    } as any,
  });

const { createElementSpy: mockCreateElement, appendChildSpy: mockAppendChild, removeChildSpy: mockRemoveChild, restore: restoreCanvasSpies } =
  installMockCanvasSpies({
    canvasFactory: () => createMockCanvasWithBlob(100, 100),
  });

(global as any).URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn(),
};

// Mock the exportHelpers module completely
jest.mock('@/utils/exportHelpers', () => ({
  renderCanvasForBounds: jest.fn(),
  calculateSubdivisions: jest.fn(),
  calculateGridLayout: jest.fn(),
  resizeCanvas: jest.fn(),
  createCompatibleCanvas: jest.fn(),
}));

// Mock mapCalculations
jest.mock('@/utils/mapCalculations', () => ({
  calculatePixelDimensions: jest.fn(() => ({ width: 10, height: 10 })),
}));

// Mock gpxProcessor
jest.mock('@/services/gpxProcessor', () => {
    return {
        calculateTrackBounds: jest.fn((points: any[]) => {
            // Simple bounding box calculation for default behavior
            if (!points || points.length === 0) return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
            return {
                minLat: Math.min(...points.map(p => p[0])),
                maxLat: Math.max(...points.map(p => p[0])),
                minLng: Math.min(...points.map(p => p[1])),
                maxLng: Math.max(...points.map(p => p[1])),
            };
        }),
    };
});

// Mock image-stitch library
jest.mock('image-stitch/bundle', () => ({
  concatStreaming: jest.fn(),
  concatToBuffer: jest.fn(), // still mock it just in case
}));

// Now import after mocks are set up
import { performPngExport } from '@/services/exportService';
import * as exportHelpers from '@/utils/exportHelpers';
import * as imageStitch from 'image-stitch/bundle';
import { calculateTrackBounds } from '@/services/gpxProcessor';

describe('Export Service unit tests', () => {
  let mockTrack: Track;
  let mockConfig: ExportConfig;
  let mockCallbacks: ExportCallbacks;
  let renderCanvasForBoundsMock: jest.MockedFunction<typeof exportHelpers.renderCanvasForBounds>;
  let calculateSubdivisionsMock: jest.MockedFunction<typeof exportHelpers.calculateSubdivisions>;
  let calculateGridLayoutMock: jest.MockedFunction<typeof exportHelpers.calculateGridLayout>;
  let resizeCanvasMock: jest.MockedFunction<typeof exportHelpers.resizeCanvas>;
  let concatStreamingMock: jest.MockedFunction<typeof imageStitch.concatStreaming>;

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
      activityType: 'Running',
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
      outputFormat: 'png',
      jpegQuality: 85,
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
      if (options.onTileProgress) options.onTileProgress(1, 1);
      if (options.onLineProgress) options.onLineProgress(1, 1);
      return createMockCanvasWithBlob(10, 10);
    });

    // Mock calculateSubdivisions - default to single subdivision
    calculateSubdivisionsMock = exportHelpers.calculateSubdivisions as jest.MockedFunction<typeof exportHelpers.calculateSubdivisions>;
    calculateSubdivisionsMock.mockImplementation((bounds) => {
      return [bounds];
    });

    // Mock resizeCanvas
    resizeCanvasMock = exportHelpers.resizeCanvas as jest.MockedFunction<typeof exportHelpers.resizeCanvas>;
    resizeCanvasMock.mockImplementation((sourceCanvas, width, height) => {
      return createMockCanvasWithBlob(width, height);
    });

    // Mock calculateGridLayout
    calculateGridLayoutMock = exportHelpers.calculateGridLayout as jest.MockedFunction<typeof exportHelpers.calculateGridLayout>;
    calculateGridLayoutMock.mockImplementation((subdivisions: any[]) => {
      // For a simple 2x2 grid layout (most common case with 4 subdivisions)
      const rows = Math.ceil(Math.sqrt(subdivisions.length));
      const columns = Math.ceil(subdivisions.length / rows);
      return {
        rows,
        columns,
        orderedSubdivisions: subdivisions,
      };
    });

    // Mock createCompatibleCanvas
    (exportHelpers.createCompatibleCanvas as jest.Mock).mockImplementation((w: any, h: any) => {
        return createMockCanvasWithBlob(w, h);
    });

    // Mock image-stitch concatStreaming function
    concatStreamingMock = imageStitch.concatStreaming as jest.MockedFunction<typeof imageStitch.concatStreaming>;

    // Create an async generator that yields a simple chunk
    async function* mockGenerator() {
      yield new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    }

    concatStreamingMock.mockImplementation((options: any) => {
      // Consume the input generator if provided to trigger side effects (rendering)
      if (options.inputs) {
        // We can't easily await inside the mock implementation synchronously if we want to return a generator
        // But concatStreaming returns an async generator, so we can wrap logic there
        async function* wrappedGenerator() {
          // Iterate the inputs to trigger rendering logic in tests
          try {
              // Handle array of ImageDecoders (new implementation)
              if (Array.isArray(options.inputs)) {
                  for (const decoder of options.inputs) {
                      if (decoder.getHeader) await decoder.getHeader();
                      if (decoder.scanlines) {
                          for await (const _ of decoder.scanlines()) {
                              // consume scanlines to trigger rendering
                          }
                      }
                  }
              }
              // Handle async iterator (legacy implementation or other inputs)
              else if (typeof options.inputs[Symbol.asyncIterator] === 'function') {
                  for await (const _ of options.inputs) {
                    // consume
                  }
              }
          } catch (error) {
             // propagate error if input generator fails
             throw error;
          }
          yield new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
        }
        return wrappedGenerator();
      }
      return mockGenerator();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    restoreCanvasSpies();
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

    it('should complete successfully', async () => {
      await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

      // We don't strictly check for 'canvas' creation here because it might use a cached row canvas
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

      // Should call concatStreaming
      expect(concatStreamingMock).toHaveBeenCalled();

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

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
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

      const bounds = mockConfig.exportBounds;
      const center = bounds.getCenter();
      const subdivisions = [
        L.latLngBounds(bounds.getSouthWest(), center),
        L.latLngBounds(L.latLng(center.lat, bounds.getWest()), L.latLng(bounds.getNorth(), center.lng)),
        L.latLngBounds(L.latLng(bounds.getSouth(), center.lng), L.latLng(center.lat, bounds.getEast())),
        L.latLngBounds(center, bounds.getNorthEast()),
      ];
      calculateSubdivisionsMock.mockReturnValueOnce(subdivisions);

      // Mock concatStreaming to simulate progress
      concatStreamingMock.mockImplementation((options: any) => {
        if (options.onProgress) {
          options.onProgress(1, 4);
          options.onProgress(2, 4);
        }
        async function* gen() {
          // Consume input to ensure rendering happens
          if (options.inputs) {
            for await (const _ of options.inputs) {}
          }
          yield new Uint8Array([0]);
        }
        return gen();
      });

      await performPngExport('base', [mockTrack], configWithSubdivisions, callbacksWithStitching);

      // Should have been called with progress updates
      expect(onSubdivisionStitched).toHaveBeenCalled();
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

      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(expect.objectContaining({
        bounds: mockConfig.exportBounds,
        layerType: 'lines',
        zoomForRender: 12,
        visibleTracks: [mockTrack],
        tileLayerKey: 'esriImagery',
        lineThickness: 3,
        exportQuality: 2,
      }));
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
          const canvas = createMockCanvasWithBlob(800, 600);
          return canvas as any;
        } else if (callCount === 2) {
          // Lines layer: 800x600
          const canvas = createMockCanvasWithBlob(800, 600);
          return canvas as any;
        } else {
          // Labels layer: different size 1600x1200 (at higher zoom)
          const canvas = createMockCanvasWithBlob(1600, 1200);
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
        const canvas = createMockCanvasWithBlob(800, 600);
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
          const canvas = createMockCanvasWithBlob(1000, 500);
          return canvas as any;
        } else if (callCount === 2) {
          // Lines layer: 1000x500
          const canvas = createMockCanvasWithBlob(1000, 500);
          return canvas as any;
        } else {
          // Labels layer: different size 2000x1500
          const canvas = createMockCanvasWithBlob(2000, 1500);
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

  describe('Additional Coverage Tests', () => {
      it('should filter out tracks outside of subdivision bounds', async () => {
          // Mock calculateTrackBounds to return bounds completely outside the export bounds
          // Export bounds are 51.5, -0.1 to 51.6, 0.0
          (calculateTrackBounds as jest.Mock).mockReturnValue({
              minLat: 0, maxLat: 1, minLng: 0, maxLng: 1
          });

          const trackWithoutBounds = { ...mockTrack, bounds: undefined };

          // We use 'combined' mode but only with lines to check filtering
          await performPngExport('lines', [trackWithoutBounds], mockConfig, mockCallbacks);

          // Expect renderCanvasForBounds to be called with visibleTracks = [] (empty) because the track was filtered out
          expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(
              expect.objectContaining({
                  visibleTracks: []
              })
          );
      });

      it('should report onStageProgress', async () => {
          const onStageProgress = jest.fn();
          const callbacks = { ...mockCallbacks, onStageProgress };

          await performPngExport('base', [mockTrack], mockConfig, callbacks);

          // We expect multiple calls: one for 'starting' (SubdivisionDecoder constructor/scanlines start)
          // and inside the loop (if height is sufficient, here mock is 10x10 so loop runs 10 times)
          // onStageProgress is called for every 10 rows or last row.
          expect(onStageProgress).toHaveBeenCalled();
          expect(onStageProgress).toHaveBeenCalledWith(
             expect.any(Number),
             expect.objectContaining({ stageLabel: expect.any(String) })
          );
      });

      it('should clean up canvases on close', async () => {
          let capturedDecoders: any[] = [];
          concatStreamingMock.mockImplementation((options: any) => {
               capturedDecoders = options.inputs;
               // We must return a generator
               return (async function*() { yield new Uint8Array(); })();
          });

          const canvas = createMockCanvasWithBlob(100, 100);
          renderCanvasForBoundsMock.mockResolvedValue(canvas as any);

          await performPngExport('base', [mockTrack], mockConfig, mockCallbacks);

          expect(capturedDecoders.length).toBeGreaterThan(0);
          const decoder = capturedDecoders[0];

          // Trigger render to populate canvases
          if (decoder.scanlines) {
              const gen = decoder.scanlines();
              await gen.next(); // render happens here
              // We need to finish the generator to ensure cleanup?
              // Or call close() manually as the test is about manual close or memory management.
              // The class has close().
          }

          await decoder.close();

          expect(canvas.width).toBe(0);
          expect(canvas.height).toBe(0);
      });

      it('should handle JSDOM to Napi canvas conversion in scanlines', async () => {
         // Mock createCompatibleCanvas to return a "Napi" canvas (mock constructor name)
         (exportHelpers.createCompatibleCanvas as jest.Mock).mockImplementation((w: any, h: any) => {
             const c = createMockCanvasWithBlob(w, h);
             // We mimic a Napi canvas by having 'constructor.name' equal to 'CanvasElement'
             // Note: In strict mode/classes this might be read-only, but in mocks/js objects it should work.
             // If not, we rely on the object shape or how it's checked.
             // The code checks: rowCanvas.constructor.name === 'CanvasElement'
             Object.defineProperty(c, 'constructor', { value: { name: 'CanvasElement' }, configurable: true });
             return c;
         });

         // Mock renderCanvasForBounds to return a "JSDOM" canvas
         renderCanvasForBoundsMock.mockImplementation(async () => {
             const c = createMockCanvasWithBlob(10, 10);
             Object.defineProperty(c, 'constructor', { value: { name: 'HTMLCanvasElement' }, configurable: true });
             return c as any;
         });

         // We use combined mode to have > 1 canvas so compositing logic triggers
         await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

         // Just verifying it runs without error through that branch is coverage enough.
         expect(mockCallbacks.onComplete).toHaveBeenCalled();
      });

      it('should handle browser canvas creation when not in node', async () => {
          // This tests the branch in getRowCanvas where process.versions.node is false
          const originalVersions = process.versions;
          Object.defineProperty(process, 'versions', { value: undefined });

          try {
             // Use combined to ensure > 1 canvas so getRowCanvas is called for compositing
             await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);
             // In this case, getRowCanvas should use document.createElement('canvas')
             // Which is spied on.
             expect(mockCreateElement).toHaveBeenCalledWith('canvas');
          } finally {
             Object.defineProperty(process, 'versions', { value: originalVersions });
          }
      });

      it('should handle empty layers correctly', async () => {
          // combined type but no layers selected
          const config = {
              ...mockConfig,
              includedLayers: { base: false, lines: false, labels: false }
          };

          await performPngExport('combined', [mockTrack], config, mockCallbacks);

          expect(mockCallbacks.onComplete).toHaveBeenCalled();
      });
  });
});
