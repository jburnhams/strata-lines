
import React, { useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Rectangle, useMap, useMapEvents, Tooltip } from 'react-leaflet';
import L, { type LatLngExpression, type LatLng, type LatLngBounds, type Point as LeafletPoint } from 'leaflet';
import type { Track, TileLayerDefinition } from '../types';
import { LABEL_TILE_URL_RETINA } from '../labelTiles';
import { DraggableBoundsBox } from './DraggableBoundsBox';
import type { ProgressInfo } from '../utils/progressTracker';

interface MapComponentProps {
  tracks: Track[];
  onUserMove: (data: { center: LatLng, zoom: number, bounds: LatLngBounds, size: LeafletPoint }) => void;
  center: LatLng;
  zoom: number;
  lineThickness: number;
  exportBounds: LatLngBounds | null;
  onExportBoundsChange: (newBounds: LatLngBounds) => void;
  boundsToFit: LatLngBounds | null;
  onBoundsFitted: () => void;
  tileLayer: TileLayerDefinition;
  labelDensity: number;
  highlightedTrackId: string | null;
  exportSubdivisions: LatLngBounds[];
  currentExportSubdivisionIndex: number;
  completedStitchedCount: number;
  subdivisionProgress: Map<number, ProgressInfo>;
}

const FitBoundsManager: React.FC<{ bounds: LatLngBounds | null; onFitted: () => void }> = ({ bounds, onFitted }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.isValid()) {
            const currentZoom = map.getZoom();
            const targetZoom = map.getBoundsZoom(bounds, false, L.point(50, 50)); // Get zoom level needed for a tight fit

            map.once('moveend', onFitted);
            
            // This is the "don't zoom in" case. If fitting the bounds would require zooming in,
            // it means the tracks are already mostly visible but might be off-center.
            // To handle this, we create a new bounding box that includes both the current
            // view and the target tracks, then fit to that. This forces a pan/zoom-out.
            if (targetZoom > currentZoom) {
                const currentBounds = map.getBounds();
                const unionBounds = currentBounds.extend(bounds);
                map.fitBounds(unionBounds, { padding: [50, 50], animate: true });
            } else {
                // This is the standard "zoom out" case. The tracks are outside the current
                // view in a way that requires a wider field of view.
                map.fitBounds(bounds, { padding: [50, 50], animate: true });
            }

            return () => {
                map.off('moveend', onFitted);
            };
        }
    }, [bounds, map, onFitted]);
    return null;
};

const MapUpdater: React.FC<{ onUserMove: MapComponentProps['onUserMove'] }> = ({ onUserMove }) => {
  const map = useMap();

  const handleMove = useCallback(() => {
    // Defer execution to ensure Leaflet's internal state is fully updated
    // after a move/zoom/resize event before we read it.
    setTimeout(() => {
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) return; // Guard against calculations on a hidden map

      onUserMove({
        center: map.getCenter(),
        zoom: map.getZoom(),
        bounds: map.getBounds(),
        size: size,
      });
    }, 0);
  }, [map, onUserMove]);

  useEffect(() => {
    // Fire initial move event once map is ready
    map.whenReady(handleMove);
  }, [map, handleMove]);

  useMapEvents({
    dragend: handleMove,
    zoomend: handleMove,
    resize: handleMove,
  });

  return null;
};

const MapViewManager: React.FC<{ center: LatLng; zoom: number; tileLayerKey: string }> = ({ center, zoom, tileLayerKey }) => {
  const map = useMap();
  useEffect(() => {
    const mapCenter = map.getCenter();
    const mapZoom = map.getZoom();
    // Check if the map state is already correct to avoid unnecessary moves and event loops
    if (mapZoom !== zoom || mapCenter.distanceTo(center) > 1) { // 1 meter tolerance
      map.setView(center, zoom, { animate: false });
    }
  }, [map, center, zoom, tileLayerKey]);
  return null;
};

// Component to ensure map size is correctly calculated after initial render
const MapSizeManager: React.FC = () => {
  const map = useMap();
  useEffect(() => {
    // Invalidate size after a short delay to ensure container has final dimensions
    // This fixes the issue where the map renders with incorrect size on initial page load
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

export const MapComponent: React.FC<MapComponentProps> = ({ tracks, onUserMove, center, zoom, lineThickness, exportBounds, onExportBoundsChange, boundsToFit, onBoundsFitted, tileLayer, labelDensity, highlightedTrackId, exportSubdivisions, currentExportSubdivisionIndex, completedStitchedCount, subdivisionProgress }) => {
  
  const highlightedTrack = useMemo(() => 
    highlightedTrackId ? tracks.find(t => t.id === highlightedTrackId) : null,
    [tracks, highlightedTrackId]
  );

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="h-full w-full" zoomSnap={1} zoomDelta={1}>
      {tileLayer.layers.map((layer, i) => (
        <TileLayer
          key={`${tileLayer.key}-${i}`}
          url={layer.url}
          attribution={layer.attribution}
        />
      ))}
      
      {labelDensity >= 0 && tileLayer.key === 'esriImagery' && (
          <TileLayer
              key="labels"
              url={LABEL_TILE_URL_RETINA}
              attribution=""
              opacity={1}
              pane="shadowPane"
          />
      )}
        
      {tracks.filter(t => t.isVisible && t.id !== highlightedTrackId).map((track) => (
        <Polyline
          key={track.id}
          positions={track.points as LatLngExpression[]}
          pathOptions={{ color: track.color || '#ff4500', weight: lineThickness, opacity: 0.8 }}
        />
      ))}

      {highlightedTrack && highlightedTrack.isVisible && (
        <>
          {/* A thicker, brighter 'glow' line underneath */}
          <Polyline
            key={`${highlightedTrack.id}-glow`}
            positions={highlightedTrack.points as LatLngExpression[]}
            pathOptions={{ color: '#fff', weight: lineThickness + 4, opacity: 0.7 }}
          />
          {/* The original line on top, but with the blinking class */}
          <Polyline
            key={highlightedTrack.id}
            positions={highlightedTrack.points as LatLngExpression[]}
            pathOptions={{ color: highlightedTrack.color || '#ff4500', weight: lineThickness, opacity: 0.8 }}
            className="blinking-track"
          />
        </>
      )}

      <DraggableBoundsBox bounds={exportBounds} onChange={onExportBoundsChange} />

      {/* Render subdivision rectangles during export */}
      {exportSubdivisions.length > 0 && exportSubdivisions.map((subdivisionBounds, index) => {
        const isCurrentlyRendering = index === currentExportSubdivisionIndex;
        const isStitched = index < completedStitchedCount;
        const isComplete = isStitched;
        const progress = subdivisionProgress.get(index);

        return (
          <Rectangle
            key={`subdivision-${index}`}
            bounds={subdivisionBounds}
            pathOptions={{
              color: isComplete ? '#00ff00' : (isCurrentlyRendering ? '#ffeb3b' : '#ff9800'),
              weight: isComplete || isCurrentlyRendering ? 3 : 2,
              fillOpacity: isComplete ? 0.2 : (isCurrentlyRendering ? 0.3 : 0.1),
              dashArray: isComplete || isCurrentlyRendering ? undefined : '5, 5'
            }}
          >
            {isCurrentlyRendering && progress && (
              <Tooltip
                direction="center"
                permanent
                opacity={1}
                className="subdivision-progress-tooltip"
              >
                <div style={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap'
                }}>
                  <div>{progress.stageLabel}</div>
                  <div>{progress.percentage}%</div>
                  {progress.total > 0 && (
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                      {progress.current}/{progress.total}
                    </div>
                  )}
                </div>
              </Tooltip>
            )}
          </Rectangle>
        );
      })}

      <MapUpdater onUserMove={onUserMove} />
      <MapViewManager center={center} zoom={zoom} tileLayerKey={tileLayer.key} />
      <MapSizeManager />
      <FitBoundsManager bounds={boundsToFit} onFitted={onBoundsFitted} />
    </MapContainer>
  );
};
