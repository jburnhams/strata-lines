import React, { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import type { Place, ExportSettings, PlaceTextStyle } from '@/types';
import { renderPlacesOnCanvas } from '@/services/placeRenderingService';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export const PlaceCanvasOverlay: React.FC<{ places: Place[] }> = ({ places }) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const settings = useMemo<ExportSettings>(() => ({
    includePlaces,
    placeTitleSize,
    placeShowIconsGlobally,
    placeTextStyle
  }), [includePlaces, placeTitleSize, placeShowIconsGlobally, placeTextStyle]);

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
        ctx.resetTransform();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(dpr, dpr);

        await renderPlacesOnCanvas(canvas, places, bounds, zoom, settings);
    }
  };

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
