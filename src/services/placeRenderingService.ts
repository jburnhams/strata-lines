import L from 'leaflet';
import type { Place, ExportSettings, PlaceTitlePosition } from '@/types';
import { renderIcon } from '@/utils/placeIconRenderer';
import { wrapText, measureTextBounds, renderTextWithEffects, getAutoTextColor } from '@/utils/placeTextRenderer';
import { calculateOptimalPositions } from '@/services/titlePositioningService';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlaceRenderResult {
  iconBounds?: Rect;
  textBounds?: Rect;
  totalBounds: Rect;
}

export const getVisiblePlaces = (places: Place[], bounds: L.LatLngBounds, padding = 0): Place[] => {
  const margin = 0.05; // approx 5km buffer
  return places.filter(p =>
    p.isVisible &&
    p.latitude <= bounds.getNorth() + margin &&
    p.latitude >= bounds.getSouth() - margin &&
    p.longitude <= bounds.getEast() + margin &&
    p.longitude >= bounds.getWest() - margin
  );
};

export const renderPlace = async (
  ctx: CanvasRenderingContext2D,
  place: Place,
  x: number,
  y: number,
  settings: ExportSettings,
  zoom: number,
  tileLayerUrl?: string,
  position: PlaceTitlePosition = 'right'
): Promise<PlaceRenderResult> => {
  const result: PlaceRenderResult = {
    totalBounds: { x, y, width: 0, height: 0 }
  };

  // Icon settings
  const showIcon = settings.placeShowIconsGlobally && place.showIcon;
  const iconConfig = place.iconConfig || {
    style: place.iconStyle || 'pin',
    size: 24,
    color: '#ef4444'
  };

  // Text settings
  const textStyle = { ...settings.placeTextStyle, ...place.textStyle };
  const titleSizeScale = settings.placeTitleSize / 50;
  const fontSize = textStyle.fontSize * titleSizeScale;

  if (showIcon) {
    renderIcon(ctx, iconConfig.style, x, y, iconConfig.size, iconConfig.color);
    result.iconBounds = {
      x: x - iconConfig.size/2,
      y: y - iconConfig.size,
      width: iconConfig.size,
      height: iconConfig.size
    };
  }

  if (place.title) {
    if (textStyle.color === 'auto' && tileLayerUrl) {
      textStyle.color = await getAutoTextColor(place.latitude, place.longitude, zoom, tileLayerUrl);
    }

    const gap = 5 * titleSizeScale;
    const iconHalfSize = showIcon ? iconConfig.size / 2 : 0;

    // Vertical center of icon
    const textY = showIcon ? y - iconConfig.size * 0.5 : y;

    let textX = x;
    if (position === 'left') {
      textX = x - iconHalfSize - gap;
      ctx.textAlign = 'right';
    } else {
      textX = x + iconHalfSize + gap;
      ctx.textAlign = 'left';
    }

    const maxTextWidth = 200 * titleSizeScale;
    const lines = wrapText(place.title, maxTextWidth, ctx);

    const bounds = measureTextBounds(lines, fontSize, textStyle.fontFamily, ctx);

    // Center text vertically relative to textY
    const totalHeight = bounds.height;
    const topY = textY - totalHeight / 2 + fontSize; // approximate top baseline

    const effectiveStyle = { ...textStyle, fontSize };

    ctx.textBaseline = 'alphabetic';

    renderTextWithEffects(ctx, lines, textX, topY, effectiveStyle);

    // Calculate bounds for result based on alignment
    let boundsX = textX;
    if (position === 'left') {
      boundsX = textX - bounds.width;
    }

    result.textBounds = {
      x: boundsX,
      y: topY - fontSize,
      width: bounds.width,
      height: bounds.height
    };
  }

  return result;
};

export const renderPlacesOnCanvas = async (
  canvas: HTMLCanvasElement,
  places: Place[],
  bounds: L.LatLngBounds,
  zoom: number,
  settings: ExportSettings,
  tileLayerUrl?: string,
  cachedPositions?: Map<string, PlaceTitlePosition>
): Promise<void> => {
  if (!settings.includePlaces) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const visiblePlaces = getVisiblePlaces(places, bounds);

  const nwPoint = L.CRS.EPSG3857.latLngToPoint(bounds.getNorthWest(), zoom);

  let positions = cachedPositions;

  if (!positions) {
    // Mock map adapter for positioning service
    const mapAdapter = {
      latLngToLayerPoint: (latLng: L.LatLngExpression) => {
        const point = L.CRS.EPSG3857.latLngToPoint(latLng as L.LatLng, zoom);
        return L.point(Math.round(point.x - nwPoint.x), Math.round(point.y - nwPoint.y));
      },
      layerPointToLatLng: (point: L.PointExpression) => {
        const p = point as L.Point;
        const absPoint = L.point(p.x + nwPoint.x, p.y + nwPoint.y);
        return L.CRS.EPSG3857.pointToLatLng(absPoint, zoom);
      }
    } as unknown as L.Map;

    positions = calculateOptimalPositions(visiblePlaces, mapAdapter, settings);
  }

  // Sort descending latitude (North first) so South overlaps North
  visiblePlaces.sort((a, b) => b.latitude - a.latitude);

  for (const place of visiblePlaces) {
    const point = L.CRS.EPSG3857.latLngToPoint(L.latLng(place.latitude, place.longitude), zoom);

    const x = Math.round(point.x - nwPoint.x);
    const y = Math.round(point.y - nwPoint.y);
    const position = positions?.get(place.id) || 'right';

    await renderPlace(ctx, place, x, y, settings, zoom, tileLayerUrl, position);
  }
};
