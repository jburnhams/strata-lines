import L from 'leaflet';
import { Place, ExportSettings, PositioningConstraints, PlaceTitlePosition, PlaceTitleBounds } from '@/types';
import { scoreAllPositions, selectBestPosition, scorePosition } from './positionScoring';
import { measureTextBounds, wrapText, titleBoundsToGeoBounds, calculateTitleBounds } from '@/utils/placeTextRenderer';
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

// Helper to get formatted text info
const getPlaceTextInfo = (place: Place, settings: ExportSettings, ctx: CanvasRenderingContext2D) => {
    const textStyle = { ...settings.placeTextStyle, ...place.textStyle };
    const titleSizeScale = settings.placeTitleSize / 50;
    const fontSize = textStyle.fontSize * titleSizeScale;
    const maxTextWidth = 200 * titleSizeScale;
    const fontFamily = textStyle.fontFamily || 'Noto Sans';
    const fontWeight = textStyle.fontWeight || 'bold';

    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const titleLines = wrapText(place.title, maxTextWidth, ctx);
    const { width, height } = measureTextBounds(titleLines, fontSize, fontFamily, ctx, fontWeight);

    return { titleLines, fontSize, width, height };
};

export const refinePositions = (
  places: Place[],
  initialPositions: Map<string, PlaceTitlePosition>,
  map: L.Map,
  settings: ExportSettings,
  maxIterations: number = 3,
  constraints?: PositioningConstraints
): Map<string, PlaceTitlePosition> => {
    const currentPositions = new Map(initialPositions);
    const ctx = getMeasureContext();
    const activeConstraints: PositioningConstraints = {
        minDistance: 5,
        preferredGap: 20,
        ...constraints
    };

    // Pre-calculate place info to avoid repeated calculations
    const placeInfos = places.map(place => {
       const { titleLines, fontSize } = getPlaceTextInfo(place, settings, ctx);
       const latLng = L.latLng(place.latitude, place.longitude);
       const point = map.latLngToLayerPoint(latLng);
       const iconSize = place.iconConfig?.size || 20;

       return {
           place,
           titleLines,
           fontSize,
           x: point.x,
           y: point.y,
           iconSize
       };
    });

    let improved = true;
    let iteration = 0;
    const allPositions: PlaceTitlePosition[] = ['right', 'left', 'top', 'bottom'];

    while (improved && iteration < maxIterations) {
        improved = false;
        iteration++;

        // Rebuild current bounds based on currentPositions
        const currentBounds: PlaceTitleBounds[] = placeInfos.map(info => {
             const pos = currentPositions.get(info.place.id) || 'right';
             const b = calculateTitleBounds(info.place, info.titleLines, info.fontSize, info.x, info.y, pos, 0, info.iconSize, 5);
             return {
                 placeId: info.place.id,
                 position: pos,
                 bounds: b,
                 geoBounds: titleBoundsToGeoBounds(b, map)
             };
        });

        for (const info of placeInfos) {
            const currentPos = currentPositions.get(info.place.id)!;
            const currentB = currentBounds.find(b => b.placeId === info.place.id)!.bounds;

            const otherBounds = currentBounds.filter(b => b.placeId !== info.place.id);
            const currentScore = scorePosition(currentB, currentPos, otherBounds, activeConstraints);

            let bestPos = currentPos;
            let bestScore = currentScore;
            let bestBounds = currentB;

            // Check all other positions
            for (const pos of allPositions) {
                if (pos === currentPos) continue;

                const b = calculateTitleBounds(info.place, info.titleLines, info.fontSize, info.x, info.y, pos, 0, info.iconSize, 5);
                const score = scorePosition(b, pos, otherBounds, activeConstraints);

                if (score > bestScore) {
                    bestScore = score;
                    bestPos = pos;
                    bestBounds = b;
                }
            }

            if (bestPos !== currentPos) {
                currentPositions.set(info.place.id, bestPos);

                // Update the bound in currentBounds immediately so next places see the updated state
                const idx = currentBounds.findIndex(b => b.placeId === info.place.id);
                if (idx !== -1) {
                    currentBounds[idx] = {
                        placeId: info.place.id,
                        position: bestPos,
                        bounds: bestBounds,
                        geoBounds: titleBoundsToGeoBounds(bestBounds, map)
                    };
                }

                improved = true;
            }
        }
    }

    return currentPositions;
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
    const { width, height } = getPlaceTextInfo(place, settings, ctx);

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

    const scores = scoreAllPositions(
      place.id,
      point.x,
      point.y,
      width,
      height,
      positionedBounds,
      activeConstraints
    );

    // Prefer 'right' if scores are similar
    const position = selectBestPosition(scores, 'right');
    result.set(place.id, position);

    const chosenBounds = scores[position].bounds;
    positionedBounds.push({
      placeId: place.id,
      position,
      bounds: chosenBounds,
      geoBounds: titleBoundsToGeoBounds(chosenBounds, map)
    });
  }

  if (settings.placeOptimizePositions) {
     const refined = refinePositions(places, result, map, settings, 3, activeConstraints);
     // Update result map
     refined.forEach((pos, id) => result.set(id, pos));
  }

  return result;
};

export const resolveConflicts = (
  titleBounds: PlaceTitleBounds[],
  constraints: PositioningConstraints
): PlaceTitleBounds[] => {
  // Currently, conflict resolution primarily relies on optimize/refine passes.
  // This function returns bounds as-is for now.
  return titleBounds;
};
