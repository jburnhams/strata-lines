import type { LatLngBounds } from 'leaflet';
import type { Track } from '@/types';
import {
  renderCanvasForBounds,
  resizeCanvas,
  calculateSubdivisions,
  calculateGridLayout,
  type RenderOptions,
} from '@/utils/exportHelpers';
import { concatToBuffer } from 'image-stitch/bundle';
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
    previewZoom,
    zoom,
    maxDimension,
    labelDensity,
    tileLayerKey,
    lineThickness,
    exportQuality,
    outputFormat,
    jpegQuality,
  } = config;

  const {
    onSubdivisionsCalculated,
    onSubdivisionProgress,
    onSubdivisionStitched,
    onStageProgress,
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

    // Collect all subdivision canvases for stitching
    const subdivisionCanvases: HTMLCanvasElement[] = [];

    // Export each subdivision
    const subdivisionsStartTime = performance.now();
    for (let i = 0; i < subdivisions.length; i++) {
      const subdivisionStartTime = performance.now();
      const subdivisionBounds = subdivisions[i];

      // Highlight the current subdivision being rendered
      onSubdivisionProgress(i);
      console.log(`🎨 Exporting subdivision ${i + 1}/${subdivisions.length}`);

      let finalCanvas: HTMLCanvasElement;

      // Render the subdivision based on type
      if (type === 'combined') {
        console.log('🎯 Rendering combined export...');

      const { base = true, lines = true, labels = true } = config.includedLayers || {};

        // Base layer (1/3)
      let baseCanvas: HTMLCanvasElement | null = null;
      if (base) {
        if (onStageProgress) {
          onStageProgress(i, {
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
                onStageProgress(i, {
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
        if (onStageProgress && visibleTracks.length > 0) {
          onStageProgress(i, {
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
          visibleTracks,
          lineThickness,
          exportQuality,
          onLineProgress: onStageProgress
            ? (checksCompleted, maxChecks) => {
                onStageProgress(i, {
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
          visibleTracks.length > 0 ? await renderCanvasForBounds(linesOptions) : null;
        }

        // Labels are rendered at a different zoom level (3/3)
      let labelsCanvas: HTMLCanvasElement | null = null;
      if (labels) {
        if (onStageProgress && tileLayerKey === 'esriImagery' && labelDensity >= 0) {
          onStageProgress(i, {
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
                onStageProgress(i, {
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

        // CRITICAL: Resize labels to match base canvas dimensions
        // Labels are rendered at labelZoom but need to overlay at derivedExportZoom
      if (labelsCanvas && baseCanvas) {
          console.group('🏷️  Processing labels layer');
        console.log(`Base zoom: ${derivedExportZoom}, Label zoom: ${(previewZoom || zoom) + labelDensity}`);
          console.log(`Base dimensions: ${baseCanvas.width}x${baseCanvas.height}`);
          console.log(
            `Label dimensions (before resize): ${labelsCanvas.width}x${labelsCanvas.height}`
          );

          // Only resize if dimensions don't match
          if (
            labelsCanvas.width !== baseCanvas.width ||
            labelsCanvas.height !== baseCanvas.height
          ) {
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

      // Determine canvas dimensions (prefer base, then lines, then labels)
      const width = baseCanvas?.width || linesCanvas?.width || labelsCanvas?.width;
      const height = baseCanvas?.height || linesCanvas?.height || labelsCanvas?.height;

      if (!width || !height) {
        throw new Error('No layers were rendered');
      }

        // Stack layers
        console.log('📚 Stacking layers: base → lines → labels');

        // Create canvas for stacking, using @napi-rs/canvas in integration test environments
        // Skip in unit tests (detected by missing getImageData on mock contexts)
        const createCanvas = (width: number, height: number): HTMLCanvasElement => {
          // Only use @napi-rs/canvas in integration test environment
          // Unit tests use mocks that don't have full canvas API
          if (typeof require !== 'undefined') {
            try {
              // Check if we're in integration test environment (has real canvas API)
              const testCanvas = document.createElement('canvas');
              const testCtx = testCanvas.getContext('2d');
              const hasRealCanvas = testCtx && typeof testCtx.getImageData === 'function';

              if (hasRealCanvas) {
                const { createCanvas: napiCreateCanvas } = require('@napi-rs/canvas');
                return napiCreateCanvas(width, height) as unknown as HTMLCanvasElement;
              }
            } catch {
              // @napi-rs/canvas not available or detection failed
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          return canvas;
        };

      finalCanvas = createCanvas(width, height);
        const ctx = finalCanvas.getContext('2d')!;

        // Helper to draw canvas with type conversion if needed
        const drawLayer = (sourceCanvas: HTMLCanvasElement) => {
          // @napi-rs/canvas uses "CanvasElement" constructor name
          const isNapiTarget = finalCanvas.constructor.name === 'CanvasElement';
          const isNapiSource = sourceCanvas.constructor.name === 'CanvasElement';

          if (isNapiTarget && !isNapiSource) {
            // Convert JSDOM source to @napi-rs via ImageData
            try {
              const sourceCtx = sourceCanvas.getContext('2d');
              if (sourceCtx && typeof sourceCtx.getImageData === 'function') {
                const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
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
              // Conversion failed, fall back to direct draw
            }
          }

          // Standard canvas drawing or fallback
          ctx.drawImage(sourceCanvas, 0, 0);
        };

      if (baseCanvas) drawLayer(baseCanvas);
        if (linesCanvas) {
          console.log(`  + Lines layer (${linesCanvas.width}x${linesCanvas.height})`);
          drawLayer(linesCanvas);
        }
        if (labelsCanvas) {
          console.log(`  + Labels layer (${labelsCanvas.width}x${labelsCanvas.height})`);
          drawLayer(labelsCanvas);
        }

        // Free memory
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
        let layerType: 'base' | 'lines' | 'labels-only';
        let zoomForRender = derivedExportZoom;
        if (type === 'base') layerType = 'base';
        else if (type === 'lines') layerType = 'lines';
        else {
          layerType = 'labels-only';
          zoomForRender = (previewZoom || zoom) + labelDensity;
        }

        // Set initial progress
        if (onStageProgress) {
          onStageProgress(i, {
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
          visibleTracks,
          tileLayerKey,
          lineThickness,
          exportQuality,
          onTileProgress:
            onStageProgress && (layerType === 'base' || layerType === 'labels-only')
              ? (loaded, total) => {
                  onStageProgress(i, {
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
                  onStageProgress(i, {
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
      console.log(`✅ Subdivision render complete (${i + 1}/${subdivisions.length}), canvas size:`, {
        width: finalCanvas.width,
        height: finalCanvas.height,
        duration: `${subdivisionDuration}s`,
      });

      // Store the canvas for stitching (don't clean up yet if we have multiple subdivisions)
      subdivisionCanvases.push(finalCanvas);
    }

    const subdivisionsTotal = ((performance.now() - subdivisionsStartTime) / 1000).toFixed(2);
    console.log(`✅ All subdivisions rendered (${subdivisions.length} subdivision${subdivisions.length !== 1 ? 's' : ''}, ${subdivisionsTotal}s total)`);

    // Stitch subdivisions together if there are multiple
    let finalBlob: Blob;

    if (subdivisions.length > 1) {
      const stitchStartTime = performance.now();
      console.log('🧵 Stitching subdivisions together...');

      // Calculate grid layout for stitching
      const gridLayout = calculateGridLayout(subdivisions);
      console.log(
        `📐 Grid layout: ${gridLayout.rows} rows × ${gridLayout.columns} columns`
      );

      // Create a map from bounds to canvas for reordering
      const boundsToCanvasMap = new Map<LatLngBounds, HTMLCanvasElement>();
      subdivisions.forEach((bounds, index) => {
        boundsToCanvasMap.set(bounds, subdivisionCanvases[index]);
      });

      // Reorder canvases according to gridLayout.orderedSubdivisions (row-major order)
      const orderedCanvases = gridLayout.orderedSubdivisions.map((bounds) => {
        const canvas = boundsToCanvasMap.get(bounds);
        if (!canvas) throw new Error('Canvas not found for subdivision bounds');
        return canvas;
      });

      // Convert ordered canvases to ArrayBuffers for image-stitch
      const canvasBlobs = await Promise.all(
        orderedCanvases.map(
          (canvas) =>
            new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
        )
      );

      const canvasArrayBuffers = await Promise.all(
        canvasBlobs.map(async (blob) => {
          if (!blob) throw new Error('Failed to convert canvas to blob');
          return await blob.arrayBuffer();
        })
      );

      // Stitch images together with progress tracking
      const stitchedImage = await concatToBuffer({
        inputs: canvasArrayBuffers,
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

      const stitchDuration = ((performance.now() - stitchStartTime) / 1000).toFixed(2);
      console.log('✅ Stitching complete, size:', stitchedImage.byteLength, 'bytes,', `duration: ${stitchDuration}s`);

      // Convert Uint8Array to Blob
      // Create a new Uint8Array to ensure compatibility with Blob constructor
      const imageData = new Uint8Array(stitchedImage);
      const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      finalBlob = new Blob([imageData], { type: mimeType });

      // Clean up subdivision canvases (all of them, regardless of order)
      subdivisionCanvases.forEach((canvas) => {
        canvas.width = 0;
        canvas.height = 0;
      });
    } else {
      // Single subdivision - just convert to blob
      const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const quality = outputFormat === 'jpeg' ? jpegQuality / 100 : undefined;
      const blob = await new Promise<Blob | null>((resolve) =>
        subdivisionCanvases[0].toBlob(resolve, mimeType, quality)
      );
      if (!blob) throw new Error('Failed to convert canvas to blob');
      finalBlob = blob;

      // Clean up canvas
      subdivisionCanvases[0].width = 0;
      subdivisionCanvases[0].height = 0;
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
