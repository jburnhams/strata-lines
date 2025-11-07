
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
import { LABEL_TILE_URL_RETINA } from './labelTiles';
import { trackToGpxString } from './services/gpxGenerator';
import { getTracksBounds } from './services/utils';
import { assignTrackColors } from './utils/colorAssignment';
import { assertCanvasHasLineContent, assertCanvasHasMapTiles } from './utils/canvasValidation';
import { useLocalStorage } from './hooks/useLocalStorage';
import { metersToMiles, calculateBoundsDimensions, calculatePixelDimensions } from './utils/mapCalculations';


const createPrintMap = (container: HTMLElement) => {
    return L.map(container, {
        preferCanvas: true,
        attributionControl: false,
        zoomControl: false,
    });
};

const waitForTiles = (tileLayer: L.TileLayer) => {
    return new Promise<void>((resolve, reject) => {
        let completed = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        let pollId: ReturnType<typeof setInterval> | null = null;

        const cleanup = () => {
            tileLayer.off('load', loadHandler);
            tileLayer.off('tileload', tileLoadHandler);
            tileLayer.off('tileerror', tileErrorHandler);
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (pollId !== null) {
                clearInterval(pollId);
                pollId = null;
            }
        };

        const finish = (callback: () => void) => {
            if (completed) {
                return;
            }
            completed = true;
            cleanup();
            callback();
        };

        const tilesReady = () => {
            if (completed) {
                return true;
            }

            const tiles: Array<{ loaded?: boolean; complete?: boolean; el?: HTMLImageElement }> = Object.values((tileLayer as any)._tiles ?? {});
            if (tiles.length === 0) {
                return false;
            }

            const allLoaded = tiles.every(tile => tile.loaded || tile.complete || tile.el?.complete);
            if (allLoaded) {
                finish(() => {
                    setTimeout(() => resolve(), 300);
                });
                return true;
            }
            return false;
        };

        const loadHandler = () => {
            tilesReady();
        };

        const tileLoadHandler = () => {
            tilesReady();
        };

        const tileErrorHandler = (e: unknown) => {
            console.error('Tile error:', e);
            finish(() => reject(new Error('Could not load map tiles for export.')));
        };

        tileLayer.on('load', loadHandler);
        tileLayer.on('tileload', tileLoadHandler);
        tileLayer.on('tileerror', tileErrorHandler);

        timeoutId = setTimeout(() => {
            finish(() => reject(new Error('Map export timed out waiting for tiles.')));
        }, 60000);

        pollId = setInterval(() => {
            tilesReady();
        }, 200);

        if (!tileLayer.isLoading()) {
            tilesReady();
        }
    });
};

const waitForPolylines = (polylines: L.Polyline[], timeoutMs: number = 60000) => {
    if (polylines.length === 0) {
        return Promise.resolve();
    }

    const globalScope = globalThis as typeof globalThis & {
        requestAnimationFrame?: typeof requestAnimationFrame;
        cancelAnimationFrame?: typeof cancelAnimationFrame;
    };

    type FrameHandle = number | ReturnType<typeof setTimeout>;

    const scheduleFrame = (callback: FrameRequestCallback): FrameHandle => {
        if (typeof globalScope.requestAnimationFrame === 'function') {
            return globalScope.requestAnimationFrame(callback);
        }

        return setTimeout(() => callback(Date.now()), 16);
    };

    const cancelFrame = (handle: FrameHandle) => {
        if (typeof globalScope.cancelAnimationFrame === 'function' && typeof handle === 'number') {
            globalScope.cancelAnimationFrame(handle);
            return;
        }

        clearTimeout(handle as ReturnType<typeof setTimeout>);
    };

    const now = () => (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();

    return new Promise<void>((resolve, reject) => {
        let frameHandle: FrameHandle | null = null;
        let settled = false;
        const startTime = now();

        const cleanup = () => {
            if (frameHandle !== null) {
                cancelFrame(frameHandle);
                frameHandle = null;
            }
        };

        const finish = (callback: () => void) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            callback();
        };

        const arePolylinesReady = () => {
            return polylines.every(polyline => {
                const layer: any = polyline;
                if (layer._renderer && layer._renderer._drawnLayers) {
                    return Boolean(layer._renderer._drawnLayers[layer._leaflet_id]);
                }
                if (layer._path && typeof layer._path.getAttribute === 'function') {
                    return Boolean(layer._path.getAttribute('d'));
                }
                return false;
            });
        };

        const tick = () => {
            if (arePolylinesReady()) {
                finish(() => {
                    setTimeout(() => resolve(), 100);
                });
                return;
            }

            if (now() - startTime > timeoutMs) {
                finish(() => reject(new Error('Map export timed out waiting for tracks to render.')));
                return;
            }

            frameHandle = scheduleFrame(() => {
                tick();
            });
        };

        if (arePolylinesReady()) {
            finish(() => {
                setTimeout(() => resolve(), 100);
            });
        } else {
            tick();
        }
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
    return assignTrackColors(tracks, lineColorStart, lineColorEnd);
  }, [tracks, lineColorStart, lineColorEnd]);

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

  }, [exportBounds, previewZoom, exportQuality]);

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

  /**
   * Resizes a canvas to exact target dimensions
   * Used when labels are rendered at a different zoom level than the base map
   */
  const resizeCanvas = useCallback((sourceCanvas: HTMLCanvasElement, targetWidth: number, targetHeight: number): HTMLCanvasElement => {
    console.log(`📐 Resizing canvas from ${sourceCanvas.width}x${sourceCanvas.height} to ${targetWidth}x${targetHeight}`);

    // Create new canvas at target size
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = targetWidth;
    resizedCanvas.height = targetHeight;

    const ctx = resizedCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for canvas resize');
    }

    // Enable smooth scaling for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw source canvas scaled to target dimensions
    ctx.drawImage(
      sourceCanvas,
      0, 0, sourceCanvas.width, sourceCanvas.height,  // Source rectangle
      0, 0, targetWidth, targetHeight  // Destination rectangle
    );

    const scaleFactor = targetWidth / sourceCanvas.width;
    console.log(`✅ Resize complete, scale factor: ${scaleFactor.toFixed(2)}x`);

    return resizedCanvas;
  }, []);

  const renderCanvasForBounds = useCallback(async (bounds: L.LatLngBounds, layerType: 'base' | 'lines' | 'labels-only', zoomForRender: number): Promise<HTMLCanvasElement | null> => {
    const visibleTracks = coloredTracks.filter(t => t.isVisible);
    const hasTrackIntersectingBounds = visibleTracks.some(track => {
      if (!track.points || track.points.length === 0) {
        return false;
      }
      const latLngPoints = track.points.map(point => L.latLng(point[0], point[1]));
      const trackBounds = L.latLngBounds(latLngPoints);
      return trackBounds.intersects(bounds);
    });
    let isTransparent = false;

    if (layerType === 'lines' || layerType === 'labels-only') {
        isTransparent = true;
    }

    console.group(`🎨 Rendering ${layerType} at zoom ${zoomForRender}`);
    console.log('Target bounds:', {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
      center: bounds.getCenter()
    });

    // Calculate the EXACT pixel dimensions we need for the target bounds
    const { width: targetWidth, height: targetHeight } = calculatePixelDimensions(bounds, zoomForRender);
    console.log('Target dimensions:', { width: targetWidth, height: targetHeight });

    // STRATEGY: Render a slightly larger area, then crop to exact bounds
    // This ensures we capture the exact geographic area even if alignment is slightly off
    const PADDING_PERCENT = 0.15; // 15% padding on each side
    const paddedWidth = Math.round(targetWidth * (1 + PADDING_PERCENT * 2));
    const paddedHeight = Math.round(targetHeight * (1 + PADDING_PERCENT * 2));

    console.log('Padded container dimensions:', { width: paddedWidth, height: paddedHeight });

    const printContainer = document.createElement('div');
    printContainer.style.width = `${paddedWidth}px`;
    printContainer.style.height = `${paddedHeight}px`;
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

        // Set the view to the center of our target bounds at exact zoom
        printMap.setView(bounds.getCenter(), zoomForRender, { animate: false });
        printMap.invalidateSize({ pan: false });

        // Add layers
        if (layerType === 'base') {
            const selectedTileLayer = TILE_LAYERS.find(l => l.key === tileLayerKey) || TILE_LAYERS[0];
            const tileLayer = L.tileLayer(selectedTileLayer.layers[0].url, { attribution: '' });
            tileLayer.addTo(printMap);
            await waitForTiles(tileLayer);
        } else if (layerType === 'labels-only') {
            const labelLayer = L.tileLayer(LABEL_TILE_URL_RETINA, { attribution: '' });
            labelLayer.addTo(printMap);
            await waitForTiles(labelLayer);
        } else if (layerType === 'lines') {
            const exportLineThickness = lineThickness * (1 + exportQuality / 2);
            const polylines: L.Polyline[] = [];
            visibleTracks.forEach(track => {
                const polyline = L.polyline(track.points as L.LatLngExpression[], { color: track.color || '#ff4500', weight: exportLineThickness, opacity: 0.8 }).addTo(printMap!);
                polylines.push(polyline);
            });
            await waitForPolylines(polylines);
        }

        // After rendering, check what bounds we actually got
        const actualBounds = printMap.getBounds();
        console.log('Actual rendered bounds:', {
          north: actualBounds.getNorth(),
          south: actualBounds.getSouth(),
          east: actualBounds.getEast(),
          west: actualBounds.getWest(),
          center: actualBounds.getCenter()
        });

        // Calculate where our target bounds appear in the container
        const targetNW = printMap.latLngToContainerPoint(bounds.getNorthWest());
        const targetSE = printMap.latLngToContainerPoint(bounds.getSouthEast());

        console.log('Target bounds in container pixels:', {
          nw: { x: targetNW.x, y: targetNW.y },
          se: { x: targetSE.x, y: targetSE.y },
          width: targetSE.x - targetNW.x,
          height: targetSE.y - targetNW.y
        });

        // Capture the padded container
        const paddedCanvas = await html2canvas(printContainer, {
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: isTransparent ? null : '#000000',
          scale: 1,
          width: paddedWidth,
          height: paddedHeight,
          windowWidth: paddedWidth,
          windowHeight: paddedHeight,
        });

        console.log('Captured canvas size:', { width: paddedCanvas.width, height: paddedCanvas.height });

        // Now crop to the exact target bounds
        const cropX = Math.round(targetNW.x);
        const cropY = Math.round(targetNW.y);
        const cropWidth = Math.round(targetSE.x - targetNW.x);
        const cropHeight = Math.round(targetSE.y - targetNW.y);

        console.log('Cropping to:', { x: cropX, y: cropY, width: cropWidth, height: cropHeight });

        // Create final canvas with exact target dimensions
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = targetWidth;
        finalCanvas.height = targetHeight;
        const ctx = finalCanvas.getContext('2d');

        if (!ctx) {
            console.error('Failed to get canvas context');
            console.groupEnd();
            return null;
        }

        // Draw the cropped region
        ctx.drawImage(
            paddedCanvas,
            cropX, cropY, cropWidth, cropHeight,  // Source rectangle
            0, 0, targetWidth, targetHeight  // Destination rectangle
        );

        if (layerType === 'base') {
            assertCanvasHasMapTiles(finalCanvas, '#000000');
        } else if (layerType === 'lines' && hasTrackIntersectingBounds) {
            assertCanvasHasLineContent(finalCanvas);
        }

        console.log('✅ Final canvas size:', { width: finalCanvas.width, height: finalCanvas.height });
        console.groupEnd();

        return finalCanvas;
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

      // Create a temporary map for coordinate projection
      // This is only used for converting lat/long to pixel coordinates, not for rendering
      let tempMap: L.Map | null = null;
      const tempContainer = document.createElement('div');
      Object.assign(tempContainer.style, { position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px' });
      document.body.appendChild(tempContainer);

      try {
          tempMap = L.map(tempContainer, { center: [0, 0], zoom: 0 });

          // Convert the NW corner of the total bounds to pixel coordinates at the target zoom
          // This serves as our reference point (pixel 0,0)
          const totalNwPoint = tempMap.project(totalBounds.getNorthWest(), zoom);

          // Position each tile based on its lat/long bounds
          // We calculate pixel offset from the lat/long coordinates to ensure perfect alignment
          for (const tile of tiles) {
              // Convert this tile's NW corner to pixel coordinates at the same zoom level
              const tileNwPoint = tempMap.project(tile.bounds.getNorthWest(), zoom);

              // Calculate pixel offset relative to the total bounds
              // This ensures tiles are positioned based on their geographic location, not arbitrary pixels
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
      // Calculate pixel dimensions for these lat/long bounds at the target zoom level
      // This is only used to determine if we need to split, not for rendering
      const { width, height } = calculatePixelDimensions(bounds, zoomForRender);

      // Base case: if the bounds would render to a canvas smaller than MAX_TILE_DIMENSION,
      // render it as a single tile
      if (width <= MAX_TILE_DIMENSION && height <= MAX_TILE_DIMENSION) {
          const canvas = await renderCanvasForBounds(bounds, layerType, zoomForRender);
          return canvas ? [{ canvas, bounds }] : [];
      }

      // Recursive case: split the bounds in half along the longer dimension
      // This is done purely in lat/long coordinates, dividing at the geographic center
      const center = bounds.getCenter();
      let bounds1: L.LatLngBounds, bounds2: L.LatLngBounds;

      if (width > height) {
          // Split vertically (divide longitude at center)
          // Left half: from SW corner to [North, CenterLng]
          bounds1 = L.latLngBounds(bounds.getSouthWest(), L.latLng(bounds.getNorth(), center.lng));
          // Right half: from [South, CenterLng] to NE corner
          bounds2 = L.latLngBounds(L.latLng(bounds.getSouth(), center.lng), bounds.getNorthEast());
      } else {
          // Split horizontally (divide latitude at center)
          // Top half: from [CenterLat, West] to NE corner
          bounds1 = L.latLngBounds(L.latLng(center.lat, bounds.getWest()), bounds.getNorthEast());
          // Bottom half: from SW corner to [CenterLat, East]
          bounds2 = L.latLngBounds(bounds.getSouthWest(), L.latLng(center.lat, bounds.getEast()));
      }

      // Process sub-bounds sequentially to conserve memory
      // Each recursive call will further split if needed, or render a single tile
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

      console.log('🚀 Starting export:', {
        type,
        exportBounds: {
          north: exportBounds.getNorth(),
          south: exportBounds.getSouth(),
          east: exportBounds.getEast(),
          west: exportBounds.getWest()
        },
        exportZoom: derivedExportZoom,
        previewZoom: previewZoom || zoom,
        dimensions: exportDimensions
      });

      setNotification(null);
      const setters = { 'combined': setIsExporting, 'base': setIsExportingBase, 'lines': setIsExportingLines, 'labels': setIsExportingLabels };
      setters[type](true);

      try {
        let finalCanvas: HTMLCanvasElement;

        // SIMPLIFIED: Direct rendering without tiling
        if (type === 'combined') {
            console.log('🎯 Rendering combined export...');
            const baseCanvas = await renderCanvasForBounds(exportBounds, 'base', derivedExportZoom);
            const linesCanvas = visibleTracks.length > 0 ? await renderCanvasForBounds(exportBounds, 'lines', derivedExportZoom) : null;

            // Labels are rendered at a different zoom level
            const labelZoom = (previewZoom || zoom) + labelDensity;
            let labelsCanvas = tileLayerKey === 'esriImagery' && labelDensity >= 0 ?
                await renderCanvasForBounds(exportBounds, 'labels-only', labelZoom) : null;

            if (!baseCanvas) throw new Error('Failed to render base layer');

            // CRITICAL: Resize labels to match base canvas dimensions
            // Labels are rendered at labelZoom but need to overlay at derivedExportZoom
            if (labelsCanvas) {
                console.group('🏷️  Processing labels layer');
                console.log(`Base zoom: ${derivedExportZoom}, Label zoom: ${labelZoom}`);
                console.log(`Base dimensions: ${baseCanvas.width}x${baseCanvas.height}`);
                console.log(`Label dimensions (before resize): ${labelsCanvas.width}x${labelsCanvas.height}`);

                // Only resize if dimensions don't match
                if (labelsCanvas.width !== baseCanvas.width || labelsCanvas.height !== baseCanvas.height) {
                    console.log('⚠️  Dimensions mismatch - resizing labels to match base');
                    const resizedLabels = resizeCanvas(labelsCanvas, baseCanvas.width, baseCanvas.height);

                    // Free original labels canvas
                    labelsCanvas.width = 0;
                    labelsCanvas.height = 0;

                    labelsCanvas = resizedLabels;
                    console.log(`Label dimensions (after resize): ${labelsCanvas.width}x${labelsCanvas.height}`);
                } else {
                    console.log('✅ Dimensions match - no resize needed');
                }
                console.groupEnd();
            }

            // Stack layers
            console.log('📚 Stacking layers: base → lines → labels');
            finalCanvas = document.createElement('canvas');
            finalCanvas.width = baseCanvas.width;
            finalCanvas.height = baseCanvas.height;
            const ctx = finalCanvas.getContext('2d')!;
            ctx.drawImage(baseCanvas, 0, 0);
            if (linesCanvas) {
                console.log(`  + Lines layer (${linesCanvas.width}x${linesCanvas.height})`);
                ctx.drawImage(linesCanvas, 0, 0);
            }
            if (labelsCanvas) {
                console.log(`  + Labels layer (${labelsCanvas.width}x${labelsCanvas.height})`);
                ctx.drawImage(labelsCanvas, 0, 0);
            }

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
            const canvas = await renderCanvasForBounds(exportBounds, layerType, zoomForRender);
            if (!canvas) throw new Error(`Failed to render ${layerType} layer`);
            finalCanvas = canvas;
        }

        console.log('✅ Export complete, canvas size:', { width: finalCanvas.width, height: finalCanvas.height });

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
          console.error('Export error:', err);
      } finally {
          setters[type](false);
      }
  }, [coloredTracks, exportDimensions, exportBounds, derivedExportZoom, lineThickness, exportQuality, tileLayerKey, labelDensity, previewZoom, zoom, renderCanvasForBounds, resizeCanvas]);

  const performZipExport = useCallback(async () => {
    setNotification({ type: 'info', message: "ZIP export temporarily disabled while debugging basic export." });
    /* TEMPORARILY DISABLED FOR DEBUGGING
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
    */
  }, []);

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