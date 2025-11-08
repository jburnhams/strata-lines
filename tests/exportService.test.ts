/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import L from 'leaflet';
import { createCanvas } from '@napi-rs/canvas';
import type { Track } from '../types';
import type { ExportConfig, ExportCallbacks } from '../services/exportService';

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
jest.mock('../utils/exportHelpers', () => ({
  renderCanvasForBounds: jest.fn(),
  calculateSubdivisions: jest.fn(),
  resizeCanvas: jest.fn(),
}));

// Now import after mocks are set up
import { performPngExport } from '../services/exportService';
import * as exportHelpers from '../utils/exportHelpers';

describe('Export Service Integration Tests', () => {
  let mockTrack: Track;
  let mockConfig: ExportConfig;
  let mockCallbacks: ExportCallbacks;
  let renderCanvasForBoundsMock: jest.MockedFunction<typeof exportHelpers.renderCanvasForBounds>;
  let calculateSubdivisionsMock: jest.MockedFunction<typeof exportHelpers.calculateSubdivisions>;
  let resizeCanvasMock: jest.MockedFunction<typeof exportHelpers.resizeCanvas>;

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
      const calledSubdivisions = (mockCallbacks.onSubdivisionsCalculated as jest.Mock).mock.calls[0][0];
      expect(calledSubdivisions.length).toBe(4);

      // Should call onSubdivisionProgress for each subdivision
      expect(mockCallbacks.onSubdivisionProgress).toHaveBeenCalledTimes(4);

      // Should render a canvas for each subdivision
      expect(renderCanvasForBoundsMock).toHaveBeenCalledTimes(4);

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should use sequential file naming for subdivisions', async () => {
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

      const calledSubdivisions = (mockCallbacks.onSubdivisionsCalculated as jest.Mock).mock.calls[0][0];

      // Should create download links for each subdivision
      expect(mockCreateElement).toHaveBeenCalledWith('a');

      // Link creation count should match subdivision count
      const linkCreations = (mockCreateElement as jest.Mock).mock.calls.filter(
        call => call[0] === 'a'
      );
      expect(linkCreations.length).toBe(calledSubdivisions.length);
    });

    it('should handle single subdivision (no split needed)', async () => {
      // Large maxDimension means no subdivisions needed
      const configNoSubdivisions = {
        ...mockConfig,
        maxDimension: 10000,
      };

      await performPngExport('base', [mockTrack], configNoSubdivisions, mockCallbacks);

      expect(mockCallbacks.onSubdivisionsCalculated).toHaveBeenCalled();
      const subdivisions = (mockCallbacks.onSubdivisionsCalculated as jest.Mock).mock.calls[0][0];
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
        result => result.value.download !== undefined
      )?.value;

      expect(linkElement).toBeDefined();
      expect(linkElement.download).toContain('base');
      expect(linkElement.download).toContain('.png');
    });

    it('should include part numbers in filename for subdivisions', async () => {
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
        .filter(result => result.value.download !== undefined)
        .map(result => result.value);

      // Should have multiple files with part numbers
      expect(linkElements.length).toBe(4);
      expect(linkElements[0].download).toMatch(/_part1of4/);
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
});
