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
import { concatStreaming } from 'image-stitch/bundle';
import type { ProgressInfo } from '@/utils/progressTracker';
import { calculatePixelDimensions } from '@/utils/mapCalculations';

// Minimal interface for ImageDecoder to satisfy image-stitch requirements
// We define it here to avoid strict dependency on image-stitch types in the source if they aren't exported cleanly
interface ImageHeader {
    width: number;
    height: number;
    channels: number;
    bitDepth: number;
    format: 'unknown' | 'png' | 'jpeg';
}

interface ImageDecoder {
    getHeader(): Promise<ImageHeader>;
    scanlines(): AsyncGenerator<Uint8Array>;
    close(): Promise<void>;
}

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

/**
 * Custom decoder that lazily renders a map subdivision and yields scanlines row-by-row.
 * Implements the ImageDecoder interface required by image-stitch.
 */
class SubdivisionDecoder implements ImageDecoder {
    private bounds: LatLngBounds;
    private originalIndex: number;
    private visibleTracks: Track[];
    private config: ExportConfig;
    private type: 'combined' | 'base' | 'lines' | 'labels';
    private callbacks: ExportCallbacks;

    // Internal state
    private canvases: HTMLCanvasElement[] = [];
    private width: number = 0;
    private height: number = 0;

    constructor(
        bounds: LatLngBounds,
        originalIndex: number, // Index in the original subdivision array (for progress reporting)
        visibleTracks: Track[],
        config: ExportConfig,
        type: 'combined' | 'base' | 'lines' | 'labels',
        callbacks: ExportCallbacks
    ) {
        this.bounds = bounds;
        this.originalIndex = originalIndex;
        this.visibleTracks = visibleTracks;
        this.config = config;
        this.type = type;
        this.callbacks = callbacks;
    }

    /**
     * Returns header info based on calculated bounds (fast, no rendering).
     */
    async getHeader(): Promise<ImageHeader> {
        const { width, height } = calculatePixelDimensions(
            this.bounds,
            this.config.derivedExportZoom
        );
        this.width = width;
        this.height = height;

        return {
            width,
            height,
            channels: 4, // RGBA
            bitDepth: 8,
            format: 'unknown' // Custom source
        };
    }

    /**
     * Renders the subdivision and yields rows one by one.
     */
    async *scanlines(): AsyncGenerator<Uint8Array> {
        const { onSubdivisionProgress, onStageProgress } = this.callbacks;
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
        } = this.config;

        // Signal that we are starting this subdivision
        onSubdivisionProgress(this.originalIndex);

        // Filter visible tracks for this subdivision
        const filteredVisibleTracks = this.visibleTracks.filter((track) => {
            if (!track.isVisible) return false;
            if (!track.bounds) track.bounds = calculateTrackBounds(track.points);

            if (track.bounds) {
                const trackMinLat = track.bounds.minLat;
                const trackMaxLat = track.bounds.maxLat;
                const trackMinLng = track.bounds.minLng;
                const trackMaxLng = track.bounds.maxLng;

                const subMinLat = this.bounds.getSouth();
                const subMaxLat = this.bounds.getNorth();
                const subMinLng = this.bounds.getWest();
                const subMaxLng = this.bounds.getEast();

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

        // --- Render Phase ---
        // Depending on type, render one or more canvases.
        // We use the existing renderCanvasForBounds logic.

        if (this.type === 'combined') {
            const { base = true, lines = true, labels = true } = includedLayers || {};

            // 1. Base
            if (base) {
                this.reportProgress('base', 0, 100, 'base 1/3');
                const baseCanvas = await renderCanvasForBounds({
                    bounds: this.bounds,
                    layerType: 'base',
                    zoomForRender: derivedExportZoom,
                    tileLayerKey,
                    onTileProgress: (loaded, total) => this.reportProgress('base', loaded, total, 'base 1/3')
                });
                if (!baseCanvas) throw new Error('Failed to render base layer');
                this.canvases.push(baseCanvas);
            }

            // 2. Lines
            if (lines) {
                this.reportProgress('lines', 0, 100, 'lines 2/3');
                const linesCanvas = filteredVisibleTracks.length > 0 ? await renderCanvasForBounds({
                    bounds: this.bounds,
                    layerType: 'lines',
                    zoomForRender: derivedExportZoom,
                    visibleTracks: filteredVisibleTracks,
                    lineThickness,
                    exportQuality,
                    onLineProgress: (checks, max) => this.reportProgress('lines', checks, max, 'lines 2/3')
                }) : null;
                if (linesCanvas) this.canvases.push(linesCanvas);
            }

            // 3. Labels
            if (labels && tileLayerKey === 'esriImagery' && labelDensity >= 0) {
                 this.reportProgress('tiles', 0, 100, 'labels 3/3');
                 const labelZoom = (previewZoom || zoom) + labelDensity;
                 let labelsCanvas = await renderCanvasForBounds({
                    bounds: this.bounds,
                    layerType: 'labels-only',
                    zoomForRender: labelZoom,
                    renderScale: 2,
                    onTileProgress: (loaded, total) => this.reportProgress('tiles', loaded, total, 'labels 3/3')
                 });

                 // Resize if needed
                 if (labelsCanvas && this.canvases.length > 0) {
                     const targetW = this.canvases[0].width;
                     const targetH = this.canvases[0].height;
                     if (labelsCanvas.width !== targetW || labelsCanvas.height !== targetH) {
                         labelsCanvas = resizeCanvas(labelsCanvas, targetW, targetH);
                     }
                 }
                 if (labelsCanvas) this.canvases.push(labelsCanvas);
            }
        } else {
            // Single layer type
            let layerType: 'base' | 'lines' | 'labels-only';
            let renderZoom = derivedExportZoom;

            if (this.type === 'base') layerType = 'base';
            else if (this.type === 'lines') layerType = 'lines';
            else {
                layerType = 'labels-only';
                renderZoom = (previewZoom || zoom) + labelDensity;
            }

            const stageLabel = this.type; // 'base', 'lines', etc.

            this.reportProgress(layerType === 'lines' ? 'lines' : layerType === 'base' ? 'base' : 'tiles', 0, 100, stageLabel);

            const canvas = await renderCanvasForBounds({
                bounds: this.bounds,
                layerType,
                zoomForRender: renderZoom,
                visibleTracks: filteredVisibleTracks,
                tileLayerKey,
                lineThickness,
                exportQuality,
                onTileProgress: (loaded, total) =>
                     this.reportProgress(layerType === 'base' ? 'base' : 'tiles', loaded, total, stageLabel),
                onLineProgress: (checks, max) =>
                     this.reportProgress('lines', checks, max, stageLabel)
            });
            if (!canvas) throw new Error(`Failed to render ${layerType} layer`);
            this.canvases.push(canvas);
        }

        // Validate we have something
        if (this.canvases.length === 0) {
            // If no layers (e.g. lines only but no tracks), yield transparent or white
            // We'll handle this in the loop below by checking length
        } else {
            // Ensure width/height matches actual canvas if calculation was slightly off due to rounding
            this.width = this.canvases[0].width;
            this.height = this.canvases[0].height;
        }

        // --- Streaming Phase ---
        // Yield rows by blending layers
        const contexts = this.canvases.map(c => c.getContext('2d')!);
        const rowBuffer = new Uint8Array(this.width * 4); // Reusable buffer? No, generator should yield new buffers or safe copies

        // Background color logic for JPEG (if base layer missing)
        const fillBackground = outputFormat === 'jpeg' &&
                              (this.type === 'combined' && !includedLayers?.base);

        for (let y = 0; y < this.height; y++) {
            // Report scanline progress every few rows to avoid flooding the event loop
            if (y % 10 === 0 || y === this.height - 1) {
                if (onStageProgress) {
                    onStageProgress(this.originalIndex, {
                        stage: 'scanline',
                        current: y,
                        total: this.height,
                        percentage: Math.round((y / this.height) * 100),
                        stageLabel: 'Processing'
                    });
                }
                // Allow UI to breathe
                await new Promise(r => setTimeout(r, 0));
            }

            // Create a row buffer
            // We could optimize by using a single 1-row canvas to blend, but getting ImageData from 3 canvases is also fast.
            // Let's do manual blending or use a helper canvas.
            // Helper canvas is easier for blending modes/opacity.

            if (this.canvases.length === 0) {
                 // Yield empty/white row
                 const emptyRow = new Uint8Array(this.width * 4);
                 if (fillBackground) emptyRow.fill(255); // White
                 yield emptyRow;
                 continue;
            }

            // Optimization: If only 1 canvas, just yield its row
            if (this.canvases.length === 1 && !fillBackground) {
                const data = contexts[0].getImageData(0, y, this.width, 1).data;
                yield new Uint8Array(data.buffer);
                continue;
            }

            // Compositing multiple layers for this row
            // We use a temporary 1-pixel high canvas to let the browser handle blending
            const rowCanvas = getRowCanvas(this.width);
            const rowCtx = rowCanvas.getContext('2d')!;

            // Clear
            rowCtx.clearRect(0, 0, this.width, 1);

            // Fill background if needed
            if (fillBackground) {
                rowCtx.fillStyle = '#ffffff';
                rowCtx.fillRect(0, 0, this.width, 1);
            }

            // Draw each layer's row
            for (const sourceCanvas of this.canvases) {
                const isNapiTarget = rowCanvas.constructor.name === 'CanvasElement';
                const isNapiSource = sourceCanvas.constructor.name === 'CanvasElement';

                if (isNapiTarget && !isNapiSource) {
                    // Convert JSDOM source canvas to @napi-rs via ImageData
                    const sourceCtx = sourceCanvas.getContext('2d');
                    if (sourceCtx) {
                        const imageData = sourceCtx.getImageData(0, y, this.width, 1);

                        // We need to create a temporary Napi canvas for this row slice because putImageData
                        // puts data directly, but we want to composite (drawImage) over existing content (e.g. background)
                        const tempNapiCanvas = createCompatibleCanvas(this.width, 1);
                        const tempCtx = tempNapiCanvas.getContext('2d');
                        if (tempCtx) {
                             tempCtx.putImageData(imageData, 0, 0);
                             rowCtx.drawImage(tempNapiCanvas as any, 0, 0);
                        }
                    }
                } else {
                    rowCtx.drawImage(
                        sourceCanvas,
                        0, y, this.width, 1, // source rect
                        0, 0, this.width, 1  // dest rect
                    );
                }
            }

            const data = rowCtx.getImageData(0, 0, this.width, 1).data;
            yield new Uint8Array(data.buffer);
        }

        // Cleanup immediately after streaming
        this.freeMemory();
    }

    async close(): Promise<void> {
        this.freeMemory();
    }

    private freeMemory() {
        this.canvases.forEach(c => {
            c.width = 0;
            c.height = 0;
        });
        this.canvases = [];
    }

    private reportProgress(stage: any, current: number, total: number, label: string) {
        if (this.callbacks.onStageProgress) {
            this.callbacks.onStageProgress(this.originalIndex, {
                stage,
                current,
                total,
                percentage: total > 0 ? Math.round((current / total) * 100) : 0,
                stageLabel: label
            });
        }
    }
}

// Global reusable row canvas to avoid allocation churn
let _rowCanvas: HTMLCanvasElement | null = null;
function getRowCanvas(width: number): HTMLCanvasElement {
    // In node/test environment, use createCompatibleCanvas to ensure @napi-rs support
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
         return createCompatibleCanvas(width, 1);
    }

    if (!_rowCanvas) {
        _rowCanvas = document.createElement('canvas');
        _rowCanvas.height = 1;
    }
    if (_rowCanvas.width < width) {
        _rowCanvas.width = width;
    }
    return _rowCanvas;
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

    // Create decoders for each subdivision
    // We map the ordered subdivisions to SubdivisionDecoder instances
    const decoders = gridLayout.orderedSubdivisions.map((bounds) => {
        // Find original index for progress reporting
        const originalIndex = subdivisions.indexOf(bounds);
        return new SubdivisionDecoder(
            bounds,
            originalIndex !== -1 ? originalIndex : 0,
            visibleTracks,
            config,
            type,
            callbacks
        );
    });

    console.log('🧵 Starting streaming export...');

    // Start streaming stitch using the array of decoders
    const stitchedStream = concatStreaming({
        inputs: decoders, // image-stitch accepts array of ImageDecoder
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
