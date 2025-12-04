import {
  PlaceTitlePosition,
  PlaceTitleBounds,
  PositioningConstraints
} from '@/types';
import {
  getDistance,
  hasOverlap,
  getOverlapArea,
  isWithinBounds
} from '@/utils/positioningUtils';

// Constants
const ICON_SIZE = 20;
const ICON_GAP = 5;

/**
 * Score a potential title position.
 * Higher score = better position.
 */
export const scorePosition = (
  titleBounds: DOMRect,
  position: PlaceTitlePosition,
  existingBounds: PlaceTitleBounds[],
  constraints: PositioningConstraints,
  ignoreId?: string
): number => {
  let score = 0;

  // 1. Within export bounds bonus
  if (constraints.containerBounds) {
    if (isWithinBounds(titleBounds, constraints.containerBounds)) {
      score += 1000;
    }
  }

  // 2. Distance to nearest neighbor
  let minDistanceToNeighbor = Infinity;
  let overlapCount = 0;
  let totalOverlapArea = 0;

  for (const existing of existingBounds) {
    if (ignoreId && existing.placeId === ignoreId) continue;

    if (hasOverlap(titleBounds, existing.bounds, 0)) {
      overlapCount++;
      totalOverlapArea += getOverlapArea(titleBounds, existing.bounds);
    } else {
      const dist = getDistance(titleBounds, existing.bounds);
      if (dist < minDistanceToNeighbor) {
        minDistanceToNeighbor = dist;
      }
    }
  }

  if (minDistanceToNeighbor === Infinity) {
    minDistanceToNeighbor = constraints.preferredGap;
  }

  const effectiveDistance = Math.min(minDistanceToNeighbor, constraints.preferredGap);
  score += effectiveDistance * 10;

  // Overlap penalty
  score -= overlapCount * 1000;
  score -= totalOverlapArea * 10;

  // Prefer Right/Left over Top/Bottom slightly?
  // Maybe not, unless specified.

  return score;
};

export const scoreAllPositions = (
  placeId: string,
  iconX: number,
  iconY: number, // Assumed to be bottom-center of icon
  titleWidth: number,
  titleHeight: number,
  existingBounds: PlaceTitleBounds[],
  constraints: PositioningConstraints
): Record<PlaceTitlePosition, { score: number, bounds: DOMRect }> => {
  // Center of icon for Left/Right alignment
  const iconCenterY = iconY - ICON_SIZE / 2;
  const iconTopY = iconY - ICON_SIZE;
  const iconBottomY = iconY; // Point is usually bottom

  const positions: PlaceTitlePosition[] = ['left', 'right', 'top', 'bottom'];
  const result: Partial<Record<PlaceTitlePosition, { score: number, bounds: DOMRect }>> = {};

  positions.forEach(pos => {
      let x = 0;
      let y = 0;

      if (pos === 'left') {
          // Centered vertically relative to icon center
          y = iconCenterY - titleHeight / 2;
          x = iconX - ICON_SIZE / 2 - ICON_GAP - titleWidth;
      } else if (pos === 'right') {
          // Centered vertically relative to icon center
          y = iconCenterY - titleHeight / 2;
          x = iconX + ICON_SIZE / 2 + ICON_GAP;
      } else if (pos === 'top') {
          // Centered horizontally
          x = iconX - titleWidth / 2;
          // Bottom of text at iconTop - Gap
          y = iconTopY - ICON_GAP - titleHeight;
      } else if (pos === 'bottom') {
          // Centered horizontally
          x = iconX - titleWidth / 2;
          // Top of text at iconBottom + Gap
          y = iconBottomY + ICON_GAP;
      }

      const bounds = new DOMRect(x, y, titleWidth, titleHeight);
      const score = scorePosition(bounds, pos, existingBounds, constraints);
      result[pos] = { score, bounds };
  });

  return result as Record<PlaceTitlePosition, { score: number, bounds: DOMRect }>;
};

export const selectBestPosition = (
  scores: Record<PlaceTitlePosition, { score: number, bounds: DOMRect }>,
  bias?: PlaceTitlePosition
): PlaceTitlePosition => {
  const positions = Object.keys(scores) as PlaceTitlePosition[];

  // Sort by score descending
  positions.sort((a, b) => scores[b].score - scores[a].score);

  const best = positions[0];
  const bestScore = scores[best].score;

  // If bias is provided and is within margin of best, prefer bias
  if (bias) {
      const biasScore = scores[bias].score;
      const diff = Math.abs(bestScore - biasScore);
      // If bestScore is 0 (unlikely with penalties), handle gracefully
      const denominator = Math.max(Math.abs(bestScore), 1);

      if (diff / denominator < 0.1) {
          return bias;
      }
  }

  return best;
};
