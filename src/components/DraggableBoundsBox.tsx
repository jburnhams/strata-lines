import React, { useMemo, useRef, useCallback } from 'react';
import { Rectangle, Marker, useMap, FeatureGroup } from 'react-leaflet';
import L, { type LatLngBounds, type LatLng } from 'leaflet';

interface DraggableBoundsBoxProps {
  bounds: LatLngBounds | null;
  onChange: (newBounds: LatLngBounds) => void;
}

// Custom icon for the drag handles
const handleIcon = L.divIcon({
  className: 'leaflet-div-icon leaflet-editing-icon',
  html: '',
  iconSize: [12, 12],
});

export const DraggableBoundsBox: React.FC<DraggableBoundsBoxProps> = ({ bounds, onChange }) => {
  const map = useMap();
  const dragData = useRef<{ startLatLng: LatLng; startBounds: LatLngBounds } | null>(null);

  const onRectangleDrag = useCallback((e: L.LeafletMouseEvent) => {
    if (!dragData.current) return;
    const { startLatLng, startBounds } = dragData.current;

    const latDiff = e.latlng.lat - startLatLng.lat;
    const lngDiff = e.latlng.lng - startLatLng.lng;

    const newSouthWest = L.latLng(startBounds.getSouth() + latDiff, startBounds.getWest() + lngDiff);
    const newNorthEast = L.latLng(startBounds.getNorth() + latDiff, startBounds.getEast() + lngDiff);
    
    onChange(L.latLngBounds(newSouthWest, newNorthEast));
  }, [onChange]);

  const onRectangleDragEnd = useCallback(() => {
    map.dragging.enable();
    dragData.current = null;
    map.off('mousemove', onRectangleDrag);
    map.off('mouseup', onRectangleDragEnd);
    map.getContainer().style.cursor = '';
  }, [map, onRectangleDrag]);

  const onRectangleDragStart = useCallback((e: L.LeafletMouseEvent) => {
    L.DomEvent.stopPropagation(e.originalEvent);
    map.dragging.disable();
    
    if (bounds) {
        dragData.current = {
            startLatLng: e.latlng,
            startBounds: bounds,
        };
    }
    
    map.on('mousemove', onRectangleDrag);
    map.on('mouseup', onRectangleDragEnd);
    map.getContainer().style.cursor = 'move';
  }, [map, bounds, onRectangleDrag, onRectangleDragEnd]);

  const rectangleEventHandlers = useMemo(() => ({
    mousedown: onRectangleDragStart,
  }), [onRectangleDragStart]);

  const handleDrag = useCallback((corner: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w', newLatLng: LatLng) => {
    if (!bounds) return;

    let { north, south, east, west } = bounds.toBBoxString().split(',').reduce((acc, val, i) => {
      const keys = ['west', 'south', 'east', 'north'];
      acc[keys[i]] = parseFloat(val);
      return acc;
    }, {} as { [key: string]: number });

    switch (corner) {
      case 'nw':
        north = newLatLng.lat;
        west = newLatLng.lng;
        break;
      case 'ne':
        north = newLatLng.lat;
        east = newLatLng.lng;
        break;
      case 'se':
        south = newLatLng.lat;
        east = newLatLng.lng;
        break;
      case 'sw':
        south = newLatLng.lat;
        west = newLatLng.lng;
        break;
      case 'n':
        north = newLatLng.lat;
        break;
      case 's':
        south = newLatLng.lat;
        break;
      case 'e':
        east = newLatLng.lng;
        break;
      case 'w':
        west = newLatLng.lng;
        break;
    }
    
    // Ensure north is greater than south and east is greater than west
    if (north < south) [north, south] = [south, north];
    if (east < west) [east, west] = [west, east];

    const newBounds = L.latLngBounds([south, west], [north, east]);
    onChange(newBounds);
  }, [bounds, onChange]);
  
  const handlers = useMemo(() => ({
    nw: (e: L.LeafletEvent) => handleDrag('nw', (e as L.DragEndEvent).target.getLatLng()),
    ne: (e: L.LeafletEvent) => handleDrag('ne', (e as L.DragEndEvent).target.getLatLng()),
    se: (e: L.LeafletEvent) => handleDrag('se', (e as L.DragEndEvent).target.getLatLng()),
    sw: (e: L.LeafletEvent) => handleDrag('sw', (e as L.DragEndEvent).target.getLatLng()),
    n: (e: L.LeafletEvent) => handleDrag('n', (e as L.DragEndEvent).target.getLatLng()),
    s: (e: L.LeafletEvent) => handleDrag('s', (e as L.DragEndEvent).target.getLatLng()),
    e: (e: L.LeafletEvent) => handleDrag('e', (e as L.DragEndEvent).target.getLatLng()),
    w: (e: L.LeafletEvent) => handleDrag('w', (e as L.DragEndEvent).target.getLatLng()),
  }), [handleDrag]);

  if (!bounds) {
    return null;
  }
  
  const center = bounds.getCenter();
  const north = bounds.getNorth();
  const south = bounds.getSouth();
  const east = bounds.getEast();
  const west = bounds.getWest();

  return (
    <FeatureGroup>
      <Rectangle
        bounds={bounds}
        pathOptions={{ color: 'yellow', weight: 2, fill: true, fillColor: 'yellow', fillOpacity: 0.1, dashArray: '5, 10' }}
        eventHandlers={rectangleEventHandlers}
      />
      {/* Corner Handles */}
      <Marker position={[north, west]} icon={handleIcon} draggable={true} eventHandlers={{ drag: handlers.nw, dragend: handlers.nw }} />
      <Marker position={[north, east]} icon={handleIcon} draggable={true} eventHandlers={{ drag: handlers.ne, dragend: handlers.ne }} />
      <Marker position={[south, east]} icon={handleIcon} draggable={true} eventHandlers={{ drag: handlers.se, dragend: handlers.se }} />
      <Marker position={[south, west]} icon={handleIcon} draggable={true} eventHandlers={{ drag: handlers.sw, dragend: handlers.sw }} />
      {/* Edge Handles */}
      <Marker position={[north, center.lng]} icon={handleIcon} draggable={true} eventHandlers={{ drag: handlers.n, dragend: handlers.n }} />
      <Marker position={[south, center.lng]} icon={handleIcon} draggable={true} eventHandlers={{ drag: handlers.s, dragend: handlers.s }} />
      <Marker position={[center.lat, east]} icon={handleIcon} draggable={true} eventHandlers={{ drag: handlers.e, dragend: handlers.e }} />
      <Marker position={[center.lat, west]} icon={handleIcon} draggable={true} eventHandlers={{ drag: handlers.w, dragend: handlers.w }} />
    </FeatureGroup>
  );
};
