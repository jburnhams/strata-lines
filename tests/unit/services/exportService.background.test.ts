
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
              putImageData: jest.fn(), // Added putImageData
          }))
      };
  })
}));

jest.mock('@/utils/mapCalculations', () => ({
    calculatePixelDimensions: jest.fn(() => ({ width: 100, height: 100 })),
}));

jest.mock('image-stitch/bundle', () => ({
  concatToBuffer: jest.fn(async () => new Uint8Array([0])),
  // Mock concatStreaming to actually iterate the input decoders so that scanlines() is called
  concatStreaming: jest.fn(async function* (options: any) {
      // options.inputs is array of decoders
      if (options && options.inputs) {
          for (const decoder of options.inputs) {
              // Call getHeader to simulate lifecycle
              await decoder.getHeader();
              // Iterate scanlines to trigger rendering logic
              for await (const line of decoder.scanlines()) {
                  yield line;
              }
          }
      } else {
          yield new Uint8Array([0]);
      }
  }),
}));

// Mock @napi-rs/canvas to force fallback to document.createElement
jest.mock('@napi-rs/canvas', () => {
  throw new Error('Force fallback');
}, { virtual: true });

describe('exportService background color', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;
  let createElementSpy: jest.SpyInstance;
  let rowCtxMock: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Canvas and Context
    const ctx = {
      fillStyle: '#000000',
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8Array(400) })), // 100 * 4
      putImageData: jest.fn(),
    };
    mockCtx = ctx as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      width: 100,
      height: 100,
      getContext: jest.fn(() => mockCtx),
      toBlob: jest.fn((cb) => cb(new Blob(['']))),
      constructor: { name: 'HTMLCanvasElement' },
    } as unknown as HTMLCanvasElement;

    // Mock document.createElement
    createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
            return mockCanvas;
        }
        if (tagName === 'a') {
            const anchor = document.createElementNS("http://www.w3.org/1999/xhtml", "a") as HTMLAnchorElement;
            anchor.click = jest.fn();
            return anchor;
        }
        return document.createElementNS("http://www.w3.org/1999/xhtml", tagName);
    });

    // Mock renderCanvasForBounds to return a canvas
    (renderCanvasForBounds as jest.Mock).mockResolvedValue(mockCanvas);

    // Setup the mock for createCompatibleCanvas (which is used for rowCanvas)
    const exportHelpers = require('@/utils/exportHelpers');
    rowCtxMock = {
        clearRect: jest.fn(),
        fillStyle: '',
        fillRect: jest.fn(),
        drawImage: jest.fn(),
        getImageData: jest.fn(() => ({ data: new Uint8Array(400) })),
        putImageData: jest.fn(),
    };
    exportHelpers.createCompatibleCanvas.mockReturnValue({
        width: 100,
        height: 1,
        getContext: jest.fn(() => rowCtxMock),
        constructor: { name: 'CanvasElement' } // Mimic @napi-rs canvas
    });

    // Explicitly mock URL.createObjectURL for this test scope
    if (!global.URL.createObjectURL) {
        global.URL.createObjectURL = jest.fn(() => 'blob:test-url');
        global.URL.revokeObjectURL = jest.fn();
    }
  });

  afterEach(() => {
    createElementSpy.mockRestore();
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
    await performPngExport('combined', [], {
        ...baseConfig,
        outputFormat: 'jpeg',
        includedLayers: { base: false, lines: true, labels: true }
    }, mockCallbacks);

    // The logic uses the rowCanvas (temp canvas) to fill rect
    expect(rowCtxMock.fillRect).toHaveBeenCalledWith(0, 0, 100, 1);
    expect(rowCtxMock.fillStyle).toBe('#ffffff');
  });

  test('should NOT fill white background for PNG format with base layer', async () => {
    await performPngExport('combined', [], { ...baseConfig, outputFormat: 'png' }, mockCallbacks);
    expect(rowCtxMock.fillRect).not.toHaveBeenCalled();
  });

  test('should NOT fill white background for PNG format without base layer', async () => {
     await performPngExport('combined', [], {
        ...baseConfig,
        outputFormat: 'png',
        includedLayers: { base: false, lines: true, labels: true }
    }, mockCallbacks);

    expect(rowCtxMock.fillRect).not.toHaveBeenCalled();
  });

  test('should NOT fill white background for JPEG format WITH base layer', async () => {
    await performPngExport('combined', [], {
        ...baseConfig,
        outputFormat: 'jpeg',
        includedLayers: { base: true, lines: true, labels: true }
    }, mockCallbacks);

    expect(rowCtxMock.fillRect).not.toHaveBeenCalled();
  });
});
