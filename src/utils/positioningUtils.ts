import L from 'leaflet';

/**
 * Calculate minimum distance between two rectangles.
 * Returns 0 if overlapping.
 * Returns edge-to-edge distance if not overlapping.
 * Uses Euclidean distance for diagonal cases.
 */
export const getDistance = (bounds1: DOMRect, bounds2: DOMRect): number => {
  const xOverlap = bounds1.right >= bounds2.left && bounds1.left <= bounds2.right;
  const yOverlap = bounds1.bottom >= bounds2.top && bounds1.top <= bounds2.bottom;

  if (xOverlap && yOverlap) {
    return 0;
  }

  if (xOverlap) {
    if (bounds1.bottom < bounds2.top) return bounds2.top - bounds1.bottom;
    if (bounds1.top > bounds2.bottom) return bounds1.top - bounds2.bottom;
  }

  if (yOverlap) {
    if (bounds1.right < bounds2.left) return bounds2.left - bounds1.right;
    if (bounds1.left > bounds2.right) return bounds1.left - bounds2.right;
  }

  // Diagonal case
  let dx = 0;
  let dy = 0;

  if (bounds1.right < bounds2.left) dx = bounds2.left - bounds1.right;
  else if (bounds1.left > bounds2.right) dx = bounds1.left - bounds2.right;

  if (bounds1.bottom < bounds2.top) dy = bounds2.top - bounds1.bottom;
  else if (bounds1.top > bounds2.bottom) dy = bounds1.top - bounds2.bottom;

  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Check if rectangles overlap with optional buffer.
 * Buffer adds padding around rectangles.
 * Returns true if any overlap exists.
 */
export const hasOverlap = (bounds1: DOMRect, bounds2: DOMRect, buffer: number = 0): boolean => {
  return !(
    bounds1.right + buffer < bounds2.left - buffer ||
    bounds1.left - buffer > bounds2.right + buffer ||
    bounds1.bottom + buffer < bounds2.top - buffer ||
    bounds1.top - buffer > bounds2.bottom + buffer
  );
};

/**
 * Check if title is fully contained within container.
 * Returns true if completely inside.
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
 * Convert geographic bounds to screen pixel bounds using Leaflet map projection.
 */
export const geoBoundsToPixelBounds = (geoBounds: L.LatLngBounds, map: L.Map): DOMRect => {
  const nw = map.latLngToLayerPoint(geoBounds.getNorthWest());
  const se = map.latLngToLayerPoint(geoBounds.getSouthEast());

  // Leaflet layer points: x increases to right, y increases to bottom
  const x = Math.min(nw.x, se.x);
  const y = Math.min(nw.y, se.y);
  const width = Math.abs(se.x - nw.x);
  const height = Math.abs(se.y - nw.y);

  return new DOMRect(x, y, width, height);
};

/**
 * Calculate area of intersection between rectangles.
 * Returns 0 if no overlap.
 */
export const getOverlapArea = (bounds1: DOMRect, bounds2: DOMRect): number => {
  const xOverlap = Math.max(0, Math.min(bounds1.right, bounds2.right) - Math.max(bounds1.left, bounds2.left));
  const yOverlap = Math.max(0, Math.min(bounds1.bottom, bounds2.bottom) - Math.max(bounds1.top, bounds2.top));

  return xOverlap * yOverlap;
};
