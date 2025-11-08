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
export const waitForTiles = (tileLayer: L.TileLayer): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Map export timed out waiting for tiles.')),
      60000
    );

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
}

/**
 * Renders a specific geographic area to a canvas for a particular layer type
 */
export const renderCanvasForBounds = async (
  options: RenderOptions
): Promise<HTMLCanvasElement | null> => {
  const {
    bounds,
    layerType,
    zoomForRender,
    visibleTracks = [],
    tileLayerKey = 'esriImagery',
    lineThickness = 3,
    exportQuality = 2,
  } = options;

  const isTransparent = layerType === 'lines' || layerType === 'labels-only';

  console.group(`🎨 Rendering ${layerType} at zoom ${zoomForRender}`);
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

    // Add layers
    if (layerType === 'base') {
      const selectedTileLayer =
        TILE_LAYERS.find((l) => l.key === tileLayerKey) || TILE_LAYERS[0];
      const tileLayer = L.tileLayer(selectedTileLayer.layers[0].url, { attribution: '' });
      tileLayer.addTo(printMap);
      await waitForTiles(tileLayer);
    } else if (layerType === 'labels-only') {
      const labelLayer = L.tileLayer(LABEL_TILE_URL_RETINA, { attribution: '' });
      labelLayer.addTo(printMap);
      await waitForTiles(labelLayer);
    } else if (layerType === 'lines') {
      const exportLineThickness = lineThickness * (1 + exportQuality / 2);
      visibleTracks.forEach((track) => {
        L.polyline(track.points as L.LatLngExpression[], {
          color: track.color || '#ff4500',
          weight: exportLineThickness,
          opacity: 0.8,
        }).addTo(printMap!);
      });
      await new Promise((res) => setTimeout(res, 500));
    }

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
      cropX,
      cropY,
      cropWidth,
      cropHeight, // Source rectangle
      0,
      0,
      targetWidth,
      targetHeight // Destination rectangle
    );

    console.log('✅ Final canvas size:', { width: finalCanvas.width, height: finalCanvas.height });
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
