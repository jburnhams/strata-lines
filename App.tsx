
import React, { useState, useCallback, useRef, useEffect } from 'react';
import L from 'leaflet';
import type { LatLng, LatLngBounds, Point as LeafletPoint } from 'leaflet';
import { MapComponent } from './components/MapComponent';
import { ControlsPanel } from './components/ControlsPanel';
import * as db from './services/db';
import { UK_CENTER_LATLNG, TILE_LAYERS } from './constants';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useExportState } from './hooks/useExportState';
import { useTrackManagement } from './hooks/useTrackManagement';
import { performPngExport } from './services/exportService';

export const MERGE_PIXEL_LIMIT = 8000 * 8000; // Approx 64 megapixels

const App: React.FC = () => {
  // Export state flags
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportingBase, setIsExportingBase] = useState<boolean>(false);
  const [isExportingLines, setIsExportingLines] = useState<boolean>(false);
  const [isExportingLabels, setIsExportingLabels] = useState<boolean>(false);

  // Map state
  const [zoom, setZoom] = useLocalStorage<number>('previewZoom', 6);
  const [mapCenter, setMapCenter] = useLocalStorage<LatLng>('mapCenter', UK_CENTER_LATLNG);
  const [previewZoom, setPreviewZoom] = useState<number | null>(null);
  const [previewBounds, setPreviewBounds] = useState<L.LatLngBounds | null>(null);
  const [highlightedTrackId, setHighlightedTrackId] = useState<string | null>(null);

  // Track management state
  const [minLengthFilter, setMinLengthFilter] = useLocalStorage<number>('minLengthFilter', 20);
  const [lineColorStart, setLineColorStart] = useLocalStorage<string>('lineColorStart', '#ffff00');
  const [lineColorEnd, setLineColorEnd] = useLocalStorage<string>('lineColorEnd', '#ff0000');
  const [lineThickness, setLineThickness] = useLocalStorage<number>('lineThickness', 3);

  // Map style state
  const [tileLayerKey, setTileLayerKey] = useLocalStorage<string>('tileLayerKey', 'esriImagery');
  const [labelDensity, setLabelDensity] = useLocalStorage<number>('labelDensity', 1);

  // Custom hooks
  const exportState = useExportState(previewZoom, zoom);
  const trackManagement = useTrackManagement(
    lineColorStart,
    lineColorEnd,
    minLengthFilter,
    previewBounds
  );

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
      trackManagement.setIsLoading(true);
      try {
        const storedTracks = await db.getTracks();
        const normalizedTracks = storedTracks.map(t => ({...t, isVisible: t.isVisible !== false }));
        trackManagement.setTracks(normalizedTracks);
      } catch (error) {
        console.error("Failed to load tracks from database", error);
        trackManagement.setNotification({ type: 'error', message: "Could not load saved tracks." });
      } finally {
        trackManagement.setIsLoading(false);
      }
    };
    loadTracks();
  }, []);

  const handleUserMove = useCallback((data: { center: LatLng; zoom: number; bounds: LatLngBounds; size: LeafletPoint; }) => {
    setMapCenter(data.center);
    setZoom(data.zoom);
    setPreviewBounds(data.bounds);
    setPreviewZoom(data.zoom);
  }, [setMapCenter, setZoom]);

  // Effect to calculate the initial geographical area of the export box,
  // or to recalculate it if the map moves and the user hasn't locked it.
  useEffect(() => {
    if (!previewBounds || exportState.exportBoundsLocked) {
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
      exportState.setExportBounds(L.latLngBounds(L.latLng(newSouth, newWest), L.latLng(newNorth, newEast)));
    } else {
      exportState.setExportBounds(null); // Inset is larger than bounds, hide box
    }
  }, [previewBounds, exportState.exportBoundsLocked]);

  const handleExportBoundsChange = useCallback((newBounds: LatLngBounds) => {
    exportState.setExportBounds(newBounds);
    if (!exportState.exportBoundsLocked) {
      exportState.setExportBoundsLocked(true); // Lock the bounds once the user interacts with them.
    }
  }, [exportState.exportBoundsLocked, exportState.setExportBounds, exportState.setExportBoundsLocked]);

  const onBoundsFitted = useCallback(() => {
    trackManagement.setBoundsToFit(null);
  }, []);

  // Export handlers
  const handleExport = useCallback(async (type: 'combined' | 'base' | 'lines' | 'labels') => {
    const visibleTracks = trackManagement.coloredTracks.filter(t => t.isVisible);

    // Validation
    if ((type === 'combined' || type === 'lines') && visibleTracks.length === 0) {
      trackManagement.setNotification({ type: 'error', message: "Cannot export with lines without a visible track."});
      return;
    }
    if (type === 'labels' && (labelDensity < 0 || tileLayerKey !== 'esriImagery')) {
      trackManagement.setNotification({ type: 'info', message: "Labels are off or unavailable for this map style." });
      return;
    }
    if (!exportState.exportDimensions.width || !exportState.exportDimensions.height ||
        !exportState.derivedExportZoom || !exportState.exportBounds) {
      trackManagement.setNotification({ type: 'error', message: "Export properties not calculated yet."});
      return;
    }

    console.log('🚀 Starting export:', {
      type,
      exportBounds: {
        north: exportState.exportBounds.getNorth(),
        south: exportState.exportBounds.getSouth(),
        east: exportState.exportBounds.getEast(),
        west: exportState.exportBounds.getWest()
      },
      exportZoom: exportState.derivedExportZoom,
      previewZoom: previewZoom || zoom,
      dimensions: exportState.exportDimensions
    });

    trackManagement.setNotification(null);
    const setters = {
      'combined': setIsExporting,
      'base': setIsExportingBase,
      'lines': setIsExportingLines,
      'labels': setIsExportingLabels
    };
    setters[type](true);

    try {
      await performPngExport(
        type,
        visibleTracks,
        {
          exportBounds: exportState.exportBounds,
          derivedExportZoom: exportState.derivedExportZoom,
          previewZoom: previewZoom || zoom,
          zoom,
          maxDimension: exportState.maxDimension,
          labelDensity,
          tileLayerKey,
          lineThickness,
          exportQuality: exportState.exportQuality,
        },
        {
          onSubdivisionsCalculated: exportState.setExportSubdivisions,
          onSubdivisionProgress: exportState.setCurrentExportSubdivisionIndex,
          onSubdivisionStitched: (completed) => {
            exportState.setCompletedStitchedCount(completed);
          },
          onComplete: () => {
            exportState.setExportSubdivisions([]);
            exportState.setCurrentExportSubdivisionIndex(-1);
            exportState.setCompletedStitchedCount(0);
          },
          onError: (error) => {
            trackManagement.setNotification({
              type: 'error',
              message: error.message || 'Failed to export map. Please try again.'
            });
            console.error('Export error:', error);
          }
        }
      );
    } finally {
      setters[type](false);
    }
  }, [
    trackManagement,
    exportState,
    labelDensity,
    tileLayerKey,
    lineThickness,
    previewZoom,
    zoom
  ]);

  const selectedTileLayer = TILE_LAYERS.find(l => l.key === tileLayerKey) || TILE_LAYERS[0];

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col md:flex-row font-sans">
      <div ref={mapContainerRef} className="w-full h-[50vh] md:h-screen md:flex-1 relative flex justify-center items-center bg-gray-900">
        <div ref={mapWrapperRef} className="h-full w-full">
          <MapComponent
            tracks={trackManagement.coloredTracks}
            onUserMove={handleUserMove}
            center={L.latLng(mapCenter.lat, mapCenter.lng)}
            zoom={zoom}
            lineThickness={lineThickness}
            exportBounds={exportState.exportBounds}
            onExportBoundsChange={handleExportBoundsChange}
            boundsToFit={trackManagement.boundsToFit}
            onBoundsFitted={onBoundsFitted}
            tileLayer={selectedTileLayer}
            labelDensity={labelDensity}
            highlightedTrackId={highlightedTrackId}
            exportSubdivisions={exportState.exportSubdivisions}
            currentExportSubdivisionIndex={exportState.currentExportSubdivisionIndex}
            completedStitchedCount={exportState.completedStitchedCount}
          />
        </div>
      </div>
      <ControlsPanel
        tracks={trackManagement.tracks}
        handleFiles={trackManagement.handleFiles}
        removeTrack={trackManagement.removeTrack}
        removeAllTracks={trackManagement.removeAllTracks}
        toggleTrackVisibility={trackManagement.toggleTrackVisibility}
        handleExport={() => handleExport('combined')}
        handleExportBase={() => handleExport('base')}
        handleExportLines={() => handleExport('lines')}
        handleExportLabels={() => handleExport('labels')}
        aspectRatio={exportState.aspectRatio}
        setAspectRatio={exportState.setAspectRatio}
        exportBoundsAspectRatio={exportState.exportBoundsAspectRatio}
        exportQuality={exportState.exportQuality}
        setExportQuality={exportState.setExportQuality}
        derivedExportZoom={exportState.derivedExportZoom}
        isLoading={trackManagement.isLoading}
        isExporting={isExporting}
        isExportingBase={isExportingBase}
        isExportingLines={isExportingLines}
        isExportingLabels={isExportingLabels}
        notification={trackManagement.notification}
        setNotification={trackManagement.setNotification}
        lineColorStart={lineColorStart}
        setLineColorStart={setLineColorStart}
        lineColorEnd={lineColorEnd}
        setLineColorEnd={setLineColorEnd}
        lineThickness={lineThickness}
        setLineThickness={setLineThickness}
        viewportMiles={exportState.viewportMiles}
        exportDimensions={exportState.exportDimensions}
        minLengthFilter={minLengthFilter}
        setMinLengthFilter={setMinLengthFilter}
        tileLayerKey={tileLayerKey}
        setTileLayerKey={setTileLayerKey}
        labelDensity={labelDensity}
        setLabelDensity={setLabelDensity}
        onTrackHover={setHighlightedTrackId}
        handleDownloadAllTracks={trackManagement.handleDownloadAllTracks}
        isDownloading={trackManagement.isDownloading}
        maxDimension={exportState.maxDimension}
        setMaxDimension={exportState.setMaxDimension}
      />
    </div>
  );
};

export default App;
