import { describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import L from 'leaflet';
import { useExportState } from '@/hooks/useExportState';

describe('useExportState', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      expect(result.current.exportQuality).toBe(2);
      expect(result.current.maxDimension).toBe(4000);
      expect(result.current.exportBoundsLocked).toBe(false);
      expect(result.current.aspectRatio).toEqual({ width: 16, height: 9 });
      expect(result.current.exportBounds).toBeNull();
      expect(result.current.exportDimensions).toEqual({ width: null, height: null });
      expect(result.current.viewportMiles).toEqual({ width: null, height: null });
      expect(result.current.exportBoundsAspectRatio).toBeNull();
      expect(result.current.derivedExportZoom).toBeNull();
    });

    it('should restore values from localStorage', () => {
      localStorage.setItem('exportQuality', '3');
      localStorage.setItem('maxDimension', '5000');
      localStorage.setItem('exportBoundsLocked', 'true');

      const { result } = renderHook(() => useExportState(null, 6));

      expect(result.current.exportQuality).toBe(3);
      expect(result.current.maxDimension).toBe(5000);
      expect(result.current.exportBoundsLocked).toBe(true);
    });
  });

  describe('Export Quality', () => {
    it('should update export quality', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setExportQuality(4);
      });

      expect(result.current.exportQuality).toBe(4);
    });

    it('should persist export quality to localStorage', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setExportQuality(5);
      });

      expect(localStorage.getItem('exportQuality')).toBe('5');
    });
  });

  describe('Max Dimension', () => {
    it('should update max dimension', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setMaxDimension(8000);
      });

      expect(result.current.maxDimension).toBe(8000);
    });

    it('should persist max dimension to localStorage', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setMaxDimension(3000);
      });

      expect(localStorage.getItem('maxDimension')).toBe('3000');
    });
  });

  describe('Export Bounds', () => {
    it('should set export bounds', () => {
      const { result } = renderHook(() => useExportState(null, 6));
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );

      act(() => {
        result.current.setExportBounds(bounds);
      });

      expect(result.current.exportBounds).toEqual(bounds);
    });

    it('should lock export bounds', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      expect(result.current.exportBoundsLocked).toBe(false);

      act(() => {
        result.current.setExportBoundsLocked(true);
      });

      expect(result.current.exportBoundsLocked).toBe(true);
    });

    it('should restore export bounds from localStorage', () => {
      const boundsData = {
        _southWest: { lat: 51.5, lng: -0.1 },
        _northEast: { lat: 51.6, lng: 0.0 }
      };
      localStorage.setItem('exportBounds', JSON.stringify(boundsData));

      const { result } = renderHook(() => useExportState(null, 6));

      expect(result.current.exportBounds).not.toBeNull();
      expect(result.current.exportBounds?.getSouth()).toBe(51.5);
      expect(result.current.exportBounds?.getWest()).toBe(-0.1);
      expect(result.current.exportBounds?.getNorth()).toBe(51.6);
      expect(result.current.exportBounds?.getEast()).toBe(0.0);
    });
  });

  describe('Derived Export Zoom', () => {
    it('should calculate derived export zoom from preview zoom and quality', () => {
      const { result, rerender } = renderHook(
        ({ previewZoom, zoom }: { previewZoom: number | null; zoom: number }) => useExportState(previewZoom, zoom),
        { initialProps: { previewZoom: null as number | null, zoom: 6 } }
      );

      // Set export quality
      act(() => {
        result.current.setExportQuality(3);
      });

      // Set bounds to trigger calculation
      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );
      act(() => {
        result.current.setExportBounds(bounds);
      });

      // Update preview zoom
      rerender({ previewZoom: 10, zoom: 6 });

      expect(result.current.derivedExportZoom).toBe(13); // 10 + 3
    });

    it('should recalculate when export quality changes', () => {
      const { result, rerender } = renderHook(
        ({ previewZoom, zoom }: { previewZoom: number | null; zoom: number }) => useExportState(previewZoom, zoom),
        { initialProps: { previewZoom: 10 as number | null, zoom: 6 } }
      );

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );
      act(() => {
        result.current.setExportBounds(bounds);
      });

      expect(result.current.derivedExportZoom).toBe(12); // 10 + 2 (default quality)

      act(() => {
        result.current.setExportQuality(4);
      });

      expect(result.current.derivedExportZoom).toBe(14); // 10 + 4
    });
  });

  describe('Export Dimensions', () => {
    it('should calculate export dimensions when bounds and zoom are set', () => {
      const { result, rerender } = renderHook(
        ({ previewZoom, zoom }: { previewZoom: number | null; zoom: number }) => useExportState(previewZoom, zoom),
        { initialProps: { previewZoom: 10 as number | null, zoom: 6 } }
      );

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );
      act(() => {
        result.current.setExportBounds(bounds);
      });

      expect(result.current.exportDimensions.width).toBeGreaterThan(0);
      expect(result.current.exportDimensions.height).toBeGreaterThan(0);
    });

    it('should calculate aspect ratio from dimensions', () => {
      const { result, rerender } = renderHook(
        ({ previewZoom, zoom }: { previewZoom: number | null; zoom: number }) => useExportState(previewZoom, zoom),
        { initialProps: { previewZoom: 10 as number | null, zoom: 6 } }
      );

      const bounds = L.latLngBounds(
        L.latLng(51.5, -0.1),
        L.latLng(51.6, 0.0)
      );
      act(() => {
        result.current.setExportBounds(bounds);
      });

      expect(result.current.exportBoundsAspectRatio).not.toBeNull();
      if (result.current.exportDimensions.width && result.current.exportDimensions.height) {
        const expectedRatio = result.current.exportDimensions.width / result.current.exportDimensions.height;
        expect(result.current.exportBoundsAspectRatio).toBeCloseTo(expectedRatio, 5);
      }
    });
  });

  describe('Subdivision State', () => {
    it('should initialize with empty subdivisions', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      expect(result.current.exportSubdivisions).toEqual([]);
      expect(result.current.currentExportSubdivisionIndex).toBe(-1);
    });

    it('should update export subdivisions', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      const subdivisions = [
        L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.6, 0.0)),
        L.latLngBounds(L.latLng(51.6, -0.1), L.latLng(51.7, 0.0)),
      ];

      act(() => {
        result.current.setExportSubdivisions(subdivisions);
      });

      expect(result.current.exportSubdivisions).toHaveLength(2);
      expect(result.current.exportSubdivisions).toEqual(subdivisions);
    });

    it('should update current subdivision index', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setCurrentExportSubdivisionIndex(2);
      });

      expect(result.current.currentExportSubdivisionIndex).toBe(2);
    });

    it('should clear subdivisions', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      const subdivisions = [
        L.latLngBounds(L.latLng(51.5, -0.1), L.latLng(51.6, 0.0)),
      ];

      act(() => {
        result.current.setExportSubdivisions(subdivisions);
        result.current.setCurrentExportSubdivisionIndex(0);
      });

      expect(result.current.exportSubdivisions).toHaveLength(1);

      act(() => {
        result.current.setExportSubdivisions([]);
        result.current.setCurrentExportSubdivisionIndex(-1);
      });

      expect(result.current.exportSubdivisions).toEqual([]);
      expect(result.current.currentExportSubdivisionIndex).toBe(-1);
    });
  });

  describe('Aspect Ratio', () => {
    it('should set aspect ratio', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setAspectRatio({ width: 4, height: 3 });
      });

      expect(result.current.aspectRatio).toEqual({ width: 4, height: 3 });
    });

    it('should persist aspect ratio to localStorage', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setAspectRatio({ width: 1, height: 1 });
      });

      const stored = localStorage.getItem('exportAspectRatio');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual({ width: 1, height: 1 });
    });

    it('should not set invalid aspect ratio', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      const originalRatio = result.current.aspectRatio;

      act(() => {
        result.current.setAspectRatio({ width: 0, height: 1 });
      });

      // Should not change
      expect(result.current.aspectRatio).toEqual(originalRatio);

      act(() => {
        result.current.setAspectRatio({ width: 1, height: -1 });
      });

      // Should not change
      expect(result.current.aspectRatio).toEqual(originalRatio);
    });
  });

  describe('Viewport Miles', () => {
    it('should calculate viewport miles when bounds are set', () => {
      const { result, rerender } = renderHook(
        ({ previewZoom, zoom }) => useExportState(previewZoom, zoom),
        { initialProps: { previewZoom: 10, zoom: 6 } }
      );

      const bounds = L.latLngBounds(
        L.latLng(51.0, -1.0),
        L.latLng(52.0, 0.0)
      );
      act(() => {
        result.current.setExportBounds(bounds);
      });

      expect(result.current.viewportMiles.width).toBeGreaterThan(0);
      expect(result.current.viewportMiles.height).toBeGreaterThan(0);
    });
  });

  describe('Output Format', () => {
    it('should initialize with default PNG format', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      expect(result.current.outputFormat).toBe('png');
    });

    it('should update output format to JPEG', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setOutputFormat('jpeg');
      });

      expect(result.current.outputFormat).toBe('jpeg');
    });

    it('should update output format back to PNG', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setOutputFormat('jpeg');
      });

      expect(result.current.outputFormat).toBe('jpeg');

      act(() => {
        result.current.setOutputFormat('png');
      });

      expect(result.current.outputFormat).toBe('png');
    });

    it('should persist output format to localStorage', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setOutputFormat('jpeg');
      });

      expect(localStorage.getItem('outputFormat')).toBe('"jpeg"');
    });

    it('should restore output format from localStorage', () => {
      localStorage.setItem('outputFormat', '"jpeg"');

      const { result } = renderHook(() => useExportState(null, 6));

      expect(result.current.outputFormat).toBe('jpeg');
    });
  });

  describe('JPEG Quality', () => {
    it('should initialize with default JPEG quality of 85', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      expect(result.current.jpegQuality).toBe(85);
    });

    it('should update JPEG quality', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setJpegQuality(90);
      });

      expect(result.current.jpegQuality).toBe(90);
    });

    it('should persist JPEG quality to localStorage', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setJpegQuality(75);
      });

      expect(localStorage.getItem('jpegQuality')).toBe('75');
    });

    it('should restore JPEG quality from localStorage', () => {
      localStorage.setItem('jpegQuality', '95');

      const { result } = renderHook(() => useExportState(null, 6));

      expect(result.current.jpegQuality).toBe(95);
    });

    it('should handle quality values at boundaries (1-100)', () => {
      const { result } = renderHook(() => useExportState(null, 6));

      act(() => {
        result.current.setJpegQuality(1);
      });

      expect(result.current.jpegQuality).toBe(1);

      act(() => {
        result.current.setJpegQuality(100);
      });

      expect(result.current.jpegQuality).toBe(100);

      act(() => {
        result.current.setJpegQuality(50);
      });

      expect(result.current.jpegQuality).toBe(50);
    });
  });
});
