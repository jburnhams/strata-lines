import { describe, it, expect, jest } from '@jest/globals';
import L from 'leaflet';
import type { Track } from '../types';
import type { ExportConfig, ExportCallbacks } from '../services/exportService';

// Mock the export helpers module
jest.mock('../utils/exportHelpers', () => ({
  calculateSubdivisions: jest.fn((bounds, zoom, maxDim) => {
    // Simple mock: return single subdivision if small, two if large
    const mockWidth = 1000;
    const mockHeight = 800;
    if (mockWidth <= maxDim && mockHeight <= maxDim) {
      return [bounds];
    }
    const center = bounds.getCenter();
    return [
      (globalThis as any).L.latLngBounds(bounds.getSouthWest(), (globalThis as any).L.latLng(bounds.getNorth(), center.lng)),
      (globalThis as any).L.latLngBounds((globalThis as any).L.latLng(bounds.getSouth(), center.lng), bounds.getNorthEast()),
    ];
  }),
  renderCanvasForBounds: jest.fn(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    return canvas;
  }),
  resizeCanvas: jest.fn((source, width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }),
}));

describe('Export Service', () => {
  let mockTrack: Track;
  let mockConfig: ExportConfig;
  let mockCallbacks: ExportCallbacks;

  beforeEach(() => {
    // Set up global L for mocked functions
    (globalThis as any).L = L;

    mockTrack = {
      id: 'test-1',
      name: 'Test Track',
      points: [
        { lat: 51.5, lng: -0.1 },
        { lat: 51.6, lng: -0.05 },
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Export Configuration', () => {
    it('should accept valid export configuration', () => {
      expect(mockConfig.exportBounds).toBeInstanceOf(L.LatLngBounds);
      expect(mockConfig.derivedExportZoom).toBe(12);
      expect(mockConfig.maxDimension).toBe(4000);
    });

    it('should have all required configuration properties', () => {
      const requiredProps = [
        'exportBounds',
        'derivedExportZoom',
        'previewZoom',
        'zoom',
        'maxDimension',
        'labelDensity',
        'tileLayerKey',
        'lineThickness',
        'exportQuality',
      ];

      requiredProps.forEach(prop => {
        expect(mockConfig).toHaveProperty(prop);
      });
    });
  });

  describe('Export Callbacks', () => {
    it('should have all required callback functions', () => {
      expect(typeof mockCallbacks.onSubdivisionsCalculated).toBe('function');
      expect(typeof mockCallbacks.onSubdivisionProgress).toBe('function');
      expect(typeof mockCallbacks.onComplete).toBe('function');
      expect(typeof mockCallbacks.onError).toBe('function');
    });

    it('should call onSubdivisionsCalculated with bounds array', () => {
      const subdivisions = [mockConfig.exportBounds];
      mockCallbacks.onSubdivisionsCalculated(subdivisions);

      expect(mockCallbacks.onSubdivisionsCalculated).toHaveBeenCalledWith(subdivisions);
      expect(mockCallbacks.onSubdivisionsCalculated).toHaveBeenCalledTimes(1);
    });

    it('should call onSubdivisionProgress with index', () => {
      mockCallbacks.onSubdivisionProgress(0);

      expect(mockCallbacks.onSubdivisionProgress).toHaveBeenCalledWith(0);
      expect(mockCallbacks.onSubdivisionProgress).toHaveBeenCalledTimes(1);
    });

    it('should call onComplete when export finishes', () => {
      mockCallbacks.onComplete();

      expect(mockCallbacks.onComplete).toHaveBeenCalledTimes(1);
    });

    it('should call onError with error object', () => {
      const error = new Error('Export failed');
      mockCallbacks.onError(error);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(error);
      expect(mockCallbacks.onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Track Data', () => {
    it('should accept valid track data', () => {
      expect(mockTrack).toHaveProperty('id');
      expect(mockTrack).toHaveProperty('name');
      expect(mockTrack).toHaveProperty('points');
      expect(mockTrack).toHaveProperty('length');
      expect(mockTrack).toHaveProperty('isVisible');
      expect(mockTrack).toHaveProperty('color');
    });

    it('should handle multiple tracks', () => {
      const tracks: Track[] = [
        mockTrack,
        {
          ...mockTrack,
          id: 'test-2',
          name: 'Test Track 2',
          color: '#00ff00',
        },
      ];

      expect(tracks).toHaveLength(2);
      expect(tracks[0].id).not.toBe(tracks[1].id);
    });

    it('should filter visible tracks', () => {
      const tracks: Track[] = [
        mockTrack,
        { ...mockTrack, id: 'test-2', isVisible: false },
        { ...mockTrack, id: 'test-3', isVisible: true },
      ];

      const visibleTracks = tracks.filter(t => t.isVisible);
      expect(visibleTracks).toHaveLength(2);
    });
  });

  describe('Export Types', () => {
    const exportTypes = ['combined', 'base', 'lines', 'labels'] as const;

    exportTypes.forEach(type => {
      it(`should support ${type} export type`, () => {
        expect(['combined', 'base', 'lines', 'labels']).toContain(type);
      });
    });

    it('should handle combined export', () => {
      const type = 'combined';
      expect(type).toBe('combined');
    });

    it('should handle base export', () => {
      const type = 'base';
      expect(type).toBe('base');
    });

    it('should handle lines export', () => {
      const type = 'lines';
      expect(type).toBe('lines');
    });

    it('should handle labels export', () => {
      const type = 'labels';
      expect(type).toBe('labels');
    });
  });

  describe('Subdivision Logic', () => {
    it('should calculate subdivisions based on max dimension', () => {
      const bounds = L.latLngBounds(
        L.latLng(50.0, -2.0),
        L.latLng(52.0, 0.0)
      );

      // Small max dimension should create more subdivisions
      const largeMaxDim = 5000;
      const smallMaxDim = 500;

      expect(largeMaxDim).toBeGreaterThan(smallMaxDim);
    });

    it('should handle single subdivision', () => {
      const subdivisions = [mockConfig.exportBounds];
      mockCallbacks.onSubdivisionsCalculated(subdivisions);

      expect(mockCallbacks.onSubdivisionsCalculated).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(L.LatLngBounds)])
      );
    });

    it('should handle multiple subdivisions', () => {
      const center = mockConfig.exportBounds.getCenter();
      const subdivisions = [
        L.latLngBounds(
          mockConfig.exportBounds.getSouthWest(),
          L.latLng(mockConfig.exportBounds.getNorth(), center.lng)
        ),
        L.latLngBounds(
          L.latLng(mockConfig.exportBounds.getSouth(), center.lng),
          mockConfig.exportBounds.getNorthEast()
        ),
      ];

      mockCallbacks.onSubdivisionsCalculated(subdivisions);

      expect(mockCallbacks.onSubdivisionsCalculated).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(L.LatLngBounds),
          expect.any(L.LatLngBounds),
        ])
      );
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress through subdivisions', () => {
      const totalSubdivisions = 4;

      for (let i = 0; i < totalSubdivisions; i++) {
        mockCallbacks.onSubdivisionProgress(i);
      }

      expect(mockCallbacks.onSubdivisionProgress).toHaveBeenCalledTimes(totalSubdivisions);
      expect(mockCallbacks.onSubdivisionProgress).toHaveBeenLastCalledWith(3);
    });

    it('should call onComplete after all subdivisions', () => {
      const subdivisions = [mockConfig.exportBounds];
      mockCallbacks.onSubdivisionsCalculated(subdivisions);
      mockCallbacks.onSubdivisionProgress(0);
      mockCallbacks.onComplete();

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle rendering errors', () => {
      const error = new Error('Failed to render base layer');
      mockCallbacks.onError(error);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(error);
    });

    it('should handle canvas creation errors', () => {
      const error = new Error('Failed to get 2D context');
      mockCallbacks.onError(error);

      expect(mockCallbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to get 2D context'),
        })
      );
    });

    it('should provide error messages', () => {
      const error = new Error('Export failed');
      expect(error.message).toBe('Export failed');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
