import L from 'leaflet';
import type { LatLngBounds } from 'leaflet';

/**
 * Convert meters to miles
 */
export const metersToMiles = (meters: number): number => meters * 0.000621371;

/**
 * Calculate the width and height of geographic bounds in miles
 *
 * @param bounds - The lat/lng bounds to measure
 * @returns Object with width and height in miles
 */
export const calculateBoundsDimensions = (
  bounds: LatLngBounds
): { width: number; height: number } => {
  const center = bounds.getCenter();
  const west = bounds.getWest();
  const east = bounds.getEast();
  const north = bounds.getNorth();
  const south = bounds.getSouth();

  const westPoint = L.latLng(center.lat, west);
  const eastPoint = L.latLng(center.lat, east);
  const northPoint = L.latLng(north, center.lng);
  const southPoint = L.latLng(south, center.lng);

  const widthMeters = westPoint.distanceTo(eastPoint);
  const heightMeters = northPoint.distanceTo(southPoint);

  return {
    width: metersToMiles(widthMeters),
    height: metersToMiles(heightMeters),
  };
};

/**
 * Calculate the pixel dimensions of geographic bounds at a given zoom level
 *
 * This creates a temporary map to project lat/lng coordinates to pixel coordinates,
 * allowing us to determine how large an area will be when rendered at a specific zoom level.
 *
 * @param bounds - The lat/lng bounds to measure
 * @param zoom - The zoom level to calculate dimensions for
 * @returns Object with width and height in pixels
 */
export const calculatePixelDimensions = (
  bounds: L.LatLngBounds,
  zoom: number
): { width: number; height: number } => {
  let tempMap: L.Map | null = null;
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  tempContainer.style.width = '1px';
  tempContainer.style.height = '1px';
  document.body.appendChild(tempContainer);

  try {
    tempMap = L.map(tempContainer, { center: [0, 0], zoom: 0 });
    const northWestPoint = tempMap.project(bounds.getNorthWest(), zoom);
    const southEastPoint = tempMap.project(bounds.getSouthEast(), zoom);

    return {
      width: Math.round(southEastPoint.x - northWestPoint.x),
      height: Math.round(southEastPoint.y - northWestPoint.y),
    };
  } finally {
    if (tempMap) tempMap.remove();
    document.body.removeChild(tempContainer);
  }
};
