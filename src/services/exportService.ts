import type { LatLngBounds } from 'leaflet';
import type { Track } from '@/types';
import {
  renderCanvasForBounds,
  resizeCanvas,
  calculateSubdivisions,
  calculateGridLayout,
  type RenderOptions,
} from '@/utils/exportHelpers';
import { calculateTrackBounds } from '@/services/gpxProcessor';
import { concatStreaming } from 'image-stitch/bundle';
import type { ProgressInfo } from '@/utils/progressTracker';

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

// Generator to yield subdivision canvases one by one
// This allows streaming input to image-stitch without holding all canvases in memory
async function* renderSubdivisionsGenerator(
  orderedSubdivisions: LatLngBounds[],
  originalSubdivisions: LatLngBounds[],
  visibleTracks: Track[],
  config: ExportConfig,
  type: 'combined' | 'base' | 'lines' | 'labels',
  callbacks: ExportCallbacks
): AsyncGenerator<Blob> {
  const {
    derivedExportZoom,
    previewZoom,
    zoom,
    labelDensity,
    tileLayerKey,
    lineThickness,
    exportQuality,
    outputFormat,
    jpegQuality,
  } = config;

  const { onSubdivisionProgress, onStageProgress } = callbacks;

  for (let i = 0; i < orderedSubdivisions.length; i++) {
    const subdivisionStartTime = performance.now();
    const subdivisionBounds = orderedSubdivisions[i];

    // Find original index to report progress correctly
    // Since objects are references, we can find the exact object in the original array
    const originalIndex = originalSubdivisions.indexOf(subdivisionBounds);
    const progressIndex = originalIndex !== -1 ? originalIndex : i;

    // Highlight the current subdivision being rendered
    onSubdivisionProgress(progressIndex);
    console.log(`🎨 Exporting subdivision ${i + 1}/${orderedSubdivisions.length} (original index: ${progressIndex})`);

    // Filter visible tracks based on subdivision bounds
    const filteredVisibleTracks = visibleTracks.filter((track) => {
      if (!track.isVisible) return false;

      // Populate bounds if missing (legacy support)
      if (!track.bounds) {
        track.bounds = calculateTrackBounds(track.points);
      }

      // Check if track intersects with subdivision bounds
      if (track.bounds) {
        const trackMinLat = track.bounds.minLat;
        const trackMaxLat = track.bounds.maxLat;
        const trackMinLng = track.bounds.minLng;
        const trackMaxLng = track.bounds.maxLng;

        const subMinLat = subdivisionBounds.getSouth();
        const subMaxLat = subdivisionBounds.getNorth();
        const subMinLng = subdivisionBounds.getWest();
        const subMaxLng = subdivisionBounds.getEast();

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

    console.log(
      `🔍 Filtered tracks for subdivision ${i + 1}: ${filteredVisibleTracks.length}/${visibleTracks.length} tracks`
    );

    let finalCanvas: HTMLCanvasElement;

    // Render the subdivision based on type
    if (type === 'combined') {
      console.log('🎯 Rendering combined export...');

      const { base = true, lines = true, labels = true } = config.includedLayers || {};

      // Base layer (1/3)
      let baseCanvas: HTMLCanvasElement | null = null;
      if (base) {
        if (onStageProgress) {
          onStageProgress(progressIndex, {
            stage: 'base',
            current: 0,
            total: 0,
            percentage: 0,
            stageLabel: 'base 1/3',
          });
        }

        const baseOptions: RenderOptions = {
          bounds: subdivisionBounds,
          layerType: 'base',
          zoomForRender: derivedExportZoom,
          tileLayerKey,
          onTileProgress: onStageProgress
            ? (loaded, total) => {
                onStageProgress(progressIndex, {
                  stage: 'base',
                  current: loaded,
                  total,
                  percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
                  stageLabel: 'base 1/3',
                });
              }
            : undefined,
        };
        baseCanvas = await renderCanvasForBounds(baseOptions);
        if (!baseCanvas) throw new Error('Failed to render base layer');
      }

      // Lines layer (2/3)
      let linesCanvas: HTMLCanvasElement | null = null;
      if (lines) {
        if (onStageProgress && filteredVisibleTracks.length > 0) {
          onStageProgress(progressIndex, {
            stage: 'lines',
            current: 0,
            total: 0,
            percentage: 0,
            stageLabel: 'lines 2/3',
          });
        }

        const linesOptions: RenderOptions = {
          bounds: subdivisionBounds,
          layerType: 'lines',
          zoomForRender: derivedExportZoom,
          visibleTracks: filteredVisibleTracks,
          lineThickness,
          exportQuality,
          onLineProgress: onStageProgress
            ? (checksCompleted, maxChecks) => {
                onStageProgress(progressIndex, {
                  stage: 'lines',
                  current: checksCompleted,
                  total: maxChecks,
                  percentage: Math.round((checksCompleted / maxChecks) * 100),
                  stageLabel: 'lines 2/3',
                });
              }
            : undefined,
        };
        linesCanvas =
          filteredVisibleTracks.length > 0 ? await renderCanvasForBounds(linesOptions) : null;
      }

      // Labels are rendered at a different zoom level (3/3)
      let labelsCanvas: HTMLCanvasElement | null = null;
      if (labels) {
        if (onStageProgress && tileLayerKey === 'esriImagery' && labelDensity >= 0) {
          onStageProgress(progressIndex, {
            stage: 'tiles',
            current: 0,
            total: 0,
            percentage: 0,
            stageLabel: 'labels 3/3',
          });
        }

        const labelZoom = (previewZoom || zoom) + labelDensity;
        const labelsOptions: RenderOptions = {
          bounds: subdivisionBounds,
          layerType: 'labels-only',
          zoomForRender: labelZoom,
          renderScale: 2, // Render at 2x scale to benefit from retina @2x tiles
          onTileProgress: onStageProgress
            ? (loaded, total) => {
                onStageProgress(progressIndex, {
                  stage: 'tiles',
                  current: loaded,
                  total,
                  percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
                  stageLabel: 'labels 3/3',
                });
              }
            : undefined,
        };
        labelsCanvas =
          tileLayerKey === 'esriImagery' && labelDensity >= 0
            ? await renderCanvasForBounds(labelsOptions)
            : null;
      }

      // Resize labels if needed
      if (labelsCanvas && baseCanvas) {
        if (
          labelsCanvas.width !== baseCanvas.width ||
          labelsCanvas.height !== baseCanvas.height
        ) {
          const resizedLabels = resizeCanvas(labelsCanvas, baseCanvas.width, baseCanvas.height);
          labelsCanvas.width = 0;
          labelsCanvas.height = 0;
          labelsCanvas = resizedLabels;
        }
      }

      // Determine canvas dimensions
      const width = baseCanvas?.width || linesCanvas?.width || labelsCanvas?.width;
      const height = baseCanvas?.height || linesCanvas?.height || labelsCanvas?.height;

      if (!width || !height) {
        throw new Error('No layers were rendered');
      }

      // Stack layers
      const createCanvas = (width: number, height: number): HTMLCanvasElement => {
        if (typeof require !== 'undefined') {
          try {
            const testCanvas = document.createElement('canvas');
            const testCtx = testCanvas.getContext('2d');
            const hasRealCanvas = testCtx && typeof testCtx.getImageData === 'function';

            if (hasRealCanvas) {
              const { createCanvas: napiCreateCanvas } = require('@napi-rs/canvas');
              return napiCreateCanvas(width, height) as unknown as HTMLCanvasElement;
            }
          } catch {
            // ignore
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
      };

      finalCanvas = createCanvas(width, height);
      const ctx = finalCanvas.getContext('2d')!;

      // Background
      if (outputFormat === 'jpeg' && !base) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      }

      const drawLayer = (sourceCanvas: HTMLCanvasElement) => {
        const isNapiTarget = finalCanvas.constructor.name === 'CanvasElement';
        const isNapiSource = sourceCanvas.constructor.name === 'CanvasElement';

        if (isNapiTarget && !isNapiSource) {
          try {
            const sourceCtx = sourceCanvas.getContext('2d');
            if (sourceCtx && typeof sourceCtx.getImageData === 'function') {
              const imageData = sourceCtx.getImageData(
                0,
                0,
                sourceCanvas.width,
                sourceCanvas.height
              );
              const { createCanvas: napiCreateCanvas } = require('@napi-rs/canvas');
              const tempCanvas = napiCreateCanvas(sourceCanvas.width, sourceCanvas.height);
              const tempCtx = tempCanvas.getContext('2d');
              if (tempCtx) {
                tempCtx.putImageData(imageData, 0, 0);
                ctx.drawImage(tempCanvas as any, 0, 0);
                return;
              }
            }
          } catch {
            // ignore
          }
        }
        ctx.drawImage(sourceCanvas, 0, 0);
      };

      if (baseCanvas) drawLayer(baseCanvas);
      if (linesCanvas) drawLayer(linesCanvas);
      if (labelsCanvas) drawLayer(labelsCanvas);

      // Free layer memory
      if (baseCanvas) {
        baseCanvas.width = 0;
        baseCanvas.height = 0;
      }
      if (linesCanvas) {
        linesCanvas.width = 0;
        linesCanvas.height = 0;
      }
      if (labelsCanvas) {
        labelsCanvas.width = 0;
        labelsCanvas.height = 0;
      }
    } else {
      // Single layer rendering
      let layerType: 'base' | 'lines' | 'labels-only';
      let zoomForRender = derivedExportZoom;
      if (type === 'base') layerType = 'base';
      else if (type === 'lines') layerType = 'lines';
      else {
        layerType = 'labels-only';
        zoomForRender = (previewZoom || zoom) + labelDensity;
      }

      if (onStageProgress) {
        onStageProgress(progressIndex, {
          stage: layerType === 'lines' ? 'lines' : layerType === 'base' ? 'base' : 'tiles',
          current: 0,
          total: 0,
          percentage: 0,
          stageLabel: type,
        });
      }

      const options: RenderOptions = {
        bounds: subdivisionBounds,
        layerType,
        zoomForRender,
        visibleTracks: filteredVisibleTracks,
        tileLayerKey,
        lineThickness,
        exportQuality,
        onTileProgress:
          onStageProgress && (layerType === 'base' || layerType === 'labels-only')
            ? (loaded, total) => {
                onStageProgress(progressIndex, {
                  stage: layerType === 'base' ? 'base' : 'tiles',
                  current: loaded,
                  total,
                  percentage: total > 0 ? Math.round((loaded / total) * 100) : 0,
                  stageLabel: type,
                });
              }
            : undefined,
        onLineProgress:
          onStageProgress && layerType === 'lines'
            ? (checksCompleted, maxChecks) => {
                onStageProgress(progressIndex, {
                  stage: 'lines',
                  current: checksCompleted,
                  total: maxChecks,
                  percentage: Math.round((checksCompleted / maxChecks) * 100),
                  stageLabel: type,
                });
              }
            : undefined,
      };
      const canvas = await renderCanvasForBounds(options);
      if (!canvas) throw new Error(`Failed to render ${layerType} layer`);
      finalCanvas = canvas;
    }

    const subdivisionDuration = ((performance.now() - subdivisionStartTime) / 1000).toFixed(2);
    console.log(
      `✅ Subdivision render complete (${i + 1}/${orderedSubdivisions.length}), canvas size:`,
      {
        width: finalCanvas.width,
        height: finalCanvas.height,
        duration: `${subdivisionDuration}s`,
      }
    );

    // Convert to Blob
    const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = outputFormat === 'jpeg' ? jpegQuality / 100 : undefined; // quality is 0-1
    const blob = await new Promise<Blob | null>((resolve) =>
      finalCanvas.toBlob(resolve, mimeType, quality)
    );

    if (!blob) throw new Error('Failed to convert canvas to blob');

    // Free final canvas memory
    finalCanvas.width = 0;
    finalCanvas.height = 0;

    yield blob;
  }
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

    let finalBlob: Blob;

    // Use streaming if we have multiple subdivisions to save memory
    if (subdivisions.length > 1) {
      const stitchStartTime = performance.now();
      console.log('🧵 Stitching subdivisions together...');

      // Calculate grid layout
      const gridLayout = calculateGridLayout(subdivisions);
      console.log(
        `📐 Grid layout: ${gridLayout.rows} rows × ${gridLayout.columns} columns`
      );

      // Create generator that renders and yields subdivisions one by one
      // image-stitch will consume this generator to stream the process
      const inputsGenerator = renderSubdivisionsGenerator(
        gridLayout.orderedSubdivisions,
        subdivisions, // Pass original subdivisions to correct index progress
        visibleTracks,
        config,
        type,
        callbacks
      );

      // Start streaming stitch
      const stitchedStream = concatStreaming({
        inputs: inputsGenerator,
        layout: {
          rows: gridLayout.rows,
          columns: gridLayout.columns,
        },
        outputFormat,
        jpegQuality: outputFormat === 'jpeg' ? jpegQuality : undefined,
        onProgress: onSubdivisionStitched
          ? (completed, total) => {
              console.log(`🧵 Stitching progress: ${completed}/${total}`);
              onSubdivisionStitched(completed, total);
            }
          : undefined,
      });

      // Collect the stitched chunks
      const chunks: Uint8Array[] = [];
      for await (const chunk of stitchedStream) {
        chunks.push(chunk);
      }

      const stitchDuration = ((performance.now() - stitchStartTime) / 1000).toFixed(2);

      // Calculate total size
      const totalSize = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
      console.log('✅ Stitching complete, size:', totalSize, 'bytes,', `duration: ${stitchDuration}s`);

      const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      finalBlob = new Blob(chunks, { type: mimeType });

    } else {
      // Single subdivision - no need for image-stitch
      // We can just execute the generator for one item and get the blob
      const gridLayout = calculateGridLayout(subdivisions);
      const generator = renderSubdivisionsGenerator(
        gridLayout.orderedSubdivisions,
        subdivisions,
        visibleTracks,
        config,
        type,
        callbacks
      );

      const result = await generator.next();
      if (result.done) throw new Error('Generator failed to yield result');
      finalBlob = result.value;
    }

    // Download the final image
    const link = document.createElement('a');
    const extension = outputFormat === 'jpeg' ? 'jpg' : 'png';
    link.download = `gpx-map-${type}-${Date.now()}.${extension}`;
    link.href = URL.createObjectURL(finalBlob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    const totalExportDuration = ((performance.now() - exportStartTime) / 1000).toFixed(2);
    console.log(`✅ Export complete (total duration: ${totalExportDuration}s)`);
    onComplete();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
};
