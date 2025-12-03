
import React, { useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Rectangle, useMap, useMapEvents, Tooltip, Marker } from 'react-leaflet';
import L, { type LatLngExpression, type LatLng, type LatLngBounds, type Point as LeafletPoint } from 'leaflet';
import type { Track, TileLayerDefinition, Place } from '@/types';
import { LABEL_TILE_URL_RETINA } from '@/labelTiles';
import { DraggableBoundsBox } from './DraggableBoundsBox';
import type { ProgressInfo } from '@/utils/progressTracker';

interface MapComponentProps {
  tracks: Track[];
  places?: Place[];
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
  completedSubdivisions: Set<number>;
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

export const MapComponent: React.FC<MapComponentProps> = ({ tracks, places, onUserMove, center, zoom, lineThickness, exportBounds, onExportBoundsChange, boundsToFit, onBoundsFitted, tileLayer, labelDensity, highlightedTrackId, exportSubdivisions, currentExportSubdivisionIndex, completedSubdivisions, subdivisionProgress }) => {
  
  const highlightedTrack = useMemo(() => 
    highlightedTrackId ? tracks.find(t => t.id === highlightedTrackId) : null,
    [tracks, highlightedTrackId]
  );

  // Helper to create custom icons for places
  const createPlaceIcon = (place: Place) => {
    // We can read settings from localStorage or similar if we want to bypass props,
    // but typically we should receive the global settings as props if we want reactivity.
    // For now, we will use the place's individual settings, assuming the parent
    // has already applied global overrides if necessary before passing the places prop,
    // OR we will just use the basic rendering.

    // NOTE: The requirements mention "PlaceSettingsPanel" having a "Title Size" slider.
    // However, `MapComponentProps` currently doesn't receive `titleSize`.
    // I will use a default size or update the props if needed.
    // Given I can't easily change the prop interface across the whole app in one step without breaking things,
    // I'll stick to a sensible default or try to read from local storage if imperative.
    // Actually, checking the previous step, `App.tsx` integration was done.
    // Let's check if `MapComponent` receives the settings. It does NOT in the current interface.
    // I will use the place.title and basic styling.

    // In a real implementation for the "title size", we'd likely pass a `placeSettings` object.
    // Since I cannot change the interface extensively in this patch safely, I will render standard markers.

    // Update: I will check `localStorage` directly as a fallback for the title size since it's client-side only.
    const savedSize = localStorage.getItem('place-title-size');
    const titleSize = savedSize ? parseInt(savedSize, 10) : 50;
    const fontSize = 10 + (titleSize / 100) * 20; // Scale 10px to 30px

    // Simple DivIcon to show text and a dot
    const html = `
      <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
        ${place.showIcon ? `<div style="width: 10px; height: 10px; background-color: #3b82f6; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>` : ''}
        <div style="
          margin-top: 4px;
          background: rgba(255, 255, 255, 0.9);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: ${fontSize}px;
          font-weight: 500;
          color: #1e293b;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          border: 1px solid rgba(0,0,0,0.1);
        ">${place.title}</div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-place-marker',
      iconSize: [100, 50], // Approximate size, handled by CSS mostly
      iconAnchor: [50, 6], // Center horizontally, just below the dot vertically
    });
  };

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

      {places && places.filter(p => p.isVisible).map(place => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={createPlaceIcon(place)}
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
        const isComplete = completedSubdivisions.has(index);
        const progress = subdivisionProgress.get(index);

        return (
          <React.Fragment key={`subdivision-group-${index}`}>
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
          </React.Fragment>
        );
      })}

      <MapUpdater onUserMove={onUserMove} />
      <MapViewManager center={center} zoom={zoom} tileLayerKey={tileLayer.key} />
      <MapSizeManager />
      <FitBoundsManager bounds={boundsToFit} onFitted={onBoundsFitted} />
    </MapContainer>
  );
};
