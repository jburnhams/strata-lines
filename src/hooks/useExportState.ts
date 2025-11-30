import { useState, useCallback, useEffect } from 'react';
import L from 'leaflet';
import { useLocalStorage } from './useLocalStorage';
import type { AspectRatio } from '@/types';
import { calculatePixelDimensions, calculateBoundsDimensions } from '@/utils/mapCalculations';
import type { ProgressInfo } from '@/utils/progressTracker';

/**
 * Custom hook for managing export-related state and calculations
 */
export const useExportState = (
  previewZoom: number | null,
  zoom: number
) => {
  const [exportQuality, setExportQuality] = useLocalStorage<number>('exportQuality', 2);
  const [maxDimension, setMaxDimension] = useLocalStorage<number>('maxDimension', 4000);
  const [outputFormat, setOutputFormat] = useLocalStorage<'png' | 'jpeg'>('outputFormat', 'jpeg');
  const [jpegQuality, setJpegQuality] = useLocalStorage<number>('jpegQuality', 85);
  const [exportBoundsLocked, setExportBoundsLocked] = useLocalStorage('exportBoundsLocked', false);
  const [aspectRatio, setAspectRatioState] = useLocalStorage<AspectRatio>('exportAspectRatio', {
    width: 16,
    height: 9,
  });

  const [exportDimensions, setExportDimensions] = useState<{
    width: number | null;
    height: number | null;
  }>({ width: null, height: null });
  const [viewportMiles, setViewportMiles] = useState<{
    width: number | null;
    height: number | null;
  }>({ width: null, height: null });
  const [exportBoundsAspectRatio, setExportBoundsAspectRatio] = useState<number | null>(null);
  const [derivedExportZoom, setDerivedExportZoom] = useState<number | null>(null);

  const [exportBounds, setExportBounds] = useState<L.LatLngBounds | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      const item = window.localStorage.getItem('exportBounds');
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed && parsed._southWest && parsed._northEast) {
          return L.latLngBounds(parsed._southWest, parsed._northEast);
        }
      }
    } catch (error) {
      console.error('Error reading exportBounds from localStorage', error);
    }
    return null;
  });

  // Subdivisions for visualizing export progress
  const [exportSubdivisions, setExportSubdivisions] = useState<L.LatLngBounds[]>([]);
  const [currentExportSubdivisionIndex, setCurrentExportSubdivisionIndex] = useState<number>(-1);
  const [completedSubdivisions, setCompletedSubdivisions] = useState<Set<number>>(new Set());

  // Progress information for each subdivision
  const [subdivisionProgress, setSubdivisionProgress] = useState<Map<number, ProgressInfo>>(
    new Map()
  );

  // Save export bounds to localStorage
  useEffect(() => {
    try {
      if (exportBounds) {
        const dataToStore = {
          _southWest: exportBounds.getSouthWest(),
          _northEast: exportBounds.getNorthEast(),
        };
        window.localStorage.setItem('exportBounds', JSON.stringify(dataToStore));
      } else {
        window.localStorage.removeItem('exportBounds');
      }
    } catch (error) {
      console.error('Error saving exportBounds to localStorage', error);
    }
  }, [exportBounds]);

  // Calculate all derived export properties based on the export area
  useEffect(() => {
    if (!exportBounds || typeof previewZoom !== 'number') {
      setExportDimensions({ width: null, height: null });
      setViewportMiles({ width: null, height: null });
      setDerivedExportZoom(null);
      setExportBoundsAspectRatio(null);
      return;
    }

    // 1. Derive export zoom
    const newExportZoom = previewZoom + exportQuality;
    setDerivedExportZoom(newExportZoom);

    // 2. Derive export dimensions & current aspect ratio
    const { width, height } = calculatePixelDimensions(exportBounds, newExportZoom);
    setExportDimensions({ width, height });
    if (height > 0 && width > 0) {
      setExportBoundsAspectRatio(width / height);
    } else {
      setExportBoundsAspectRatio(null);
    }

    // 3. Export viewport miles are calculated from the yellow box area
    setViewportMiles(calculateBoundsDimensions(exportBounds));
  }, [exportBounds, previewZoom, exportQuality]);

  const setAspectRatio = useCallback(
    (newRatio: AspectRatio) => {
      if (newRatio.width <= 0 || newRatio.height <= 0) return;

      setAspectRatioState(newRatio);

      if (!exportBounds || !previewZoom) return;

      let tempMap: L.Map | null = null;
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);

      try {
        tempMap = L.map(tempContainer).setView(exportBounds.getCenter(), previewZoom);

        const nwPoint = tempMap.latLngToContainerPoint(exportBounds.getNorthWest());
        const sePoint = tempMap.latLngToContainerPoint(exportBounds.getSouthEast());

        const currentPixelWidth = sePoint.x - nwPoint.x;
        const currentPixelHeight = sePoint.y - nwPoint.y;

        if (currentPixelWidth <= 0 || currentPixelHeight <= 0) return;

        const currentRatio = currentPixelWidth / currentPixelHeight;
        const targetRatio = newRatio.width / newRatio.height;

        if (Math.abs(currentRatio - targetRatio) < 0.01) return;

        const centerPoint = tempMap.latLngToContainerPoint(exportBounds.getCenter());
        let newNwPoint: L.Point, newSePoint: L.Point;

        if (currentRatio > targetRatio) {
          // Too wide, shrink width
          const newPixelWidth = currentPixelHeight * targetRatio;
          newNwPoint = new L.Point(centerPoint.x - newPixelWidth / 2, nwPoint.y);
          newSePoint = new L.Point(centerPoint.x + newPixelWidth / 2, sePoint.y);
        } else {
          // Too tall, shrink height
          const newPixelHeight = currentPixelWidth / targetRatio;
          newNwPoint = new L.Point(nwPoint.x, centerPoint.y - newPixelHeight / 2);
          newSePoint = new L.Point(sePoint.x, centerPoint.y + newPixelHeight / 2);
        }

        const newNwLatLng = tempMap.containerPointToLatLng(newNwPoint);
        const newSeLatLng = tempMap.containerPointToLatLng(newSePoint);
        const newBounds = L.latLngBounds(newNwLatLng, newSeLatLng);

        setExportBounds(newBounds);
        if (!exportBoundsLocked) setExportBoundsLocked(true);
      } finally {
        if (tempMap) tempMap.remove();
        document.body.removeChild(tempContainer);
      }
    },
    [exportBounds, previewZoom, setAspectRatioState, exportBoundsLocked, setExportBoundsLocked]
  );

  return {
    // State
    exportQuality,
    setExportQuality,
    maxDimension,
    setMaxDimension,
    outputFormat,
    setOutputFormat,
    jpegQuality,
    setJpegQuality,
    exportBounds,
    setExportBounds,
    exportBoundsLocked,
    setExportBoundsLocked,
    aspectRatio,
    setAspectRatio,
    exportDimensions,
    viewportMiles,
    exportBoundsAspectRatio,
    derivedExportZoom,
    exportSubdivisions,
    setExportSubdivisions,
    currentExportSubdivisionIndex,
    setCurrentExportSubdivisionIndex,
    completedSubdivisions,
    setCompletedSubdivisions,
    subdivisionProgress,
    setSubdivisionProgress,
  };
};
