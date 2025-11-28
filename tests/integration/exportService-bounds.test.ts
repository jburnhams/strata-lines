import { performPngExport, type ExportConfig } from '@/services/exportService';
import * as exportHelpers from '@/utils/exportHelpers';
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
    // Mock the canvas returned by renderCanvasForBounds
    const mockCanvas = document.createElement('canvas');
    // Mock toBlob because jsdom doesn't implement it
    mockCanvas.toBlob = jest.fn((callback) => {
      callback(new Blob(['test'], { type: 'image/png' }));
    });
    // Mock getContext if needed (jsdom has basic implementation)

    mockRenderCanvasForBounds.mockResolvedValue(mockCanvas);
  });

  it('should filter tracks based on subdivision bounds', async () => {
    // Define subdivision bounds (0,0 to 10,10)
    const subdivisionBounds = L.latLngBounds([0, 0], [10, 10]);
    mockCalculateSubdivisions.mockReturnValue([subdivisionBounds]);

    // Track 1: Inside (5,5)
    const track1 = createTrack('1', [[5, 5], [6, 6]]);
    // Track 2: Outside (20,20)
    const track2 = createTrack('2', [[20, 20], [21, 21]]);
    // Track 3: Partially Inside/Overlapping (crossing from -1,-1 to 1,1)
    const track3 = createTrack('3', [[-1, -1], [1, 1]]);

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
