
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import L from 'leaflet';
import type { LatLng, LatLngBounds, Point as LeafletPoint } from 'leaflet';
import JSZip from 'jszip';
import { MapComponent } from './components/MapComponent';
import { ControlsPanel } from './components/ControlsPanel';
import { processGpxFiles } from './services/gpxProcessor';
import * as db from './services/db';
import type { Track, UnprocessedTrack, AspectRatio, TileLayerDefinition } from './types';
import { UK_CENTER_LATLNG, TILE_LAYERS } from './constants';
import { trackToGpxString } from './services/gpxGenerator';
import { getRandomColorInRange, getTracksBounds } from './services/utils';

// Custom hook for persisting state to localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const valueToStore = JSON.stringify(storedValue);
        window.localStorage.setItem(key, valueToStore);
      }
    } catch (error) {
       console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}


const createPrintMap = (container: HTMLElement) => {
    return L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
    });
};

const waitForTiles = (tileLayer: L.TileLayer) => {
    return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Map export timed out waiting for tiles.')), 60000);
        
        let loaded = false;
        const loadHandler = () => {
          if (!loaded) {
            loaded = true;
            clearTimeout(timeout);
            setTimeout(resolve, 500); // Extra delay for rendering
          }
        };

        tileLayer.on('load', loadHandler);

        // This check is crucial. fitBounds() might finish and tiles are loading,
        // but isLoading() might not be true for a few ms. A small delay helps.
        setTimeout(() => {
          if (tileLayer.isLoading() === false) {
            loadHandler();
          }
        }, 100);

        tileLayer.on('tileerror', (e) => {
            console.error('Tile error:', e);
            clearTimeout(timeout);
            reject(new Error('Could not load map tiles for export.'));
        });
    });
};

type Notification = {
  type: 'error' | 'info';
  message: string;
};

const MAX_TILE_DIMENSION = 4000;
export const MERGE_PIXEL_LIMIT = 8000 * 8000; // Approx 64 megapixels

const App: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true for initial DB load
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportingBase, setIsExportingBase] = useState<boolean>(false);
  const [isExportingLines, setIsExportingLines] = useState<boolean>(false);
  const [isExportingLabels, setIsExportingLabels] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  
  const [aspectRatio, setAspectRatioState] = useLocalStorage<AspectRatio>('exportAspectRatio', { width: 16, height: 9 });
  const [zoom, setZoom] = useLocalStorage<number>('previewZoom', 6);
  const [exportQuality, setExportQuality] = useLocalStorage<number>('exportQuality', 2);
  const [mapCenter, setMapCenter] = useLocalStorage<LatLng>('mapCenter', UK_CENTER_LATLNG);
  const [minLengthFilter, setMinLengthFilter] = useLocalStorage<number>('minLengthFilter', 20);
  const [exportBoundsLocked, setExportBoundsLocked] = useLocalStorage('exportBoundsLocked', false);
  
  const [exportDimensions, setExportDimensions] = useState<{ width: number | null, height: number | null }>({ width: null, height: null });
  const [viewportMiles, setViewportMiles] = useState<{ width: number | null, height: number | null }>({ width: null, height: null });
  const [previewZoom, setPreviewZoom] = useState<number | null>(null);

  const [previewBounds, setPreviewBounds] = useState<L.LatLngBounds | null>(null);
  const [boundsToFit, setBoundsToFit] = useState<L.LatLngBounds | null>(null);
  const [highlightedTrackId, setHighlightedTrackId] = useState<string | null>(null);
  
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
        console.error("Error reading exportBounds from localStorage", error);
    }
    return null;
  });

  const onBoundsFitted = useCallback(() => {
    setBoundsToFit(null);
  }, []);

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
        console.error("Error saving exportBounds to localStorage", error);
    }
  }, [exportBounds]);

  const [exportBoundsAspectRatio, setExportBoundsAspectRatio] = useState<number | null>(null);
  const [derivedExportZoom, setDerivedExportZoom] = useState<number | null>(null);
  
  const [lineColorStart, setLineColorStart] = useLocalStorage<string>('lineColorStart', '#ffff00');
  const [lineColorEnd, setLineColorEnd] = useLocalStorage<string>('lineColorEnd', '#ff0000');
  const [lineThickness, setLineThickness] = useLocalStorage<number>('lineThickness', 3);
  const [tileLayerKey, setTileLayerKey] = useLocalStorage<string>('tileLayerKey', 'esriImagery');
  const [labelDensity, setLabelDensity] = useLocalStorage<number>('labelDensity', 1);

  // Clamp labelDensity to max value and ensure it's an integer
  useEffect(() => {
    const roundedAndClamped = Math.max(-1, Math.min(Math.round(labelDensity), 3));
    if (roundedAndClamped !== labelDensity) {
      setLabelDensity(roundedAndClamped);
    }
  }, [labelDensity, setLabelDensity]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);

  // Handle cases where a deprecated map style is in localStorage
  useEffect(() => {
    const validKeys = TILE_LAYERS.map(l => l.key);
    if (!validKeys.includes(tileLayerKey)) {
        setTileLayerKey('esriImagery');
    }
  }, [tileLayerKey, setTileLayerKey]);
  
  // Load tracks from IndexedDB on initial render
  useEffect(() => {
    const loadTracks = async () => {
      setIsLoading(true);
      try {
        const storedTracks = await db.getTracks();
        const normalizedTracks = storedTracks.map(t => ({...t, isVisible: t.isVisible !== false }));
        setTracks(normalizedTracks);
      } catch (error) {
        console.error("Failed to load tracks from database", error);
        setNotification({ type: 'error', message: "Could not load saved tracks." });
      } finally {
        setIsLoading(false);
      }
    };
    loadTracks();
  }, []);

  const coloredTracks = useMemo(() => {
    return tracks.map(track => ({
        ...track,
        color: getRandomColorInRange(lineColorStart, lineColorEnd)
    }));
  }, [tracks, lineColorStart, lineColorEnd]);

  const metersToMiles = (meters: number) => meters * 0.000621371;

  const calculateBoundsDimensions = (b: LatLngBounds): { width: number, height: number } => {
      const center = b.getCenter();
      const west = b.getWest();
      const east = b.getEast();
      const north = b.getNorth();
      const south = b.getSouth();

      const westPoint = L.latLng(center.lat, west);
      const eastPoint = L.latLng(center.lat, east);
      const northPoint = L.latLng(north, center.lng);
      const southPoint = L.latLng(south, center.lng);

      const widthMeters = westPoint.distanceTo(eastPoint);
      const heightMeters = northPoint.distanceTo(southPoint);

      return {
          width: metersToMiles(widthMeters),
          height: metersToMiles(heightMeters)
      };
  };

  const handleUserMove = useCallback((data: { center: LatLng; zoom: number; bounds: LatLngBounds; size: LeafletPoint; }) => {
    setMapCenter(data.center);
    setZoom(data.zoom);
    setPreviewBounds(data.bounds);
    setPreviewZoom(data.zoom);
  }, [setMapCenter, setZoom]);

  // Effect to calculate the initial geographical area of the export box,
  // or to recalculate it if the map moves and the user hasn't locked it.
  useEffect(() => {
    if (!previewBounds || exportBoundsLocked) {
      return;
    }

    const north = previewBounds.getNorth();
    const south = previewBounds.getSouth();
    const east = previewBounds.getEast();
    const west = previewBounds.getWest();

    const latRange = north - south;
    const lonRange = east - west;

    // Insets: top 5%, right 30%, bottom 34%, left 4%
    const newNorth = north - (latRange * 0.05);
    const newSouth = south + (latRange * 0.34);
    const newEast = east - (lonRange * 0.30);
    const newWest = west + (lonRange * 0.04);
    
    if (newNorth > newSouth && newEast > newWest) {
        setExportBounds(L.latLngBounds(L.latLng(newSouth, newWest), L.latLng(newNorth, newEast)));
    } else {
        setExportBounds(null); // Inset is larger than bounds, hide box
    }
  }, [previewBounds, exportBoundsLocked]);

  const handleExportBoundsChange = useCallback((newBounds: LatLngBounds) => {
    setExportBounds(newBounds);
    if (!exportBoundsLocked) {
      setExportBoundsLocked(true); // Lock the bounds once the user interacts with them.
    }
  }, [exportBoundsLocked, setExportBounds, setExportBoundsLocked]);

  const setAspectRatio = useCallback((newRatio: AspectRatio) => {
    if (newRatio.width <= 0 || newRatio.height <= 0) return;

    setAspectRatioState(newRatio);

    if (!exportBounds || !mapCenter || !zoom) return;

    let tempMap: L.Map | null = null;
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);

    try {
        tempMap = L.map(tempContainer).setView(mapCenter, zoom);

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

        if (currentRatio > targetRatio) { // Too wide, shrink width
            const newPixelWidth = currentPixelHeight * targetRatio;
            newNwPoint = new L.Point(centerPoint.x - newPixelWidth / 2, nwPoint.y);
            newSePoint = new L.Point(centerPoint.x + newPixelWidth / 2, sePoint.y);
        } else { // Too tall, shrink height
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
  }, [exportBounds, mapCenter, zoom, setAspectRatioState, setExportBounds, exportBoundsLocked, setExportBoundsLocked]);

  const calculatePixelDimensions = useCallback((bounds: L.LatLngBounds, atZoom: number) => {
    let tempMap: L.Map | null = null;
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute'; tempContainer.style.left = '-9999px'; tempContainer.style.top = '-9999px';
    tempContainer.style.width = '1px'; tempContainer.style.height = '1px';
    document.body.appendChild(tempContainer);
    try {
        tempMap = L.map(tempContainer, { center: [0, 0], zoom: 0 });
        const northWestPoint = tempMap.project(bounds.getNorthWest(), atZoom);
        const southEastPoint = tempMap.project(bounds.getSouthEast(), atZoom);
        return {
            width: Math.round(southEastPoint.x - northWestPoint.x),
            height: Math.round(southEastPoint.y - northWestPoint.y),
        };
    } finally {
        if (tempMap) tempMap.remove();
        document.body.removeChild(tempContainer);
    }
  }, []);

  // Effect to calculate all derived export properties based on the export area.
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
    
    // 3. Export viewport miles are calculated from the yellow box area.
    setViewportMiles(calculateBoundsDimensions(exportBounds));

  }, [exportBounds, previewZoom, exportQuality, calculatePixelDimensions]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setNotification(null);
    try {
      const processedTracks: UnprocessedTrack[] = await processGpxFiles(Array.from(files));

      if (processedTracks.length === 0) {
        setNotification({ type: 'error', message: "No tracks found in the uploaded files." });
        setIsLoading(false);
        return;
      }
      
      const tracksWithIds: Track[] = processedTracks.map((track, index) => ({
          ...track,
          id: `${track.name}-${Date.now()}-${index}`,
          isVisible: true,
      }));

      let duplicates = 0;
      let tooShort = 0;
      const tracksToAdd: Track[] = [];

      tracksWithIds.forEach(newTrack => {
        const isDuplicate = tracks.some(existing => 
            existing.name === newTrack.name && existing.points.length === newTrack.points.length
        );
        if (isDuplicate) {
            duplicates++;
            return;
        }
        const isLongEnough = newTrack.length >= minLengthFilter;
        if (!isLongEnough) {
            tooShort++;
            return;
        }
        tracksToAdd.push(newTrack);
      });
      
      if (tracksToAdd.length > 0) {
          for (const track of tracksToAdd) {
              await db.addTrack(track);
          }
          const allTracksAfterAdd = [...tracks, ...tracksToAdd];
          setTracks(allTracksAfterAdd);

          // Calculate bounds for ALL tracks.
          const allTracksBounds = getTracksBounds(allTracksAfterAdd);

          // If the current view doesn't contain all tracks, trigger a fit.
          if (previewBounds && allTracksBounds && allTracksBounds.isValid() && !previewBounds.contains(allTracksBounds)) {
              setBoundsToFit(allTracksBounds);
          }
      }

      // Set notification summary message
      const added = tracksToAdd.length;
      let messageParts = [];
      if (added > 0) messageParts.push(`Added ${added} new track${added > 1 ? 's' : ''}.`);
      if (duplicates > 0) messageParts.push(`${duplicates} ${duplicates > 1 ? 'were' : 'was a'} duplicate.`);
      if (tooShort > 0) messageParts.push(`${tooShort} ${tooShort > 1 ? 'were' : 'was'} shorter than ${minLengthFilter} km.`);
      
      if (messageParts.length > 0) {
        setNotification({ type: 'info', message: messageParts.join(' ') });
      }

    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to parse files. Please ensure they are valid GPX, TCX, or FIT files.'});
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [tracks, minLengthFilter, previewBounds]);
  
  const removeTrack = useCallback(async (trackId: string) => {
    try {
      await db.deleteTrack(trackId);
      setTracks(prev => prev.filter(t => t.id !== trackId));
    } catch (error) {
      console.error("Failed to delete track", error);
      setNotification({ type: 'error', message: 'Error removing track.' });
    }
  }, []);

  const removeAllTracks = useCallback(async () => {
    try {
      await db.clearTracks();
      setTracks([]);
    } catch (error) {
      console.error("Failed to clear tracks", error);
      setNotification({ type: 'error', message: 'Error removing all tracks.' });
    }
  }, []);

  const toggleTrackVisibility = useCallback(async (trackId: string) => {
    const trackToUpdate = tracks.find(t => t.id === trackId);
    if (!trackToUpdate) return;

    const updatedTrack = { ...trackToUpdate, isVisible: !trackToUpdate.isVisible };
    
    // Optimistic UI update
    setTracks(prevTracks => 
        prevTracks.map(t => (t.id === trackId ? updatedTrack : t))
    );
    
    try {
        await db.addTrack(updatedTrack); // 'put' operation updates or adds
    } catch (error) {
        console.error("Failed to update track visibility in DB", error);
        // Revert state on DB error
        setTracks(prevTracks =>
            prevTracks.map(t => (t.id === trackId ? trackToUpdate : t))
        );
        setNotification({ type: 'error', message: 'Error updating track visibility.' });
    }
  }, [tracks]);

  const handleDownloadAllTracks = useCallback(async () => {
    if (tracks.length === 0) {
        setNotification({ type: 'info', message: 'No tracks to download.' });
        return;
    }
    setIsDownloading(true);
    setNotification(null);
    try {
        const zip = new JSZip();
        const allDbTracks = await db.getTracks();

        if (allDbTracks.length === 0) {
            setNotification({ type: 'info', message: 'No tracks found in the database to download.' });
            return;
        }

        allDbTracks.forEach(track => {
            const gpxContent = trackToGpxString(track);
            const safeFilename = track.name.replace(/[\/\\?%*:|"<>]/g, '_') || 'unnamed_track';
            zip.file(`${safeFilename}.gpx`, gpxContent);
        });
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `StrataLines_Tracks_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (err: any) {
        setNotification({ type: 'error', message: err.message || 'Failed to create ZIP file.' });
        console.error(err);
    } finally {
        setIsDownloading(false);
    }
  }, [tracks]);

  const renderCanvasForBounds = useCallback(async (bounds: L.LatLngBounds, layerType: 'base' | 'lines' | 'labels-only', zoomForRender: number): Promise<HTMLCanvasElement | null> => {
    const visibleTracks = coloredTracks.filter(t => t.isVisible);
    let isTransparent = false;
    
    const { width, height } = calculatePixelDimensions(bounds, zoomForRender);

    if (layerType === 'lines' || layerType === 'labels-only') {
        isTransparent = true;
    }
    
    const printContainer = document.createElement('div');
    printContainer.style.width = `${width}px`;
    printContainer.style.height = `${height}px`;
    printContainer.style.position = 'absolute';
    printContainer.style.left = '-9999px';
    printContainer.style.top = '-9999px';
    if (isTransparent) {
        printContainer.style.backgroundColor = 'transparent';
    }
    document.body.appendChild(printContainer);
    
    let printMap: L.Map | null = null;
    try {
        printMap = createPrintMap(printContainer);
        if (isTransparent) {
            (printMap.getContainer() as HTMLElement).style.backgroundColor = 'transparent';
        }

        // Calculate the exact pixel offset to align the bounds precisely with the container
        // This ensures the exported area exactly matches the yellow selection box.
        const nwPoint = printMap.project(bounds.getNorthWest(), zoomForRender);
        const sePoint = printMap.project(bounds.getSouthEast(), zoomForRender);
        const size = sePoint.subtract(nwPoint);

        // Calculate the center point that will place the bounds correctly in the container
        // We need to account for the container dimensions to center the view properly
        const containerCenterPoint = nwPoint.add(size.divideBy(2));
        const centerLatLng = printMap.unproject(containerCenterPoint, zoomForRender);

        printMap.setView(centerLatLng, zoomForRender, { animate: false });

        // Force the map to recognize its true size
        printMap.invalidateSize({ pan: false });

        if (layerType === 'base') {
            const selectedTileLayer = TILE_LAYERS.find(l => l.key === tileLayerKey) || TILE_LAYERS[0];
            const tileLayer = L.tileLayer(selectedTileLayer.layers[0].url, { attribution: '' });
            tileLayer.addTo(printMap);
            await waitForTiles(tileLayer);
        } else if (layerType === 'labels-only') {
            const labelLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', { attribution: '' });
            labelLayer.addTo(printMap);
            await waitForTiles(labelLayer);
        } else if (layerType === 'lines') {
            const exportLineThickness = lineThickness * (1 + exportQuality / 2);
            visibleTracks.forEach(track => {
                L.polyline(track.points as L.LatLngExpression[], { color: track.color || '#ff4500', weight: exportLineThickness, opacity: 0.8 }).addTo(printMap!);
            });
            await new Promise(res => setTimeout(res, 500)); // Short delay for canvas to draw lines
        }
        
        const canvas = await html2canvas(printContainer, { 
          useCORS: true, allowTaint: true, logging: false,
          backgroundColor: isTransparent ? null : '#000',
        });
        return canvas;
    } finally {
        if (printMap) printMap.remove();
        document.body.removeChild(printContainer);
    }
  }, [coloredTracks, tileLayerKey, lineThickness, exportQuality, calculatePixelDimensions]);

  const stitchCanvases = useCallback(async (
    tiles: { canvas: HTMLCanvasElement; bounds: L.LatLngBounds }[],
    totalBounds: L.LatLngBounds,
    targetWidth: number,
    targetHeight: number,
    zoom: number
  ): Promise<HTMLCanvasElement> => {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = targetWidth;
      finalCanvas.height = targetHeight;
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) throw new Error('Could not create canvas context for stitching.');

      let tempMap: L.Map | null = null;
      const tempContainer = document.createElement('div');
      Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px' });
      document.body.appendChild(tempContainer);
      
      try {
          tempMap = L.map(tempContainer, { center: [0, 0], zoom: 0 });
          const totalNwPoint = tempMap.project(totalBounds.getNorthWest(), zoom);
          
          for (const tile of tiles) {
              const tileNwPoint = tempMap.project(tile.bounds.getNorthWest(), zoom);
              const x = Math.round(tileNwPoint.x - totalNwPoint.x);
              const y = Math.round(tileNwPoint.y - totalNwPoint.y);
              finalCtx.drawImage(tile.canvas, x, y);
          }
      } finally {
          if (tempMap) tempMap.remove();
          document.body.removeChild(tempContainer);
      }
      return finalCanvas;
  }, []);

  const renderLayerRecursive = useCallback(async (
    bounds: L.LatLngBounds,
    layerType: 'base' | 'lines' | 'labels-only',
    zoomForRender: number
  ): Promise<{ canvas: HTMLCanvasElement; bounds: L.LatLngBounds }[]> => {
      const { width, height } = calculatePixelDimensions(bounds, zoomForRender);

      if (width <= MAX_TILE_DIMENSION && height <= MAX_TILE_DIMENSION) {
          const canvas = await renderCanvasForBounds(bounds, layerType, zoomForRender);
          return canvas ? [{ canvas, bounds }] : [];
      }

      const center = bounds.getCenter();
      let bounds1: L.LatLngBounds, bounds2: L.LatLngBounds;
      if (width > height) {
          bounds1 = L.latLngBounds(bounds.getSouthWest(), L.latLng(bounds.getNorth(), center.lng));
          bounds2 = L.latLngBounds(L.latLng(bounds.getSouth(), center.lng), bounds.getNorthEast());
      } else {
          bounds1 = L.latLngBounds(L.latLng(center.lat, bounds.getWest()), bounds.getNorthEast());
          bounds2 = L.latLngBounds(bounds.getSouthWest(), L.latLng(center.lat, bounds.getEast()));
      }
      
      // Process sequentially to conserve memory
      const tiles1 = await renderLayerRecursive(bounds1, layerType, zoomForRender);
      const tiles2 = await renderLayerRecursive(bounds2, layerType, zoomForRender);
      
      return [...tiles1, ...tiles2];
  }, [calculatePixelDimensions, renderCanvasForBounds]);
  
  const performPngExport = useCallback(async (type: 'combined' | 'base' | 'lines' | 'labels') => {
      const visibleTracks = coloredTracks.filter(t => t.isVisible);
      if ((type === 'combined' || type === 'lines') && visibleTracks.length === 0) {
        setNotification({ type: 'error', message: "Cannot export with lines without a visible track."});
        return;
      }
      if (type === 'labels' && (labelDensity < 0 || tileLayerKey !== 'esriImagery')) {
        setNotification({ type: 'info', message: "Labels are off or unavailable for this map style." });
        return;
      }
      if (!exportDimensions.width || !exportDimensions.height || !derivedExportZoom || !exportBounds) {
        setNotification({ type: 'error', message: "Export properties not calculated yet."});
        return;
      }
      
      setNotification(null);
      const setters = { 'combined': setIsExporting, 'base': setIsExportingBase, 'lines': setIsExportingLines, 'labels': setIsExportingLabels };
      setters[type](true);

      try {
        let finalCanvas: HTMLCanvasElement;
        const targetWidth = exportDimensions.width;
        const targetHeight = exportDimensions.height;

        const renderAndStitchLayer = async (layerType: 'base' | 'lines' | 'labels-only', zoom: number) => {
            const tiles = await renderLayerRecursive(exportBounds, layerType, zoom);
            const stitched = await stitchCanvases(tiles, exportBounds, targetWidth, targetHeight, zoom);
            // Free memory from intermediate tiles
            tiles.forEach(t => { t.canvas.width = 0; t.canvas.height = 0; });
            return stitched;
        };

        if (type === 'combined') {
            const baseCanvas = await renderAndStitchLayer('base', derivedExportZoom);
            const linesCanvas = visibleTracks.length > 0 ? await renderAndStitchLayer('lines', derivedExportZoom) : null;
            const labelsCanvas = tileLayerKey === 'esriImagery' && labelDensity >= 0 ? await renderAndStitchLayer('labels-only', (previewZoom || zoom) + labelDensity) : null;
            
            finalCanvas = document.createElement('canvas');
            finalCanvas.width = targetWidth;
            finalCanvas.height = targetHeight;
            const ctx = finalCanvas.getContext('2d')!;
            ctx.drawImage(baseCanvas, 0, 0);
            if (linesCanvas) ctx.drawImage(linesCanvas, 0, 0);
            if (labelsCanvas) ctx.drawImage(labelsCanvas, 0, 0);
            
            // Free memory
            baseCanvas.width = 0; baseCanvas.height = 0;
            if (linesCanvas) { linesCanvas.width = 0; linesCanvas.height = 0; }
            if (labelsCanvas) { labelsCanvas.width = 0; labelsCanvas.height = 0; }

        } else {
            let layerType: 'base' | 'lines' | 'labels-only';
            let zoomForRender = derivedExportZoom;
            if (type === 'base') layerType = 'base';
            else if (type === 'lines') layerType = 'lines';
            else {
                layerType = 'labels-only';
                zoomForRender = (previewZoom || zoom) + labelDensity;
            }
            finalCanvas = await renderAndStitchLayer(layerType, zoomForRender);
        }

        const blob = await new Promise<Blob|null>(resolve => finalCanvas.toBlob(resolve, 'image/png'));
        if (blob) {
            const link = document.createElement('a');
            link.download = `gpx-map-${type}-${Date.now()}.png`;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        }
        finalCanvas.width = 0; finalCanvas.height = 0;

      } catch (err: any) {
          setNotification({ type: 'error', message: err.message || 'Failed to export map. Please try again.' });
          console.error(err);
      } finally {
          setters[type](false);
      }
  }, [coloredTracks, exportDimensions, exportBounds, derivedExportZoom, lineThickness, exportQuality, tileLayerKey, labelDensity, previewZoom, zoom, stitchCanvases, renderLayerRecursive]);

  const performZipExport = useCallback(async () => {
    const visibleTracks = coloredTracks.filter(t => t.isVisible);
    if (visibleTracks.length === 0) {
        setNotification({ type: 'error', message: "Cannot export with lines without a visible track."});
        return;
    }
    if (!exportDimensions.width || !exportDimensions.height || !derivedExportZoom || !exportBounds) {
        setNotification({ type: 'error', message: "Export properties not calculated yet."});
        return;
    }

    setNotification(null);
    setIsExportingZip(true);

    const canMerge = exportDimensions.width * exportDimensions.height <= MERGE_PIXEL_LIMIT;
    if (!canMerge) {
        setNotification({ type: 'info', message: 'Export is too large for merged PNGs; only tiles will be included in the ZIP.' });
    }

    try {
        const mainZip = new JSZip();
        const mergedCanvases: { base?: HTMLCanvasElement, lines?: HTMLCanvasElement, labels?: HTMLCanvasElement } = {};
        
        // This function now does both: zips tiles and returns canvases for merging.
        const generateTilesAndMaybeReturn = async (
            bounds: L.LatLngBounds, 
            layerType: 'base' | 'lines' | 'labels-only',
            zoomForRender: number,
            zipFolder: JSZip,
            tileCounter: { count: number }
        ): Promise<{ canvas: HTMLCanvasElement; bounds: L.LatLngBounds }[]> => {
            const { width, height } = calculatePixelDimensions(bounds, zoomForRender);

            if (width <= MAX_TILE_DIMENSION && height <= MAX_TILE_DIMENSION) {
                const canvas = await renderCanvasForBounds(bounds, layerType, zoomForRender);
                if (canvas) {
                    const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve, 'image/png'));
                    if (blob) {
                        const tileName = `tile_${String(tileCounter.count++).padStart(4, '0')}.png`;
                        zipFolder.file(tileName, blob);
                    }
                    return [{ canvas, bounds }];
                }
                return [];
            }

            const center = bounds.getCenter();
            const [b1, b2] = width > height 
                ? [L.latLngBounds(bounds.getSouthWest(), L.latLng(bounds.getNorth(), center.lng)), L.latLngBounds(L.latLng(bounds.getSouth(), center.lng), bounds.getNorthEast())]
                : [L.latLngBounds(L.latLng(center.lat, bounds.getWest()), bounds.getNorthEast()), L.latLngBounds(bounds.getSouthWest(), L.latLng(center.lat, bounds.getEast()))];

            // Sequential processing to save memory
            const tiles1 = await generateTilesAndMaybeReturn(b1, layerType, zoomForRender, zipFolder, tileCounter);
            const tiles2 = await generateTilesAndMaybeReturn(b2, layerType, zoomForRender, zipFolder, tileCounter);
            return [...tiles1, ...tiles2];
        };

        // Process Base Layer
        const baseZip = mainZip.folder('base')!;
        const baseTiles = await generateTilesAndMaybeReturn(exportBounds, 'base', derivedExportZoom, baseZip, { count: 0 });
        if (canMerge && baseTiles.length > 0) {
            mergedCanvases.base = await stitchCanvases(baseTiles, exportBounds, exportDimensions.width, exportDimensions.height, derivedExportZoom);
            const blob = await new Promise<Blob|null>(res => mergedCanvases.base!.toBlob(res));
            if (blob) mainZip.file('base.png', blob);
        }
        baseTiles.forEach(t => { t.canvas.width = 0; t.canvas.height = 0; });
        
        // Process Lines Layer
        const linesZip = mainZip.folder('lines')!;
        const linesTiles = await generateTilesAndMaybeReturn(exportBounds, 'lines', derivedExportZoom, linesZip, { count: 0 });
        if (canMerge && linesTiles.length > 0) {
            mergedCanvases.lines = await stitchCanvases(linesTiles, exportBounds, exportDimensions.width, exportDimensions.height, derivedExportZoom);
            const blob = await new Promise<Blob|null>(res => mergedCanvases.lines!.toBlob(res));
            if (blob) mainZip.file('lines.png', blob);
        }
        linesTiles.forEach(t => { t.canvas.width = 0; t.canvas.height = 0; });
        
        // Process Labels Layer
        if (tileLayerKey === 'esriImagery' && labelDensity >= 0) {
            const labelZoom = (previewZoom || zoom) + labelDensity;
            const labelsZip = mainZip.folder('labels')!;
            const labelsTiles = await generateTilesAndMaybeReturn(exportBounds, 'labels-only', labelZoom, labelsZip, { count: 0 });
            if (canMerge && labelsTiles.length > 0) {
                mergedCanvases.labels = await stitchCanvases(labelsTiles, exportBounds, exportDimensions.width, exportDimensions.height, labelZoom);
                const blob = await new Promise<Blob|null>(res => mergedCanvases.labels!.toBlob(res));
                if (blob) mainZip.file('labels.png', blob);
            }
            labelsTiles.forEach(t => { t.canvas.width = 0; t.canvas.height = 0; });
        }

        // Create combined PNG if possible
        if (canMerge && mergedCanvases.base) {
            const finalCanvas = document.createElement('canvas');
            finalCanvas.width = exportDimensions.width;
            finalCanvas.height = exportDimensions.height;
            const ctx = finalCanvas.getContext('2d')!;
            ctx.drawImage(mergedCanvases.base, 0, 0);
            if (mergedCanvases.lines) ctx.drawImage(mergedCanvases.lines, 0, 0);
            if (mergedCanvases.labels) ctx.drawImage(mergedCanvases.labels, 0, 0);
            
            const blob = await new Promise<Blob|null>(res => finalCanvas.toBlob(res));
            if (blob) mainZip.file('combined.png', blob);
        }

        // Clean up merged canvases
        Object.values(mergedCanvases).forEach(c => { if(c) { c.width = 0; c.height = 0; } });

        const zipBlob = await mainZip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.download = `StrataLines_Export_${Date.now()}.zip`;
        link.href = URL.createObjectURL(zipBlob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (err: any) {
        setNotification({ type: 'error', message: err.message || 'Failed to export ZIP. Please try again.' });
        console.error(err);
    } finally {
        setIsExportingZip(false);
    }
  }, [coloredTracks, exportDimensions, exportBounds, derivedExportZoom, tileLayerKey, labelDensity, previewZoom, zoom, calculatePixelDimensions, renderCanvasForBounds, stitchCanvases]);

  const selectedTileLayer = TILE_LAYERS.find(l => l.key === tileLayerKey) || TILE_LAYERS[0];

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col md:flex-row font-sans">
      <div ref={mapContainerRef} className="w-full h-[50vh] md:h-screen md:flex-1 relative flex justify-center items-center bg-gray-900">
        <div ref={mapWrapperRef} className="h-full w-full">
            <MapComponent 
              tracks={coloredTracks} 
              onUserMove={handleUserMove}
              center={L.latLng(mapCenter.lat, mapCenter.lng)}
              zoom={zoom}
              lineThickness={lineThickness}
              exportBounds={exportBounds}
              onExportBoundsChange={handleExportBoundsChange}
              boundsToFit={boundsToFit}
              onBoundsFitted={onBoundsFitted}
              tileLayer={selectedTileLayer}
              labelDensity={labelDensity}
              highlightedTrackId={highlightedTrackId}
            />
        </div>
      </div>
      <ControlsPanel
        tracks={tracks}
        handleFiles={handleFiles}
        removeTrack={removeTrack}
        removeAllTracks={removeAllTracks}
        toggleTrackVisibility={toggleTrackVisibility}
        handleExport={() => performPngExport('combined')}
        handleExportBase={() => performPngExport('base')}
        handleExportLines={() => performPngExport('lines')}
        handleExportLabels={() => performPngExport('labels')}
        handleExportZip={performZipExport}
        isExportingZip={isExportingZip}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        exportBoundsAspectRatio={exportBoundsAspectRatio}
        exportQuality={exportQuality}
        setExportQuality={setExportQuality}
        derivedExportZoom={derivedExportZoom}
        isLoading={isLoading}
        isExporting={isExporting}
        isExportingBase={isExportingBase}
        isExportingLines={isExportingLines}
        isExportingLabels={isExportingLabels}
        notification={notification}
        setNotification={setNotification}
        lineColorStart={lineColorStart}
        setLineColorStart={setLineColorStart}
        lineColorEnd={lineColorEnd}
        setLineColorEnd={setLineColorEnd}
        lineThickness={lineThickness}
        setLineThickness={setLineThickness}
        viewportMiles={viewportMiles}
        exportDimensions={exportDimensions}
        minLengthFilter={minLengthFilter}
        setMinLengthFilter={setMinLengthFilter}
        tileLayerKey={tileLayerKey}
        setTileLayerKey={setTileLayerKey}
        labelDensity={labelDensity}
        setLabelDensity={setLabelDensity}
        onTrackHover={setHighlightedTrackId}
        handleDownloadAllTracks={handleDownloadAllTracks}
        isDownloading={isDownloading}
      />
    </div>
  );
};

export default App;