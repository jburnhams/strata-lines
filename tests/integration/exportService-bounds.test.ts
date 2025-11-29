import { performPngExport, type ExportConfig } from '@/services/exportService';
import * as exportHelpers from '@/utils/exportHelpers';
import { calculatePixelDimensions } from '@/utils/mapCalculations';
import L from 'leaflet';
import type { Track } from '@/types';

// Mock exportHelpers
jest.mock('@/utils/exportHelpers', () => {
  const original = jest.requireActual('@/utils/exportHelpers');
  return {
    ...original,
    renderCanvasForBounds: jest.fn(),
    calculateSubdivisions: jest.fn(),
  };
});

describe('performPngExport - Bounds Checking', () => {
  jest.setTimeout(30000); // Increase timeout for large canvas processing
  const mockRenderCanvasForBounds = exportHelpers.renderCanvasForBounds as jest.Mock;
  const mockCalculateSubdivisions = exportHelpers.calculateSubdivisions as jest.Mock;

  const createTrack = (id: string, points: [number, number][]): Track => ({
    id,
    name: `Track ${id}`,
    points,
    length: 10,
    isVisible: true,
    activityType: 'running',
    // Intentionally leaving bounds undefined to test fallback calculation
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock implementation using real calculatePixelDimensions to ensure size matches expectation
    mockRenderCanvasForBounds.mockImplementation(async (options: any) => {
      const { width, height } = calculatePixelDimensions(options.bounds, options.zoomForRender);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      // Mock toBlob because jsdom doesn't implement it
      canvas.toBlob = jest.fn((callback) => {
        callback(new Blob(['test'], { type: 'image/png' }));
      });

      return canvas;
    });
  });

  it('should filter tracks based on subdivision bounds', async () => {
    // Define subdivision bounds (London area) - Small realistic bounds
    const subdivisionBounds = L.latLngBounds([51.50, -0.10], [51.51, -0.08]);
    mockCalculateSubdivisions.mockReturnValue([subdivisionBounds]);

    // Track 1: Inside (fully contained)
    const track1 = createTrack('1', [[51.505, -0.09], [51.506, -0.085]]);
    // Track 2: Outside (well north)
    const track2 = createTrack('2', [[51.60, -0.09], [51.61, -0.08]]);
    // Track 3: Partially Inside/Overlapping (crossing from SW to NE)
    const track3 = createTrack('3', [[51.49, -0.11], [51.52, -0.07]]);

    const visibleTracks = [track1, track2, track3];

    const config: ExportConfig = {
      exportBounds: subdivisionBounds,
      derivedExportZoom: 10,
      previewZoom: 10,
      zoom: 10,
      maxDimension: 1000,
      labelDensity: 1,
      tileLayerKey: 'osm',
      lineThickness: 2,
      exportQuality: 1,
      outputFormat: 'png',
      jpegQuality: 0.8,
      includedLayers: { base: false, lines: true, labels: false },
    };

    const callbacks = {
      onSubdivisionsCalculated: jest.fn(),
      onSubdivisionProgress: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn((e) => console.error('Callbacks onError:', e)),
    };

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:url');
    global.URL.revokeObjectURL = jest.fn();

    await performPngExport('lines', visibleTracks, config, callbacks);

    expect(mockRenderCanvasForBounds).toHaveBeenCalled();

    // Find the call for the 'lines' layer
    const linesCall = mockRenderCanvasForBounds.mock.calls.find(
      (call) => call[0].layerType === 'lines'
    );

    expect(linesCall).toBeDefined();
    const passedTracks: Track[] = linesCall[0].visibleTracks;

    // Verify track1 is included (inside)
    expect(passedTracks.some((t) => t.id === '1')).toBe(true);
    // Verify track2 is excluded (outside)
    expect(passedTracks.some((t) => t.id === '2')).toBe(false);
    // Verify track3 is included (overlaps)
    expect(passedTracks.some((t) => t.id === '3')).toBe(true);

    // Verify bounds were calculated for tracks
    expect(passedTracks.find((t) => t.id === '1')?.bounds).toBeDefined();
    expect(passedTracks.find((t) => t.id === '3')?.bounds).toBeDefined();

    expect(callbacks.onComplete).toHaveBeenCalled();
  });
});
