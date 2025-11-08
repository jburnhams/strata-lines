import type { Track } from '../types';
import type { LatLngBounds } from 'leaflet';
import {
  renderCanvasForBounds,
  resizeCanvas,
  calculateSubdivisions,
  calculateGridLayout,
  type RenderOptions,
} from '../utils/exportHelpers';
import { concat } from 'image-stitch/bundle';

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
}

export interface ExportCallbacks {
  onSubdivisionsCalculated: (subdivisions: LatLngBounds[]) => void;
  onSubdivisionProgress: (index: number) => void;
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
  } = config;

  const {
    onSubdivisionsCalculated,
    onSubdivisionProgress,
    onComplete,
    onError,
  } = callbacks;

  try {
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
    for (let i = 0; i < subdivisions.length; i++) {
      const subdivisionBounds = subdivisions[i];

      // Highlight the current subdivision being rendered
      onSubdivisionProgress(i);
      console.log(`🎨 Exporting subdivision ${i + 1}/${subdivisions.length}`);

      let finalCanvas: HTMLCanvasElement;

      // Render the subdivision based on type
      if (type === 'combined') {
        console.log('🎯 Rendering combined export...');

        const baseOptions: RenderOptions = {
          bounds: subdivisionBounds,
          layerType: 'base',
          zoomForRender: derivedExportZoom,
          tileLayerKey,
        };
        const baseCanvas = await renderCanvasForBounds(baseOptions);

        const linesOptions: RenderOptions = {
          bounds: subdivisionBounds,
          layerType: 'lines',
          zoomForRender: derivedExportZoom,
          visibleTracks,
          lineThickness,
          exportQuality,
        };
        const linesCanvas =
          visibleTracks.length > 0 ? await renderCanvasForBounds(linesOptions) : null;

        // Labels are rendered at a different zoom level
        const labelZoom = (previewZoom || zoom) + labelDensity;
        const labelsOptions: RenderOptions = {
          bounds: subdivisionBounds,
          layerType: 'labels-only',
          zoomForRender: labelZoom,
        };
        let labelsCanvas =
          tileLayerKey === 'esriImagery' && labelDensity >= 0
            ? await renderCanvasForBounds(labelsOptions)
            : null;

        if (!baseCanvas) throw new Error('Failed to render base layer');

        // CRITICAL: Resize labels to match base canvas dimensions
        // Labels are rendered at labelZoom but need to overlay at derivedExportZoom
        if (labelsCanvas) {
          console.group('🏷️  Processing labels layer');
          console.log(`Base zoom: ${derivedExportZoom}, Label zoom: ${labelZoom}`);
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
        baseCanvas.width = 0;
        baseCanvas.height = 0;
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

        const options: RenderOptions = {
          bounds: subdivisionBounds,
          layerType,
          zoomForRender,
          visibleTracks,
          tileLayerKey,
          lineThickness,
          exportQuality,
        };
        const canvas = await renderCanvasForBounds(options);
        if (!canvas) throw new Error(`Failed to render ${layerType} layer`);
        finalCanvas = canvas;
      }

      console.log('✅ Subdivision render complete, canvas size:', {
        width: finalCanvas.width,
        height: finalCanvas.height,
      });

      // Store the canvas for stitching (don't clean up yet if we have multiple subdivisions)
      subdivisionCanvases.push(finalCanvas);
    }

    console.log('✅ All subdivisions rendered');

    // Stitch subdivisions together if there are multiple
    let finalBlob: Blob;

    if (subdivisions.length > 1) {
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

      // Stitch images together
      const stitchedImage = await concat({
        inputs: canvasArrayBuffers,
        layout: {
          rows: gridLayout.rows,
          columns: gridLayout.columns,
        },
      });

      console.log('✅ Stitching complete, size:', stitchedImage.byteLength, 'bytes');

      // Convert Uint8Array to Blob
      // Create a new Uint8Array to ensure compatibility with Blob constructor
      const imageData = new Uint8Array(stitchedImage);
      finalBlob = new Blob([imageData], { type: 'image/png' });

      // Clean up subdivision canvases (all of them, regardless of order)
      subdivisionCanvases.forEach((canvas) => {
        canvas.width = 0;
        canvas.height = 0;
      });
    } else {
      // Single subdivision - just convert to blob
      const blob = await new Promise<Blob | null>((resolve) =>
        subdivisionCanvases[0].toBlob(resolve, 'image/png')
      );
      if (!blob) throw new Error('Failed to convert canvas to blob');
      finalBlob = blob;

      // Clean up canvas
      subdivisionCanvases[0].width = 0;
      subdivisionCanvases[0].height = 0;
    }

    // Download the final image
    const link = document.createElement('a');
    link.download = `gpx-map-${type}-${Date.now()}.png`;
    link.href = URL.createObjectURL(finalBlob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    console.log('✅ Export complete');
    onComplete();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
};
