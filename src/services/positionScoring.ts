
import { PlaceTitleBounds, PlaceTitlePosition, PositioningConstraints } from '@/types';
import { getDistance, getOverlapArea, isWithinBounds } from '@/utils/positioningUtils';

// Scoring configuration
const SCORES = {
  WITHIN_BOUNDS_BONUS: 1000,
  DISTANCE_SCORE_FACTOR: 10,
  OVERLAP_PENALTY: 1000,
  OVERLAP_AREA_PENALTY: 10
};

/**
 * Calculate score for a potential title position
 * Higher score = better position
 */
export const scorePosition = (
  titleBounds: DOMRect,
  position: PlaceTitlePosition,
  existingBounds: PlaceTitleBounds[],
  constraints: PositioningConstraints,
  ignoreId?: string // Optional placeId to ignore (for self-comparison optimization)
): number => {
  let score = 0;

  // 1. Export bounds constraint
  if (constraints.containerBounds) {
    if (isWithinBounds(titleBounds, constraints.containerBounds)) {
      score += SCORES.WITHIN_BOUNDS_BONUS;
    }
  }

  // 2. Overlap and Distance to other titles
  for (const existing of existingBounds) {
    if (ignoreId && existing.placeId === ignoreId) continue;

    // Check for overlap
    const overlapArea = getOverlapArea(titleBounds, existing.bounds);
    if (overlapArea > 0) {
      score -= SCORES.OVERLAP_PENALTY;
      score -= overlapArea * SCORES.OVERLAP_AREA_PENALTY;
    } else {
      // Reward distance up to preferred gap
      const distance = getDistance(titleBounds, existing.bounds);
      if (distance < constraints.preferredGap) {
        // Linear drop-off from 0 to preferredGap
        // Closer items (but not overlapping) get less points than those at preferred gap
        // Actually we want to MAXIMIZE distance up to preferred gap
        // So distance 0 (touching) = 0 points
        // Distance preferredGap = max points
        score += distance * SCORES.DISTANCE_SCORE_FACTOR;
      } else {
        // Maximum distance bonus
        score += constraints.preferredGap * SCORES.DISTANCE_SCORE_FACTOR;
      }
    }
  }

  return score;
};

/**
 * Helper to calculate scores for both left and right positions
 * Requires calculating the potential bounds for each position first
 */
export const scoreBothPositions = (
  leftBounds: DOMRect,
  rightBounds: DOMRect,
  existingBounds: PlaceTitleBounds[],
  constraints: PositioningConstraints
): { left: number; right: number } => {
  const leftScore = scorePosition(leftBounds, 'left', existingBounds, constraints);
  const rightScore = scorePosition(rightBounds, 'right', existingBounds, constraints);

  return { left: leftScore, right: rightScore };
};

/**
 * Select the best position based on scores
 * Applies a bias if scores are close
 */
export const selectBestPosition = (
  leftScore: number,
  rightScore: number,
  bias: PlaceTitlePosition = 'right'
): PlaceTitlePosition => {
  if (leftScore === rightScore) {
    return bias;
  }

  // If scores are within 10% of the range, use bias to prevent flipping
  // But here scores can be negative, so percentage is tricky.
  // Let's use a simpler heuristic: if difference is small compared to penalty.
  const diff = Math.abs(leftScore - rightScore);
  const significantDiff = 100; // Arbitrary threshold, less than one overlap penalty

  if (diff < significantDiff) {
    // Scores are close
    if (bias === 'left' && leftScore >= rightScore - significantDiff) return 'left';
    if (bias === 'right' && rightScore >= leftScore - significantDiff) return 'right';
  }

  return leftScore > rightScore ? 'left' : 'right';
};
