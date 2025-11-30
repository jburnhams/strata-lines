import { describe, it, expect, jest, beforeEach, afterEach, afterAll } from '@jest/globals';
import L from 'leaflet';
import type { Track } from '@/types';
import type { ExportConfig, ExportCallbacks, ImageSource } from '@/services/exportService';
import {
  createMockBlob,
  createMockCanvas,
  installMockCanvasSpies,
} from './testUtils/canvas';

// Mock HTMLCanvasElement.prototype.getContext
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => ({
    drawImage: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
      colorSpace: 'srgb',
    })),
    putImageData: jest.fn(),
    fillRect: jest.fn(),
  })),
  configurable: true,
});

// Mock browser APIs
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

(global as any).URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn(),
};

// Mock exportHelpers
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
jest.mock('image-stitch', () => ({
  concatStreaming: jest.fn(),
  concatToBuffer: jest.fn(),
}));

import { performPngExport } from '@/services/exportService';
import * as exportHelpers from '@/utils/exportHelpers';
import * as imageStitch from 'image-stitch';
import { calculateTrackBounds } from '@/services/gpxProcessor';

describe('Export Service unit tests', () => {
  let mockTrack: Track;
  let mockConfig: ExportConfig;
  let mockCallbacks: ExportCallbacks;
  let renderCanvasForBoundsMock: jest.MockedFunction<typeof exportHelpers.renderCanvasForBounds>;
  let calculateSubdivisionsMock: jest.MockedFunction<typeof exportHelpers.calculateSubdivisions>;
  let calculateGridLayoutMock: jest.MockedFunction<typeof exportHelpers.calculateGridLayout>;
  let resizeCanvasMock: jest.MockedFunction<typeof exportHelpers.resizeCanvas>;
  let createCompatibleCanvasMock: jest.MockedFunction<typeof exportHelpers.createCompatibleCanvas>;
  let concatStreamingMock: jest.MockedFunction<typeof imageStitch.concatStreaming>;

  // Spies
  let mockCreateElement: any;
  let mockAppendChild: any;
  let mockRemoveChild: any;
  let restoreCanvasSpies: () => void;

  beforeEach(() => {
    jest.clearAllMocks();

    const spies = installMockCanvasSpies({
      canvasFactory: () => createMockCanvasWithBlob(100, 100),
    });
    mockCreateElement = spies.createElementSpy;
    mockAppendChild = spies.appendChildSpy;
    mockRemoveChild = spies.removeChildSpy;
    restoreCanvasSpies = spies.restore;

    mockTrack = {
      id: 'test-1',
      name: 'Test Track',
      points: [[51.5, -0.1], [51.6, -0.05]],
      length: 10.5,
      isVisible: true,
      color: '#ff0000',
      activityType: 'Running',
    };

    mockConfig = {
      exportBounds: L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.6, 0.0)),
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
      onSubdivisionStitched: jest.fn(),
      onStageProgress: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn(),
    };

    renderCanvasForBoundsMock = exportHelpers.renderCanvasForBounds as jest.MockedFunction<typeof exportHelpers.renderCanvasForBounds>;
    renderCanvasForBoundsMock.mockImplementation(async (options) => {
      if (options.onTileProgress) options.onTileProgress(1, 1);
      if (options.onLineProgress) options.onLineProgress(1, 1);
      return createMockCanvasWithBlob(10, 10);
    });

    calculateSubdivisionsMock = exportHelpers.calculateSubdivisions as jest.MockedFunction<typeof exportHelpers.calculateSubdivisions>;
    calculateSubdivisionsMock.mockImplementation((bounds) => [bounds]);

    resizeCanvasMock = exportHelpers.resizeCanvas as jest.MockedFunction<typeof exportHelpers.resizeCanvas>;
    resizeCanvasMock.mockImplementation((source, w, h) => createMockCanvasWithBlob(w, h));

    calculateGridLayoutMock = exportHelpers.calculateGridLayout as jest.MockedFunction<typeof exportHelpers.calculateGridLayout>;
    calculateGridLayoutMock.mockImplementation((subdivisions: any[]) => ({
      rows: 1,
      columns: subdivisions.length,
      orderedSubdivisions: subdivisions,
    }));

    createCompatibleCanvasMock = exportHelpers.createCompatibleCanvas as jest.MockedFunction<typeof exportHelpers.createCompatibleCanvas>;
    createCompatibleCanvasMock.mockImplementation((w, h) => createMockCanvasWithBlob(w as number, h as number));

    concatStreamingMock = imageStitch.concatStreaming as jest.MockedFunction<typeof imageStitch.concatStreaming>;
    // Mock successful streaming
    concatStreamingMock.mockImplementation(function* () {
      yield new Uint8Array([1, 2, 3]);
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (restoreCanvasSpies) restoreCanvasSpies();
  });

  // Helper to trigger the factories passed to concatStreaming
  async function triggerFactories(mock: any) {
    const call = mock.mock.calls[0];
    if (!call) return;
    const options = call[0];
    const inputs = options.inputs as ImageSource[];
    for (const input of inputs) {
       if (input.factory) {
           await input.factory();
       }
    }
  }

  describe('performPngExport', () => {
    it('should export combined type with base, lines, and labels', async () => {
      await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

      expect(concatStreamingMock).toHaveBeenCalled();
      await triggerFactories(concatStreamingMock);

      // Verify layers rendered
      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(3);
      // Base
      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(expect.objectContaining({ layerType: 'base' }));
      // Lines
      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(expect.objectContaining({ layerType: 'lines' }));
      // Labels
      expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(expect.objectContaining({ layerType: 'labels-only' }));

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should skip lines when no visible tracks', async () => {
      await performPngExport('combined', [], mockConfig, mockCallbacks);

      await triggerFactories(concatStreamingMock);
      // Base + Labels
      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(2);
    });

    it('should skip labels if not esriImagery', async () => {
      const config = { ...mockConfig, tileLayerKey: 'osm' };
      await performPngExport('combined', [mockTrack], config, mockCallbacks);
      await triggerFactories(concatStreamingMock);
      // Base + Lines
      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(2);
    });

    it('should handle subdivisions', async () => {
        const sub1 = L.latLngBounds(L.latLng(0,0), L.latLng(1,1));
        const sub2 = L.latLngBounds(L.latLng(1,1), L.latLng(2,2));
        calculateSubdivisionsMock.mockReturnValue([sub1, sub2]);

        await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);

        // Check that concatStreaming received 2 inputs
        const call = concatStreamingMock.mock.calls[0][0];
        expect((call.inputs as any[]).length).toBe(2);

        // Execute factories to verify progress reporting
        await triggerFactories(concatStreamingMock);

        // 2 subdivisions * 2 layers (Base + Labels) = 4 calls.
        // Lines layer is skipped because the mock track (lat 51.5) is outside these subdivisions (lat 0-2).
        expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(4);
        expect(mockCallbacks.onSubdivisionProgress).toHaveBeenCalledTimes(2);
    });

    it('should verify single layer export (lines)', async () => {
        await performPngExport('lines', [mockTrack], mockConfig, mockCallbacks);
        await triggerFactories(concatStreamingMock);
        expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(1);
        expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(expect.objectContaining({ layerType: 'lines' }));
    });

    it('should verify single layer export (base)', async () => {
        await performPngExport('base', [mockTrack], mockConfig, mockCallbacks);
        await triggerFactories(concatStreamingMock);
        expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(1);
        expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(expect.objectContaining({ layerType: 'base' }));
    });

    it('should verify single layer export (labels)', async () => {
        await performPngExport('labels', [mockTrack], mockConfig, mockCallbacks);
        await triggerFactories(concatStreamingMock);
        expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(1);
        expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(expect.objectContaining({ layerType: 'labels-only' }));
    });
  });

  describe('Factory logic details', () => {
      it('should return white filled canvas if JPEG and background needed', async () => {
          // Combined mode without base layer -> should fill white
          const config = { ...mockConfig, outputFormat: 'jpeg' as const, includedLayers: { base: false, lines: true, labels: false } };

          await performPngExport('combined', [mockTrack], config, mockCallbacks);

          // Capture factory
          const call = concatStreamingMock.mock.calls[0][0];
          const factory = (call.inputs as any[])[0].factory;

          await factory();

          // Verify fillRect was called on the composition canvas
          // We need to check the canvas created by createCompatibleCanvas
          const createdCanvases = createCompatibleCanvasMock.mock.results.map(r => r.value);
          // One of them is the composition canvas
          // The mock implementation of createCompatibleCanvas returns a canvas with a mock context
          // We check if any context had fillStyle white and fillRect called

          const fillRectCalls = createdCanvases.some((canvas: any) => {
             const ctx = canvas.getContext('2d');
             return ctx.fillStyle === '#ffffff' && ctx.fillRect.mock.calls.length > 0;
          });
          expect(fillRectCalls).toBe(true);
      });

      it('should handle JSDOM -> Napi canvas conversion logic', async () => {
         // This tests the branch where source canvas is JSDOM (HTMLCanvasElement) and target is Napi (CanvasElement)

         // Mock createCompatibleCanvas to return "Napi" canvas
         createCompatibleCanvasMock.mockImplementation((w, h) => {
             const c = createMockCanvasWithBlob(w as number, h as number);
             Object.defineProperty(c, 'constructor', { value: { name: 'CanvasElement' } });
             return c;
         });

         // Mock renderCanvasForBounds to return "JSDOM" canvas
         renderCanvasForBoundsMock.mockImplementation(async () => {
             const c = createMockCanvasWithBlob(10, 10);
             Object.defineProperty(c, 'constructor', { value: { name: 'HTMLCanvasElement' } });
             return c as any;
         });

         await performPngExport('combined', [mockTrack], mockConfig, mockCallbacks);
         await triggerFactories(concatStreamingMock);

         // If logic works, it should call putImageData on a temp Napi canvas and then drawImage
         // We can check if getContext('2d').putImageData was called on any created canvas
         const createdCanvases = createCompatibleCanvasMock.mock.results.map(r => r.value);
         const putImageDataCalled = createdCanvases.some((c: any) => c.getContext('2d').putImageData.mock.calls.length > 0);

         expect(putImageDataCalled).toBe(true);
      });

      it('should filter tracks by bounds inside factory', async () => {
          // Mock track outside bounds
          (calculateTrackBounds as jest.Mock).mockReturnValue({ minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 });

          await performPngExport('lines', [mockTrack], mockConfig, mockCallbacks);
          await triggerFactories(concatStreamingMock);

          expect(renderCanvasForBoundsMock).toHaveBeenCalledWith(expect.objectContaining({
              visibleTracks: []
          }));
      });
  });

  describe('Error handling', () => {
      it('should call onError if factory execution fails', async () => {
          // We can't easily simulate image-stitch failing the factory call inside performPngExport
          // because performPngExport awaits the stream.
          // But we can simulate renderCanvasForBounds failing when we trigger it manually
          // or if we mock concatStreaming to throw.

          concatStreamingMock.mockImplementation(() => {
              throw new Error('Stream failed');
          });

          await performPngExport('base', [mockTrack], mockConfig, mockCallbacks);
          expect(mockCallbacks.onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Stream failed' }));
      });
  });
});
