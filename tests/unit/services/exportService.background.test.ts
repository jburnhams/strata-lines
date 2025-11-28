
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
  createCompatibleCanvas: jest.fn(),
}));

jest.mock('image-stitch/bundle', () => ({
  concatToBuffer: jest.fn(async () => new Uint8Array([0])),
  concatStreaming: jest.fn(async function* (options: any) {
    // Consume inputs to trigger rendering logic (which happens in scanlines generator)
    if (options.inputs && Array.isArray(options.inputs)) {
      for (const input of options.inputs) {
        if (input.scanlines) {
          for await (const _ of input.scanlines()) {
            // consume
          }
        }
      }
    }
    yield new Uint8Array([0]);
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

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Canvas and Context
    const ctx = {
      fillStyle: '#000000',
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      getImageData: jest.fn(),
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
    createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas);

    // Mock renderCanvasForBounds to return a canvas
    (renderCanvasForBounds as jest.Mock).mockResolvedValue(mockCanvas);
    (createCompatibleCanvas as jest.Mock).mockReturnValue(mockCanvas);
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

    // Check if fillRect was called with correct args (white fill)
    // Updated for streaming row-by-row rendering: fills 1px high rows
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 100, 1);
  });

  test('should NOT fill white background for PNG format with base layer', async () => {
    await performPngExport('combined', [], { ...baseConfig, outputFormat: 'png' }, mockCallbacks);
    expect(mockCtx.fillRect).not.toHaveBeenCalled();
  });

  test('should NOT fill white background for PNG format without base layer', async () => {
     await performPngExport('combined', [], {
        ...baseConfig,
        outputFormat: 'png',
        includedLayers: { base: false, lines: true, labels: true }
    }, mockCallbacks);

    expect(mockCtx.fillRect).not.toHaveBeenCalled();
  });

  test('should NOT fill white background for JPEG format WITH base layer', async () => {
    await performPngExport('combined', [], {
        ...baseConfig,
        outputFormat: 'jpeg',
        includedLayers: { base: true, lines: true, labels: true }
    }, mockCallbacks);

    expect(mockCtx.fillRect).not.toHaveBeenCalled();
  });
});
