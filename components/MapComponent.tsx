
import React, { useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L, { type LatLngExpression, type LatLng, type LatLngBounds, type Point as LeafletPoint } from 'leaflet';
import type { Track, TileLayerDefinition } from '../types';
import { DraggableBoundsBox } from './DraggableBoundsBox';

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

export const MapComponent: React.FC<MapComponentProps> = ({ tracks, onUserMove, center, zoom, lineThickness, exportBounds, onExportBoundsChange, boundsToFit, onBoundsFitted, tileLayer, labelDensity, highlightedTrackId }) => {
  
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
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
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
      <MapUpdater onUserMove={onUserMove} />
      <MapViewManager center={center} zoom={zoom} tileLayerKey={tileLayer.key} />
      <FitBoundsManager bounds={boundsToFit} onFitted={onBoundsFitted} />
    </MapContainer>
  );
};
