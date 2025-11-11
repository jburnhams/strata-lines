import L from 'leaflet';
import html2canvas from 'html2canvas';
import type { Track } from '../types';
import { TILE_LAYERS } from '../constants';
import { LABEL_TILE_URL_RETINA } from '../labelTiles';
import { calculatePixelDimensions } from './mapCalculations';

/**
 * Creates a Leaflet map configured for export/printing
 */
export const createPrintMap = (container: HTMLElement): L.Map => {
  return L.map(container, {
    preferCanvas: true,
    attributionControl: false,
    zoomControl: false,
  });
};

/**
 * Waits for all tiles in a tile layer to load
 */
export const waitForTiles = (
  tileLayer: L.TileLayer,
  onProgress?: (loaded: number, total: number) => void
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        cleanup();
        reject(new Error('Map export timed out waiting for tiles.'));
      },
      60000
    );

    let loaded = false;

    // Track tile loading progress
    let loadedCount = 0;
    let totalCount = 0;

    // Define all handlers so we can clean them up later
    const tileLoadStartHandler = () => {
      totalCount++;
      if (onProgress) {
        onProgress(loadedCount, totalCount);
      }
    };

    const tileLoadHandler = () => {
      loadedCount++;
      if (onProgress) {
        onProgress(loadedCount, totalCount);
      }
    };

    const tileErrorHandler = (e: any) => {
      console.error('Tile error:', e);
      cleanup();
      clearTimeout(timeout);
      reject(new Error('Could not load map tiles for export.'));
    };

    const loadCompleteHandler = () => {
      if (!loaded) {
        loaded = true;
        cleanup();
        clearTimeout(timeout);
        setTimeout(resolve, 500); // Extra delay for rendering
      }
    };

    // Cleanup function to remove all listeners
    const cleanup = () => {
      tileLayer.off('tileloadstart', tileLoadStartHandler);
      tileLayer.off('tileload', tileLoadHandler);
      tileLayer.off('load', loadCompleteHandler);
      tileLayer.off('tileerror', tileErrorHandler);
    };

    // Attach listeners
    tileLayer.on('tileloadstart', tileLoadStartHandler);
    tileLayer.on('tileload', tileLoadHandler);
    tileLayer.on('load', loadCompleteHandler);
    tileLayer.on('tileerror', tileErrorHandler);

    // This check is crucial. fitBounds() might finish and tiles are loading,
    // but isLoading() might not be true for a few ms. A small delay helps.
    setTimeout(() => {
      if (tileLayer.isLoading() === false) {
        loadCompleteHandler();
      }
    }, 100);
  });
};

/**
 * Waits for canvas renderer to finish drawing all vector layers (polylines, polygons, etc.)
 */
export const waitForCanvasRenderer = (
  map: L.Map,
  onProgress?: (checksCompleted: number, maxChecks: number) => void
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Map export timed out waiting for canvas renderer.')),
      60000
    );

    // Get the canvas renderer from the map
    // @ts-ignore - Accessing internal Leaflet renderer
    const renderer = map.getRenderer(L.polyline([]));

    if (!renderer || !(renderer instanceof L.Canvas)) {
      // No canvas renderer, resolve immediately
      clearTimeout(timeout);
      resolve();
      return;
    }

    let isRendered = false;
    let checkCount = 0;
    const maxChecks = 50; // Maximum number of checks before assuming render is complete

    const checkRenderComplete = () => {
      if (isRendered) return;
      checkCount++;

      // Report progress
      if (onProgress) {
        onProgress(checkCount, maxChecks);
      }

      // @ts-ignore - Accessing internal canvas element
      const canvas = renderer._container as HTMLCanvasElement;

      if (!canvas) {
        isRendered = true;
        clearTimeout(timeout);
        resolve();
        return;
      }

      // Check if canvas has been drawn to (not blank)
      // For a blank canvas, all pixels would be transparent/white
      const ctx = canvas.getContext('2d');
      if (ctx) {
        try {
          // Only check a sample of pixels for performance
          const sampleSize = Math.min(canvas.width * canvas.height, 10000);
          const imageData = ctx.getImageData(0, 0, canvas.width, Math.min(canvas.height, Math.ceil(sampleSize / canvas.width)));
          const hasContent = imageData.data.some((value, index) => {
            // Check alpha channel (every 4th value starting at index 3)
            return index % 4 === 3 && value > 0;
          });

          // Resolve if content found OR if we've checked many times (assume empty or problematic render)
          if (hasContent || checkCount >= maxChecks) {
            isRendered = true;
            clearTimeout(timeout);
            // Add a small delay to ensure rendering is fully complete
            setTimeout(resolve, 200);
          }
        } catch (e) {
          // In case getImageData fails (e.g., in some test environments)
          console.warn('Could not check canvas content:', e);
          isRendered = true;
          clearTimeout(timeout);
          setTimeout(resolve, 300);
        }
      } else {
        // No context available, just wait a bit
        isRendered = true;
        clearTimeout(timeout);
        setTimeout(resolve, 300);
      }
    };

    // Listen for render updates
    // @ts-ignore - Accessing internal renderer events
    if (renderer.on) {
      renderer.on('update', checkRenderComplete);
    }

    // Initial check after a short delay to allow rendering to start
    setTimeout(checkRenderComplete, 100);

    // Also check periodically in case events are missed
    const checkInterval = setInterval(() => {
      if (isRendered) {
        clearInterval(checkInterval);
        return;
      }
      checkRenderComplete();
    }, 200);

    // Clear interval when done
    const originalResolve = resolve;
    resolve = () => {
      clearInterval(checkInterval);
      originalResolve();
    };
  });
};

/**
 * Waits for all rendering to complete on a Leaflet map
 * Handles both tile layers and vector layers (polylines, etc.)
 */
export interface WaitForRenderOptions {
  map: L.Map;
  tileLayer?: L.TileLayer;
  hasVectorLayers?: boolean;
  timeoutMs?: number;
  onTileProgress?: (loaded: number, total: number) => void;
  onLineProgress?: (checksCompleted: number, maxChecks: number) => void;
}

export const waitForRender = async (options: WaitForRenderOptions): Promise<void> => {
  const {
    map,
    tileLayer,
    hasVectorLayers = false,
    timeoutMs = 60000,
    onTileProgress,
    onLineProgress,
  } = options;

  console.log('🕐 Waiting for render to complete...', {
    hasTiles: !!tileLayer,
    hasVectorLayers,
    timeout: `${timeoutMs}ms`,
  });

  const startTime = Date.now();

  // Create timeout handle that we can clear
  let timeoutHandle: NodeJS.Timeout | null = null;
  let timeoutReject: ((error: Error) => void) | null = null;

  try {
    // Only create timeout promise if we actually need to wait for something
    const needsWait = !!tileLayer || hasVectorLayers;

    let timeoutPromise: Promise<void> | null = null;
    if (needsWait) {
      timeoutPromise = new Promise<void>((_, reject) => {
        timeoutReject = reject;
        timeoutHandle = setTimeout(
          () => reject(new Error(`Render timeout after ${timeoutMs}ms`)),
          timeoutMs
        );
      });
    }

    // Wait for tiles if present
    if (tileLayer) {
      console.log('⏳ Waiting for tiles...');
      await Promise.race([waitForTiles(tileLayer, onTileProgress), timeoutPromise!]);
      console.log(`✅ Tiles loaded (${Date.now() - startTime}ms)`);
    }

    // Wait for canvas renderer if vector layers are present
    if (hasVectorLayers) {
      console.log('⏳ Waiting for vector layers to render...');
      await Promise.race([waitForCanvasRenderer(map, onLineProgress), timeoutPromise!]);
      console.log(`✅ Vector layers rendered (${Date.now() - startTime}ms)`);
    }

    // Clear timeout since we completed successfully
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }

    // Add a final small delay to ensure everything is settled
    await new Promise((resolve) => setTimeout(resolve, 100));

    const totalTime = Date.now() - startTime;
    console.log(`✅ Render complete (total: ${totalTime}ms)`);
  } catch (error) {
    // Clear timeout on error
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }

    const totalTime = Date.now() - startTime;
    console.error(`❌ Render failed after ${totalTime}ms:`, error);
    throw error;
  }
};

/**
 * Canvas-like interface that works in both browser and Node.js environments
 */
interface CanvasLike {
  width: number;
  height: number;
  getContext(contextId: '2d'): any;
}

/**
 * Resizes a canvas to exact target dimensions
 * Used when labels are rendered at a different zoom level than the base map
 */
export const resizeCanvas = (
  sourceCanvas: CanvasLike,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement => {
  console.log(
    `📐 Resizing canvas from ${sourceCanvas.width}x${sourceCanvas.height} to ${targetWidth}x${targetHeight}`
  );

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
  // Type assertion needed as both HTMLCanvasElement and Node.js Canvas work with drawImage
  ctx.drawImage(
    sourceCanvas as any,
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height, // Source rectangle
    0,
    0,
    targetWidth,
    targetHeight // Destination rectangle
  );

  const scaleFactor = targetWidth / sourceCanvas.width;
  console.log(`✅ Resize complete, scale factor: ${scaleFactor.toFixed(2)}x`);

  return resizedCanvas;
};

/**
 * Calculates subdivisions of geographic bounds that fit within a maximum pixel dimension
 * Recursively divides bounds along the longest dimension until all sections fit
 */
export const calculateSubdivisions = (
  bounds: L.LatLngBounds,
  zoomForRender: number,
  maxDim: number
): L.LatLngBounds[] => {
  const { width, height } = calculatePixelDimensions(bounds, zoomForRender);

  // Base case: if both dimensions fit within maxDim, return this bounds as a single subdivision
  if (width <= maxDim && height <= maxDim) {
    return [bounds];
  }

  // Recursive case: split along the longest dimension
  const center = bounds.getCenter();
  let bounds1: L.LatLngBounds, bounds2: L.LatLngBounds;

  if (width > height) {
    // Split vertically (divide longitude at center)
    bounds1 = L.latLngBounds(
      bounds.getSouthWest(),
      L.latLng(bounds.getNorth(), center.lng)
    );
    bounds2 = L.latLngBounds(
      L.latLng(bounds.getSouth(), center.lng),
      bounds.getNorthEast()
    );
  } else {
    // Split horizontally (divide latitude at center)
    bounds1 = L.latLngBounds(
      L.latLng(center.lat, bounds.getWest()),
      bounds.getNorthEast()
    );
    bounds2 = L.latLngBounds(
      bounds.getSouthWest(),
      L.latLng(center.lat, bounds.getEast())
    );
  }

  // Recursively subdivide each half
  const subdivisions1 = calculateSubdivisions(bounds1, zoomForRender, maxDim);
  const subdivisions2 = calculateSubdivisions(bounds2, zoomForRender, maxDim);

  return [...subdivisions1, ...subdivisions2];
};

/**
 * Calculates the grid layout (rows, columns) for subdivisions
 * and returns them in the correct order for stitching
 *
 * This function analyzes the geographical bounds of subdivisions to determine
 * their relative positions and arranges them in a 2D grid suitable for image stitching.
 */
export const calculateGridLayout = (
  subdivisions: L.LatLngBounds[]
): { rows: number; columns: number; orderedSubdivisions: L.LatLngBounds[] } => {
  if (subdivisions.length === 1) {
    return { rows: 1, columns: 1, orderedSubdivisions: subdivisions };
  }

  // Extract unique latitude and longitude boundaries
  const lats = new Set<number>();
  const lngs = new Set<number>();

  subdivisions.forEach((bounds) => {
    lats.add(bounds.getNorth());
    lats.add(bounds.getSouth());
    lngs.add(bounds.getWest());
    lngs.add(bounds.getEast());
  });

  // Sort boundaries to create grid lines
  const sortedLats = Array.from(lats).sort((a, b) => b - a); // North to South (descending)
  const sortedLngs = Array.from(lngs).sort((a, b) => a - b); // West to East (ascending)

  const rows = sortedLats.length - 1;
  const columns = sortedLngs.length - 1;

  // Create a 2D grid to store subdivisions in their correct positions
  const grid: (L.LatLngBounds | null)[][] = Array(rows)
    .fill(null)
    .map(() => Array(columns).fill(null));

  // Place each subdivision in the grid based on its bounds
  subdivisions.forEach((bounds) => {
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const east = bounds.getEast();

    // Find the row and column for this subdivision
    const rowIndex = sortedLats.findIndex((lat) => lat === north);
    const colIndex = sortedLngs.findIndex((lng) => lng === west);

    if (rowIndex !== -1 && colIndex !== -1 && rowIndex < rows && colIndex < columns) {
      grid[rowIndex][colIndex] = bounds;
    }
  });

  // Flatten the grid to create ordered subdivisions (row-major order: left-to-right, top-to-bottom)
  const orderedSubdivisions: L.LatLngBounds[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      if (grid[row][col]) {
        orderedSubdivisions.push(grid[row][col]!);
      }
    }
  }

  return { rows, columns, orderedSubdivisions };
};

export interface RenderOptions {
  bounds: L.LatLngBounds;
  layerType: 'base' | 'lines' | 'labels-only';
  zoomForRender: number;
  visibleTracks?: Track[];
  tileLayerKey?: string;
  lineThickness?: number;
  exportQuality?: number;
  renderScale?: number; // Scale factor for html2canvas (1 for standard, 2 for retina)
  onTileProgress?: (loaded: number, total: number) => void;
  onLineProgress?: (checksCompleted: number, maxChecks: number) => void;
}

/**
 * Renders a specific geographic area to a canvas for a particular layer type
 */
export const renderCanvasForBounds = async (
  options: RenderOptions
): Promise<HTMLCanvasElement | null> => {
  const renderStartTime = performance.now();

  const {
    bounds,
    layerType,
    zoomForRender,
    visibleTracks = [],
    tileLayerKey = 'esriImagery',
    lineThickness = 3,
    exportQuality = 2,
    renderScale = 1,
    onTileProgress,
    onLineProgress,
  } = options;

  const isTransparent = layerType === 'lines' || layerType === 'labels-only';

  console.group(`🎨 Rendering ${layerType} at zoom ${zoomForRender}${renderScale > 1 ? ` (${renderScale}x scale)` : ''}`);
  console.log('Target bounds:', {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
    center: bounds.getCenter(),
  });

  // Calculate the EXACT pixel dimensions we need for the target bounds
  const { width: targetWidth, height: targetHeight } = calculatePixelDimensions(
    bounds,
    zoomForRender
  );
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

    // Add layers and wait for rendering to complete
    let tileLayer: L.TileLayer | undefined;
    let hasVectorLayers = false;

    if (layerType === 'base') {
      const selectedTileLayer =
        TILE_LAYERS.find((l) => l.key === tileLayerKey) || TILE_LAYERS[0];
      tileLayer = L.tileLayer(selectedTileLayer.layers[0].url, { attribution: '' });
      tileLayer.addTo(printMap);
    } else if (layerType === 'labels-only') {
      tileLayer = L.tileLayer(LABEL_TILE_URL_RETINA, { attribution: '' });
      tileLayer.addTo(printMap);
    } else if (layerType === 'lines') {
      const exportLineThickness = lineThickness * (1 + exportQuality / 2);
      visibleTracks.forEach((track) => {
        L.polyline(track.points as L.LatLngExpression[], {
          color: track.color || '#ff4500',
          weight: exportLineThickness,
          opacity: 0.8,
        }).addTo(printMap!);
      });
      hasVectorLayers = visibleTracks.length > 0;
    }

    // Wait for all rendering to complete before capturing
    await waitForRender({
      map: printMap,
      tileLayer,
      hasVectorLayers,
      onTileProgress,
      onLineProgress,
    });

    // After rendering, check what bounds we actually got
    const actualBounds = printMap.getBounds();
    console.log('Actual rendered bounds:', {
      north: actualBounds.getNorth(),
      south: actualBounds.getSouth(),
      east: actualBounds.getEast(),
      west: actualBounds.getWest(),
      center: actualBounds.getCenter(),
    });

    // Calculate where our target bounds appear in the container
    const targetNW = printMap.latLngToContainerPoint(bounds.getNorthWest());
    const targetSE = printMap.latLngToContainerPoint(bounds.getSouthEast());

    console.log('Target bounds in container pixels:', {
      nw: { x: targetNW.x, y: targetNW.y },
      se: { x: targetSE.x, y: targetSE.y },
      width: targetSE.x - targetNW.x,
      height: targetSE.y - targetNW.y,
    });

    // Capture the padded container
    const paddedCanvas = await html2canvas(printContainer, {
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: isTransparent ? null : '#000',
      scale: renderScale,
      width: paddedWidth,
      height: paddedHeight,
      windowWidth: paddedWidth,
      windowHeight: paddedHeight,
    });

    console.log('Captured canvas size:', { width: paddedCanvas.width, height: paddedCanvas.height });

    // Now crop to the exact target bounds
    // When renderScale > 1, all coordinates are scaled up proportionally
    const cropX = Math.round(targetNW.x * renderScale);
    const cropY = Math.round(targetNW.y * renderScale);
    const cropWidth = Math.round((targetSE.x - targetNW.x) * renderScale);
    const cropHeight = Math.round((targetSE.y - targetNW.y) * renderScale);

    console.log('Cropping to:', { x: cropX, y: cropY, width: cropWidth, height: cropHeight });

    // Create final canvas with exact target dimensions (scaled)
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetWidth * renderScale;
    finalCanvas.height = targetHeight * renderScale;
    const ctx = finalCanvas.getContext('2d');

    if (!ctx) {
      console.error('Failed to get canvas context');
      console.groupEnd();
      return null;
    }

    // Draw the cropped region
    ctx.drawImage(
      paddedCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight, // Source rectangle (scaled)
      0,
      0,
      targetWidth * renderScale,
      targetHeight * renderScale // Destination rectangle (scaled)
    );

    const renderDuration = ((performance.now() - renderStartTime) / 1000).toFixed(2);
    console.log('✅ Final canvas size:', { width: finalCanvas.width, height: finalCanvas.height, duration: `${renderDuration}s` });
    console.groupEnd();

    return finalCanvas;
  } finally {
    if (printMap) printMap.remove();
    document.body.removeChild(printContainer);
  }
};

/**
 * Stitches multiple canvas tiles together into a single canvas
 */
export const stitchCanvases = async (
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
  Object.assign(tempContainer.style, {
    position: 'absolute',
    left: '-9999px',
    top: '-9999px',
    width: '1px',
    height: '1px',
  });
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
};
