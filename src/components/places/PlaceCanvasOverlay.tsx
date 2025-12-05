import React, { useEffect, useRef, useMemo } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Place, ExportSettings, PlaceTextStyle } from '@/types';
import { renderPlacesOnCanvas, type PlaceRenderResult, type Rect } from '@/services/placeRenderingService';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { calculateOptimalPositions } from '@/services/titlePositioningService';
import type { PlaceTitlePosition } from '@/types';

export const isPointInBounds = (x: number, y: number, bounds: Rect): boolean => {
  const padding = 5;
  return x >= bounds.x - padding &&
         x <= bounds.x + bounds.width + padding &&
         y >= bounds.y - padding &&
         y <= bounds.y + bounds.height + padding;
};

export const getPlaceAtPoint = (x: number, y: number, renderResults: Map<string, PlaceRenderResult>): string | null => {
  // Iterate in reverse insertion order (top-most first)
  const ids = Array.from(renderResults.keys());
  for (let i = ids.length - 1; i >= 0; i--) {
      const id = ids[i];
      const result = renderResults.get(id);
      if (!result) continue;

      if (result.iconBounds && isPointInBounds(x, y, result.iconBounds)) return id;
      if (result.textBounds && isPointInBounds(x, y, result.textBounds)) return id;
  }
  return null;
};

export const PlaceCanvasOverlay: React.FC<{
  places: Place[];
  onPlaceClick?: (placeId: string | null, position: { x: number, y: number }) => void;
}> = ({ places, onPlaceClick }) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const positionsRef = useRef<Map<string, PlaceTitlePosition> | undefined>(undefined);
  const renderResultsRef = useRef<Map<string, PlaceRenderResult>>(new Map());
  const lastCalcZoomRef = useRef<number>(-1);
  const lastCalcPlacesRef = useRef<Place[]>(places);
  const lastCalcSettingsRef = useRef<ExportSettings | null>(null);

  // Settings
  const [includePlaces] = useLocalStorage<boolean>('exportIncludePlaces', true);
  const [placeTitleSize] = useLocalStorage<number>('exportPlaceTitleSize', 50);
  const [placeShowIconsGlobally] = useLocalStorage<boolean>('exportPlaceShowIcons', true);
  const [placeTextStyle] = useLocalStorage<PlaceTextStyle>('exportPlaceTextStyle', {
    fontSize: 12,
    fontFamily: 'Noto Sans',
    fontWeight: 'bold',
    color: 'auto',
    strokeColor: '#ffffff',
    strokeWidth: 2,
    glowColor: '#000000',
    glowBlur: 0
  });

  const [placePreferredTitleGap] = useLocalStorage<number>('placePreferredTitleGap', 20);
  const [placeAllowOverlap] = useLocalStorage<boolean>('placeAllowOverlap', true);
  const [placeOptimizePositions] = useLocalStorage<boolean>('placeOptimizePositions', true);
  const [debugPositions] = useLocalStorage<boolean>('debugPlacePositions', false);

  const settings = useMemo<ExportSettings>(() => ({
    includePlaces,
    placeTitleSize,
    placeShowIconsGlobally,
    placeTextStyle,
    placePreferredTitleGap,
    placeAllowOverlap,
    placeOptimizePositions
  }), [includePlaces, placeTitleSize, placeShowIconsGlobally, placeTextStyle, placePreferredTitleGap, placeAllowOverlap, placeOptimizePositions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Position canvas over map
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.zIndex = '600'; // Above tracks
    canvas.style.pointerEvents = 'none'; // Allow clicking through to map

    // We attach to the map container to ensure it overlays correctly
    const container = map.getContainer();
    if (container && canvas.parentElement !== container) {
        container.appendChild(canvas);
    }

    return () => {
        if (container && canvas.parentElement === container) {
            container.removeChild(canvas);
        }
    };
  }, [map]);

  const render = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const size = map.getSize();

    // Resize canvas to match map size
    const dpr = window.devicePixelRatio || 1;

    if (canvas.width !== size.x * dpr || canvas.height !== size.y * dpr) {
        canvas.width = size.x * dpr;
        canvas.height = size.y * dpr;
        canvas.style.width = `${size.x}px`;
        canvas.style.height = `${size.y}px`;
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Handle resetTransform which might be missing in some environments (like JSDOM)
        if (typeof ctx.resetTransform === 'function') {
            ctx.resetTransform();
        } else if (typeof ctx.setTransform === 'function') {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (typeof ctx.scale === 'function') {
           ctx.scale(dpr, dpr);
        }

        // Recalculate positions if needed
        if (
          !positionsRef.current ||
          Math.abs(zoom - lastCalcZoomRef.current) > 0.05 ||
          places !== lastCalcPlacesRef.current ||
          settings !== lastCalcSettingsRef.current
        ) {
           positionsRef.current = calculateOptimalPositions(places, map, settings);

           lastCalcZoomRef.current = zoom;
           lastCalcPlacesRef.current = places;
           lastCalcSettingsRef.current = settings;
        }

        const results = await renderPlacesOnCanvas(canvas, places, bounds, zoom, settings, undefined, positionsRef.current, debugPositions);
        renderResultsRef.current = results;
    }
  };

  useMapEvents({
    click: (e) => {
        if (!onPlaceClick) return;
        const point = map.latLngToContainerPoint(e.latlng);

        const hitPlaceId = getPlaceAtPoint(point.x, point.y, renderResultsRef.current);

        if (hitPlaceId) {
            L.DomEvent.stopPropagation(e.originalEvent);
            onPlaceClick(hitPlaceId, { x: point.x, y: point.y });
        } else {
            onPlaceClick(null, { x: point.x, y: point.y });
        }
    },
    mousemove: (e) => {
        const point = map.latLngToContainerPoint(e.latlng);
        const hitPlaceId = getPlaceAtPoint(point.x, point.y, renderResultsRef.current);
        const container = map.getContainer();

        if (hitPlaceId) {
            container.style.cursor = 'pointer';
        } else {
            container.style.cursor = '';
        }
    }
  });

  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
        render();
    };

    const onEvent = () => {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(tick);
    };

    map.on('move', onEvent);
    map.on('zoom', onEvent);
    map.on('resize', onEvent);

    // Initial render
    tick();

    return () => {
      map.off('move', onEvent);
      map.off('zoom', onEvent);
      map.off('resize', onEvent);
      cancelAnimationFrame(animationFrameId);
    };
  }, [map, places, settings]);

  return <canvas ref={canvasRef} />;
};
