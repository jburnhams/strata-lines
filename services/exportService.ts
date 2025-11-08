import type { Track } from '../types';
import type { LatLngBounds } from 'leaflet';
import {
  renderCanvasForBounds,
  resizeCanvas,
  calculateSubdivisions,
  type RenderOptions,
} from '../utils/exportHelpers';

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

      // Download the subdivision
      const blob = await new Promise<Blob | null>((resolve) =>
        finalCanvas.toBlob(resolve, 'image/png')
      );
      if (blob) {
        const link = document.createElement('a');
        const suffix = subdivisions.length > 1 ? `_part${i + 1}of${subdivisions.length}` : '';
        link.download = `gpx-map-${type}${suffix}-${Date.now()}.png`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        // Small delay between downloads to ensure browser handles them properly
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      finalCanvas.width = 0;
      finalCanvas.height = 0;
    }

    console.log('✅ All subdivisions exported successfully');
    onComplete();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
};
