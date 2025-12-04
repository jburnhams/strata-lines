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
  constraints: PositioningConstraints
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

  return score;
};

export const scoreBothPositions = (
  placeId: string,
  iconX: number,
  iconY: number,
  titleWidth: number,
  titleHeight: number,
  existingBounds: PlaceTitleBounds[],
  constraints: PositioningConstraints
): { left: number, right: number, leftBounds: DOMRect, rightBounds: DOMRect } => {
  const y = iconY - titleHeight / 2;

  // Left Position
  const leftX = iconX - ICON_SIZE / 2 - ICON_GAP - titleWidth;
  const leftBounds = new DOMRect(leftX, y, titleWidth, titleHeight);
  const leftScore = scorePosition(leftBounds, 'left', existingBounds, constraints);

  // Right Position
  const rightX = iconX + ICON_SIZE / 2 + ICON_GAP;
  const rightBounds = new DOMRect(rightX, y, titleWidth, titleHeight);
  const rightScore = scorePosition(rightBounds, 'right', existingBounds, constraints);

  return {
    left: leftScore,
    right: rightScore,
    leftBounds,
    rightBounds
  };
};

export const selectBestPosition = (
  leftScore: number,
  rightScore: number,
  bias?: PlaceTitlePosition
): PlaceTitlePosition => {
  if (leftScore === rightScore) {
    return bias || 'right';
  }

  const diff = Math.abs(leftScore - rightScore);
  const maxScore = Math.max(Math.abs(leftScore), Math.abs(rightScore));

  if (maxScore > 0 && diff / maxScore < 0.1) {
    if (bias) return bias;
  }

  return leftScore > rightScore ? 'left' : 'right';
};
