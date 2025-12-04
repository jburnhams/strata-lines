import L from 'leaflet';
import { Place, ExportSettings, PositioningConstraints, PlaceTitlePosition, PlaceTitleBounds } from '@/types';
import { scoreBothPositions, selectBestPosition } from './positionScoring';
import { measureTextBounds, wrapText, titleBoundsToGeoBounds } from '@/utils/placeTextRenderer';
import { createCompatibleCanvas } from '@/utils/canvasUtils';
import { geoBoundsToPixelBounds } from '@/utils/positioningUtils';

// Shared context for measuring
let measureCtx: CanvasRenderingContext2D | null = null;
const getMeasureContext = () => {
  if (!measureCtx) {
    const canvas = createCompatibleCanvas(1, 1);
    measureCtx = canvas.getContext('2d');
  }
  return measureCtx!;
};

export const calculateOptimalPositions = (
  places: Place[],
  map: L.Map,
  settings: ExportSettings,
  constraints?: PositioningConstraints
): Map<string, PlaceTitlePosition> => {
  const result = new Map<string, PlaceTitlePosition>();
  const positionedBounds: PlaceTitleBounds[] = [];

  const activeConstraints: PositioningConstraints = {
    minDistance: 5,
    preferredGap: 20,
    ...constraints
  };

  if (activeConstraints.exportBounds && !activeConstraints.containerBounds) {
    activeConstraints.containerBounds = geoBoundsToPixelBounds(activeConstraints.exportBounds, map);
  }

  const ctx = getMeasureContext();

  // Prepare data
  const placesToPosition = places.map(place => {
    const textStyle = { ...settings.placeTextStyle, ...place.textStyle };
    const titleSizeScale = settings.placeTitleSize / 50;
    const fontSize = textStyle.fontSize * titleSizeScale;
    const maxTextWidth = 200 * titleSizeScale;
    const fontFamily = textStyle.fontFamily || 'Noto Sans';
    const fontWeight = textStyle.fontWeight || 'bold';

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const titleLines = wrapText(place.title, maxTextWidth, ctx);
    const { width, height } = measureTextBounds(titleLines, fontSize, fontFamily, ctx, fontWeight);

    return {
      place,
      width,
      height,
      area: width * height
    };
  });

  // Sort: Larger area first, then South to North, then West to East
  placesToPosition.sort((a, b) => {
    if (Math.abs(a.area - b.area) > 1) return b.area - a.area;
    if (a.place.latitude !== b.place.latitude) return a.place.latitude - b.place.latitude;
    return a.place.longitude - b.place.longitude;
  });

  // Position
  for (const item of placesToPosition) {
    const { place, width, height } = item;
    const latLng = L.latLng(place.latitude, place.longitude);
    const point = map.latLngToLayerPoint(latLng);

    const { left, right, leftBounds, rightBounds } = scoreBothPositions(
      place.id,
      point.x,
      point.y,
      width,
      height,
      positionedBounds,
      activeConstraints
    );

    const position = selectBestPosition(left, right);
    result.set(place.id, position);

    const chosenBounds = position === 'left' ? leftBounds : rightBounds;
    positionedBounds.push({
      placeId: place.id,
      position,
      bounds: chosenBounds,
      geoBounds: titleBoundsToGeoBounds(chosenBounds, map)
    });
  }

  return result;
};

export const refinePositions = (
  places: Place[],
  initialPositions: Map<string, PlaceTitlePosition>,
  map: L.Map,
  settings: ExportSettings,
  maxIterations: number = 3
): Map<string, PlaceTitlePosition> => {
  return initialPositions;
};

export const resolveConflicts = (
  titleBounds: PlaceTitleBounds[],
  constraints: PositioningConstraints
): PlaceTitleBounds[] => {
  return titleBounds;
};
