
import { performPngExport, ExportConfig, ExportCallbacks } from '@/services/exportService';
import { renderCanvasForBounds, createCompatibleCanvas } from '@/utils/exportHelpers';

// Mock mapCalculations
jest.mock('@/utils/mapCalculations', () => ({
  calculatePixelDimensions: jest.fn(() => ({ width: 100, height: 100 })),
}));

// Mock dependencies
jest.mock('@/utils/exportHelpers', () => ({
  calculateSubdivisions: jest.fn(() => [{ getNorth: () => 0, getSouth: () => 0, getEast: () => 0, getWest: () => 0 }]),
  calculateGridLayout: jest.fn((subdivisions) => ({ rows: 1, columns: 1, orderedSubdivisions: subdivisions })),
  renderCanvasForBounds: jest.fn(),
  resizeCanvas: jest.fn((canvas) => canvas),
  createCompatibleCanvas: jest.fn((w, h) => {
      // Return a simple mock canvas object that satisfies getContext
      return {
          width: w,
          height: h,
          getContext: jest.fn(() => ({
              clearRect: jest.fn(),
              fillStyle: '',
              fillRect: jest.fn(),
              drawImage: jest.fn(),
              getImageData: jest.fn(() => ({ data: new Uint8Array(w * 4) })),
              putImageData: jest.fn(),
          })),
          toBlob: jest.fn((cb) => cb(new Blob(['']))),
          toBuffer: jest.fn(() => new Uint8Array([])),
          constructor: { name: 'CanvasElement' }
      };
  })
}));

jest.mock('@/services/gpxProcessor', () => ({
    calculateTrackBounds: jest.fn(() => ({ minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 }))
}));

jest.mock('image-stitch', () => ({
  concatToBuffer: jest.fn(async () => new Uint8Array([0])),
  // Mock concatStreaming to actually iterate the input factories
  concatStreaming: jest.fn(async function* (options: any) {
      if (options && options.inputs) {
          for (const input of options.inputs) {
              // Call factory to simulate rendering logic
              if (input.factory) {
                await input.factory();
              }
          }
      }
      yield new Uint8Array([0]);
  }),
}));

describe('exportService background color', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;
  let compositionCtxMock: any;
  let createCompatibleCanvasMock: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Canvas and Context returned by renderCanvasForBounds (source layers)
    mockCtx = {
      fillStyle: '#000000',
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8Array(400) })),
      putImageData: jest.fn(),
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      width: 100,
      height: 100,
      getContext: jest.fn(() => mockCtx),
      toBlob: jest.fn((cb) => cb(new Blob(['']))),
      constructor: { name: 'HTMLCanvasElement' },
    } as unknown as HTMLCanvasElement;

    (renderCanvasForBounds as jest.Mock).mockResolvedValue(mockCanvas);

    // Mock createCompatibleCanvas which creates the COMPOSITION canvas
    const exportHelpers = require('@/utils/exportHelpers');
    createCompatibleCanvasMock = exportHelpers.createCompatibleCanvas;

    // Create a fresh mock context for the composition canvas for each test
    compositionCtxMock = {
        clearRect: jest.fn(),
        fillStyle: '',
        fillRect: jest.fn(),
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({ data: new Uint8Array(400) })),
        putImageData: jest.fn(),
    };

    createCompatibleCanvasMock.mockReturnValue({
        width: 100,
        height: 100,
        getContext: jest.fn(() => compositionCtxMock),
        constructor: { name: 'CanvasElement' },
        toBlob: jest.fn((cb) => cb(new Blob(['']))),
        toBuffer: jest.fn(() => new Uint8Array([]))
    });

    if (!global.URL.createObjectURL) {
        global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
        global.URL.revokeObjectURL = jest.fn();
    }
  });

  const baseConfig: ExportConfig = {
    exportBounds: {} as any,
    derivedExportZoom: 10,
    previewZoom: 10,
    zoom: 10,
    maxDimension: 1000,
    labelDensity: 1,
    tileLayerKey: 'esriImagery',
    lineThickness: 1,
    exportQuality: 1,
    outputFormat: 'png',
    jpegQuality: 80,
    includedLayers: { base: true, lines: true, labels: true },
  };

  const mockCallbacks: ExportCallbacks = {
    onSubdivisionsCalculated: jest.fn(),
    onSubdivisionProgress: jest.fn(),
    onComplete: jest.fn(),
    onError: jest.fn(),
  };

  test('should fill white background for JPEG format without base layer', async () => {
    // We need to ensure we have "empty" or "transparent" source layers to trigger composition logic
    // or just rely on the fact that if base is missing in JPEG, it fills background.

    await performPngExport('combined', [], {
        ...baseConfig,
        outputFormat: 'jpeg',
        includedLayers: { base: false, lines: true, labels: true }
    }, mockCallbacks);

    // Verify fillRect called on composition canvas (100x100)
    expect(compositionCtxMock.fillRect).toHaveBeenCalledWith(0, 0, 100, 100);
    expect(compositionCtxMock.fillStyle).toBe('#ffffff');
  });

  test('should NOT fill white background for PNG format with base layer', async () => {
    await performPngExport('combined', [], { ...baseConfig, outputFormat: 'png' }, mockCallbacks);

    // Should verify that fillStyle wasn't set to white AND fillRect called
    // Note: It might call clearRect or fillRect with transparent if logic dictates,
    // but definitely not white for PNG
    if (compositionCtxMock.fillRect.mock.calls.length > 0) {
        expect(compositionCtxMock.fillStyle).not.toBe('#ffffff');
    } else {
        expect(compositionCtxMock.fillRect).not.toHaveBeenCalled();
    }
  });

  test('should NOT fill white background for PNG format without base layer', async () => {
     await performPngExport('combined', [], {
        ...baseConfig,
        outputFormat: 'png',
        includedLayers: { base: false, lines: true, labels: true }
    }, mockCallbacks);

    if (compositionCtxMock.fillRect.mock.calls.length > 0) {
        expect(compositionCtxMock.fillStyle).not.toBe('#ffffff');
    } else {
        expect(compositionCtxMock.fillRect).not.toHaveBeenCalled();
    }
  });

  test('should NOT fill white background for JPEG format WITH base layer', async () => {
    await performPngExport('combined', [], {
        ...baseConfig,
        outputFormat: 'jpeg',
        includedLayers: { base: true, lines: true, labels: true }
    }, mockCallbacks);

    if (compositionCtxMock.fillRect.mock.calls.length > 0) {
        expect(compositionCtxMock.fillStyle).not.toBe('#ffffff');
    } else {
        expect(compositionCtxMock.fillRect).not.toHaveBeenCalled();
    }
  });
});
