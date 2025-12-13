import { Map, LatLngBounds } from 'leaflet';
import { PlaceTitlePosition } from '../types';

/**
 * Calculate Euclidean distance between two points
 */
const getPointDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Calculate minimum distance between two rectangles
 * Returns 0 if overlapping
 */
export const getDistance = (bounds1: DOMRect, bounds2: DOMRect): number => {
  // Check for overlap first
  if (hasOverlap(bounds1, bounds2)) {
    return 0;
  }

  // Calculate distances for 8 zones around the rectangle
  const left = bounds2.right < bounds1.left;
  const right = bounds1.right < bounds2.left;
  const bottom = bounds2.bottom < bounds1.top;
  const top = bounds1.bottom < bounds2.top;

  if (top && left) {
    return getPointDistance(bounds1.left, bounds1.bottom, bounds2.right, bounds2.top);
  }
  if (top && right) {
    return getPointDistance(bounds1.right, bounds1.bottom, bounds2.left, bounds2.top);
  }
  if (bottom && left) {
    return getPointDistance(bounds1.left, bounds1.top, bounds2.right, bounds2.bottom);
  }
  if (bottom && right) {
    return getPointDistance(bounds1.right, bounds1.top, bounds2.left, bounds2.bottom);
  }
  if (left) {
    return bounds1.left - bounds2.right;
  }
  if (right) {
    return bounds2.left - bounds1.right;
  }
  if (bottom) {
    return bounds1.top - bounds2.bottom;
  }
  if (top) {
    return bounds2.top - bounds1.bottom;
  }

  return 0; // Should not be reached given overlap check
};

/**
 * Check if rectangles overlap with optional buffer
 */
export const hasOverlap = (bounds1: DOMRect, bounds2: DOMRect, buffer: number = 0): boolean => {
  return !(
    bounds1.right + buffer <= bounds2.left - buffer ||
    bounds1.left - buffer >= bounds2.right + buffer ||
    bounds1.bottom + buffer <= bounds2.top - buffer ||
    bounds1.top - buffer >= bounds2.bottom + buffer
  );
};

/**
 * Calculate area of intersection between rectangles
 */
export const getOverlapArea = (bounds1: DOMRect, bounds2: DOMRect): number => {
  if (!hasOverlap(bounds1, bounds2)) {
    return 0;
  }

  const overlapLeft = Math.max(bounds1.left, bounds2.left);
  const overlapRight = Math.min(bounds1.right, bounds2.right);
  const overlapTop = Math.max(bounds1.top, bounds2.top);
  const overlapBottom = Math.min(bounds1.bottom, bounds2.bottom);

  const width = Math.max(0, overlapRight - overlapLeft);
  const height = Math.max(0, overlapBottom - overlapTop);

  return width * height;
};

/**
 * Check if title fully contained within container
 */
export const isWithinBounds = (titleBounds: DOMRect, containerBounds: DOMRect): boolean => {
  return (
    titleBounds.left >= containerBounds.left &&
    titleBounds.right <= containerBounds.right &&
    titleBounds.top >= containerBounds.top &&
    titleBounds.bottom <= containerBounds.bottom
  );
};

/**
 * Convert geographic bounds to screen pixel bounds
 */
export const geoBoundsToPixelBounds = (geoBounds: LatLngBounds, map: Map): DOMRect => {
  const nw = map.latLngToLayerPoint(geoBounds.getNorthWest());
  const se = map.latLngToLayerPoint(geoBounds.getSouthEast());

  const x = Math.min(nw.x, se.x);
  const y = Math.min(nw.y, se.y);
  const width = Math.abs(se.x - nw.x);
  const height = Math.abs(se.y - nw.y);

  // Use a DOMRect-like object or create a new DOMRect if available
  if (typeof DOMRect !== 'undefined') {
    return new DOMRect(x, y, width, height);
  }

  // Fallback for environments without DOMRect constructor
  return {
    x,
    y,
    width,
    height,
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    toJSON: () => ({ x, y, width, height, left: x, right: x + width, top: y, bottom: y + height })
  } as DOMRect;
};

/**
 * Convert pixel bounds back to geographic bounds
 */
export const pixelBoundsToGeoBounds = (pixelBounds: DOMRect, map: Map): LatLngBounds => {
  const nw = map.layerPointToLatLng([pixelBounds.left, pixelBounds.top]);
  const se = map.layerPointToLatLng([pixelBounds.right, pixelBounds.bottom]);
  return new LatLngBounds(nw, se);
};
