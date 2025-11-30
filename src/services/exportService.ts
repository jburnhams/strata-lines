import type { LatLngBounds } from 'leaflet';
import type { Track } from '@/types';
import {
  renderCanvasForBounds,
  resizeCanvas,
  calculateSubdivisions,
  calculateGridLayout,
  createCompatibleCanvas,
  type RenderOptions,
} from '@/utils/exportHelpers';
import { calculateTrackBounds } from '@/services/gpxProcessor';
import { concatStreaming } from 'image-stitch';
import type { ProgressInfo } from '@/utils/progressTracker';
import { calculatePixelDimensions } from '@/utils/mapCalculations';

export interface ExportConfig {
  exportBounds: LatLngBounds;
  derivedExportZoom: number;
  previewZoom: number;
  zoom: number;
  maxDimension: number;
  labelDensity: number;
  tileLayerKey: string;
  lineThickness: number;
  exportQuality: number;
  outputFormat: 'png' | 'jpeg';
  jpegQuality: number;
  includedLayers?: {
    base: boolean;
    lines: boolean;
    labels: boolean;
  };
}

export interface ExportCallbacks {
  onSubdivisionsCalculated: (subdivisions: LatLngBounds[]) => void;
  onSubdivisionProgress: (index: number) => void;
  onSubdivisionStitched?: (completed: number, total: number) => void;
  onStageProgress?: (subdivisionIndex: number, progress: ProgressInfo) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

// Definition matching image-stitch 1.1.53 ImageSource interface
export type ImageFactory = () => Promise<Blob | ArrayBuffer | Uint8Array>;

export interface ImageSource {
    width: number;
    height: number;
    factory: ImageFactory;
}

/**
 * Creates an ImageSource factory for a specific subdivision.
 * This factory lazily renders the subdivision when called by image-stitch.
 */
const createSubdivisionFactory = (
    bounds: LatLngBounds,
    originalIndex: number,
    visibleTracks: Track[],
    config: ExportConfig,
    type: 'combined' | 'base' | 'lines' | 'labels',
    callbacks: ExportCallbacks
): ImageSource => {
    const {
        derivedExportZoom,
        previewZoom,
        zoom,
        labelDensity,
        tileLayerKey,
        lineThickness,
        exportQuality,
        includedLayers,
        outputFormat
    } = config;

    // Calculate dimensions upfront
    const { width, height } = calculatePixelDimensions(
        bounds,
        derivedExportZoom
    );

    const factory: ImageFactory = async () => {
        const { onSubdivisionProgress, onStageProgress } = callbacks;

        // Signal that we are starting this subdivision
        onSubdivisionProgress(originalIndex);

        const reportProgress = (stage: 'base' | 'tiles' | 'lines' | 'stitching' | 'scanline', current: number, total: number, label: string) => {
            if (onStageProgress) {
                onStageProgress(originalIndex, {
                    stage,
                    current,
                    total,
                    percentage: total > 0 ? Math.round((current / total) * 100) : 0,
                    stageLabel: label
                });
            }
        };

        // Filter visible tracks for this subdivision
        const filteredVisibleTracks = visibleTracks.filter((track) => {
            if (!track.isVisible) return false;
            if (!track.bounds) track.bounds = calculateTrackBounds(track.points);

            if (track.bounds) {
                const trackMinLat = track.bounds.minLat;
                const trackMaxLat = track.bounds.maxLat;
                const trackMinLng = track.bounds.minLng;
                const trackMaxLng = track.bounds.maxLng;

                const subMinLat = bounds.getSouth();
                const subMaxLat = bounds.getNorth();
                const subMinLng = bounds.getWest();
                const subMaxLng = bounds.getEast();

                if (
                  trackMaxLat < subMinLat ||
                  trackMinLat > subMaxLat ||
                  trackMaxLng < subMinLng ||
                  trackMinLng > subMaxLng
                ) {
                  return false;
                }
            }
            return true;
        });

        const canvases: HTMLCanvasElement[] = [];

        // --- Render Phase ---
        if (type === 'combined') {
            const { base = true, lines = true, labels = true } = includedLayers || {};

            // 1. Base
            if (base) {
                reportProgress('base', 0, 100, 'base 1/3');
                const baseCanvas = await renderCanvasForBounds({
                    bounds: bounds,
                    layerType: 'base',
                    zoomForRender: derivedExportZoom,
                    tileLayerKey,
                    onTileProgress: (loaded, total) => reportProgress('base', loaded, total, 'base 1/3')
                });
                if (baseCanvas) canvases.push(baseCanvas);
            }

            // 2. Lines
            if (lines) {
                reportProgress('lines', 0, 100, 'lines 2/3');
                const linesCanvas = filteredVisibleTracks.length > 0 ? await renderCanvasForBounds({
                    bounds: bounds,
                    layerType: 'lines',
                    zoomForRender: derivedExportZoom,
                    visibleTracks: filteredVisibleTracks,
                    lineThickness,
                    exportQuality,
                    onLineProgress: (checks, max) => reportProgress('lines', checks, max, 'lines 2/3')
                }) : null;
                if (linesCanvas) canvases.push(linesCanvas);
            }

            // 3. Labels
            if (labels && tileLayerKey === 'esriImagery' && labelDensity >= 0) {
                 reportProgress('tiles', 0, 100, 'labels 3/3');
                 const labelZoom = (previewZoom || zoom) + labelDensity;
                 let labelsCanvas = await renderCanvasForBounds({
                    bounds: bounds,
                    layerType: 'labels-only',
                    zoomForRender: labelZoom,
                    renderScale: 2,
                    onTileProgress: (loaded, total) => reportProgress('tiles', loaded, total, 'labels 3/3')
                 });

                 // Resize if needed
                 if (labelsCanvas && canvases.length > 0) {
                     const targetW = canvases[0].width;
                     const targetH = canvases[0].height;
                     if (labelsCanvas.width !== targetW || labelsCanvas.height !== targetH) {
                         labelsCanvas = resizeCanvas(labelsCanvas, targetW, targetH);
                     }
                 }
                 if (labelsCanvas) canvases.push(labelsCanvas);
            }
        } else {
            // Single layer type
            let layerType: 'base' | 'lines' | 'labels-only';
            let renderZoom = derivedExportZoom;

            if (type === 'base') layerType = 'base';
            else if (type === 'lines') layerType = 'lines';
            else {
                layerType = 'labels-only';
                renderZoom = (previewZoom || zoom) + labelDensity;
            }

            const stageLabel = type;

            reportProgress(layerType === 'lines' ? 'lines' : layerType === 'base' ? 'base' : 'tiles', 0, 100, stageLabel);

            const canvas = await renderCanvasForBounds({
                bounds: bounds,
                layerType,
                zoomForRender: renderZoom,
                visibleTracks: filteredVisibleTracks,
                tileLayerKey,
                lineThickness,
                exportQuality,
                onTileProgress: (loaded, total) =>
                     reportProgress(layerType === 'base' ? 'base' : 'tiles', loaded, total, stageLabel),
                onLineProgress: (checks, max) =>
                     reportProgress('lines', checks, max, stageLabel)
            });
            if (canvas) canvases.push(canvas);
        }

        // --- Composition Phase ---
        // If we have no canvases (e.g., lines only but no tracks), return transparent or white
        if (canvases.length === 0) {
            const emptyCanvas = createCompatibleCanvas(width, height);
            const ctx = emptyCanvas.getContext('2d');
            if (ctx) {
                // Background color logic for JPEG (if base layer missing)
                const fillBackground = outputFormat === 'jpeg' &&
                                      (type === 'combined' && !includedLayers?.base);
                if (fillBackground) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                } else {
                    ctx.clearRect(0, 0, width, height);
                }
            }
            return await canvasToBlobOrBuffer(emptyCanvas, outputFormat, config.jpegQuality);
        }

        // If single canvas and no background fill needed, return directly
        const fillBackground = outputFormat === 'jpeg' &&
                              (type === 'combined' && !includedLayers?.base);

        if (canvases.length === 1 && !fillBackground) {
            return await canvasToBlobOrBuffer(canvases[0], outputFormat, config.jpegQuality);
        }

        // Composite multiple canvases
        const finalCanvas = createCompatibleCanvas(width, height);
        const ctx = finalCanvas.getContext('2d')!;

        // Fill background if needed
        if (fillBackground) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
        }

        for (const sourceCanvas of canvases) {
            // Handle Napi vs DOM canvas compatibility (for Node environment integration tests)
            const isNapiTarget = finalCanvas.constructor.name === 'CanvasElement';
            const isNapiSource = sourceCanvas.constructor.name === 'CanvasElement';

            if (isNapiTarget && !isNapiSource) {
                 // Convert JSDOM source canvas to @napi-rs via ImageData
                 const sourceCtx = sourceCanvas.getContext('2d');
                 if (sourceCtx) {
                     const imageData = sourceCtx.getImageData(0, 0, width, height);
                     // Create a temp napi canvas for this layer
                     const tempNapiCanvas = createCompatibleCanvas(width, height);
                     const tempCtx = tempNapiCanvas.getContext('2d');
                     if (tempCtx) {
                          tempCtx.putImageData(imageData, 0, 0);
                          ctx.drawImage(tempNapiCanvas as any, 0, 0);
                     }
                 }
            } else {
                ctx.drawImage(sourceCanvas, 0, 0, width, height);
            }
        }

        return await canvasToBlobOrBuffer(finalCanvas, outputFormat, config.jpegQuality);
    };

    return {
        width,
        height,
        factory
    };
};

/**
 * Helper to convert canvas to Blob (Browser) or Buffer (Node)
 */
async function canvasToBlobOrBuffer(
    canvas: HTMLCanvasElement,
    format: 'png' | 'jpeg',
    quality: number
): Promise<Blob | Uint8Array> {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

    // Node environment (@napi-rs/canvas)
    if (typeof (canvas as any).toBuffer === 'function') {
        const typeStr = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const buffer = (canvas as any).toBuffer(typeStr, quality);
        // Return as Uint8Array to ensure compatibility with image-stitch input detection
        return new Uint8Array(buffer);
    }

    // Browser environment
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob conversion failed'));
        }, mimeType, format === 'jpeg' ? quality / 100 : undefined);
    });
}

/**
 * Performs a PNG export for a specific layer type
 */
export const performPngExport = async (
  type: 'combined' | 'base' | 'lines' | 'labels',
  visibleTracks: Track[],
  config: ExportConfig,
  callbacks: ExportCallbacks
): Promise<void> => {
  const {
    exportBounds,
    derivedExportZoom,
    maxDimension,
    outputFormat,
    jpegQuality,
  } = config;

  const {
    onSubdivisionsCalculated,
    onSubdivisionStitched,
    onComplete,
    onError,
  } = callbacks;

  try {
    const exportStartTime = performance.now();

    // Calculate subdivisions based on maxDimension
    const subdivisions = calculateSubdivisions(exportBounds, derivedExportZoom, maxDimension);
    console.log(
      `📐 Calculated ${subdivisions.length} subdivision(s) based on max dimension ${maxDimension}px`
    );

    // Show subdivisions on the map
    onSubdivisionsCalculated(subdivisions);

    // Calculate grid layout
    const gridLayout = calculateGridLayout(subdivisions);
    console.log(
      `📐 Grid layout: ${gridLayout.rows} rows × ${gridLayout.columns} columns`
    );

    // Create factories for each subdivision
    // We map the ordered subdivisions to ImageSource objects
    const factories: ImageSource[] = gridLayout.orderedSubdivisions.map((bounds) => {
        // Find original index for progress reporting
        const originalIndex = subdivisions.indexOf(bounds);
        return createSubdivisionFactory(
            bounds,
            originalIndex !== -1 ? originalIndex : 0,
            visibleTracks,
            config,
            type,
            callbacks
        );
    });

    console.log('🧵 Starting streaming export with factories...');

    // Start streaming stitch using the array of factories
    const stitchedStream = concatStreaming({
        inputs: factories,
        layout: {
          rows: gridLayout.rows,
          columns: gridLayout.columns,
        },
        outputFormat,
        jpegQuality: outputFormat === 'jpeg' ? jpegQuality : undefined,
        onProgress: onSubdivisionStitched
          ? (completed, total) => {
              console.log(`🧵 Stitched subdivisions: ${completed}/${total}`);
              onSubdivisionStitched(completed, total);
            }
          : undefined,
    });

    // Collect the stitched chunks
    const chunks: Uint8Array[] = [];
    for await (const chunk of stitchedStream) {
      chunks.push(chunk);
    }

    const totalExportDuration = ((performance.now() - exportStartTime) / 1000).toFixed(2);
    // Calculate total size
    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    console.log('✅ Export complete, size:', totalSize, 'bytes,', `duration: ${totalExportDuration}s`);

    const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const finalBlob = new Blob(chunks as BlobPart[], { type: mimeType });

    // Download the final image
    const link = document.createElement('a');
    const extension = outputFormat === 'jpeg' ? 'jpg' : 'png';
    link.download = `gpx-map-${type}-${Date.now()}.${extension}`;
    link.href = URL.createObjectURL(finalBlob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    onComplete();
  } catch (err) {
    console.error('Export failed:', err);
    onError(err instanceof Error ? err : new Error(String(err)));
  }
};
