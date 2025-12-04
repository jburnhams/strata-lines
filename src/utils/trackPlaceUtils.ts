import L from 'leaflet';
import type { Track, Point, Place } from '@/types';

/**
 * Linear interpolation between two points.
 * fraction: 0 = point1, 1 = point2, 0.5 = midpoint
 */
export const interpolatePoint = (point1: Point, point2: Point, fraction: number): Point => {
  const lat = point1[0] + (point2[0] - point1[0]) * fraction;
  const lng = point1[1] + (point2[1] - point1[1]) * fraction;
  return [lat, lng];
};

/**
 * Calculate total track distance in kilometers.
 */
export const calculateTotalTrackDistance = (track: Track): number => {
  if (track.length > 0) return track.length;

  let totalDist = 0;
  for (let i = 0; i < track.points.length - 1; i++) {
    const p1 = L.latLng(track.points[i]);
    const p2 = L.latLng(track.points[i + 1]);
    totalDist += p1.distanceTo(p2);
  }
  return totalDist / 1000;
};

/**
 * Find point at a specific distance along the track (in km).
 */
export const findPointAtDistance = (track: Track, targetDistKm: number): Point | null => {
  if (!track.points || track.points.length === 0) return null;
  if (targetDistKm <= 0) return track.points[0];

  let currentDist = 0;
  const targetDistMeters = targetDistKm * 1000;

  for (let i = 0; i < track.points.length - 1; i++) {
    const p1 = L.latLng(track.points[i]);
    const p2 = L.latLng(track.points[i + 1]);
    const segmentDist = p1.distanceTo(p2);

    if (currentDist + segmentDist >= targetDistMeters) {
      const remaining = targetDistMeters - currentDist;
      const fraction = remaining / segmentDist;
      return interpolatePoint(track.points[i], track.points[i + 1], fraction);
    }

    currentDist += segmentDist;
  }

  return track.points[track.points.length - 1];
};

/**
 * Find the exact middle point of the track (by distance).
 */
export const findTrackMiddlePoint = (track: Track): Point => {
  const totalDist = calculateTotalTrackDistance(track);
  const midDist = totalDist / 2;
  const point = findPointAtDistance(track, midDist);
  return point || track.points[0];
};

/**
 * Find an optimal middle point that avoids existing places.
 * Scans the middle third of the track.
 */
export const findOptimalMiddlePoint = (track: Track, existingPlaces: Place[]): Point => {
  if (existingPlaces.length === 0) {
    return findTrackMiddlePoint(track);
  }

  const totalDist = calculateTotalTrackDistance(track);
  const startSearch = totalDist * 0.33;
  const endSearch = totalDist * 0.66;
  const range = endSearch - startSearch;

  const numSamples = 10;
  const step = range / (numSamples - 1);

  let bestPoint: Point | null = null;
  let maxMinDist = -1;

  for (let i = 0; i < numSamples; i++) {
    const dist = startSearch + i * step;
    const candidate = findPointAtDistance(track, dist);

    if (candidate) {
      let minDistToPlace = Infinity;
      const candidateLatLng = L.latLng(candidate);

      for (const place of existingPlaces) {
        const placeLatLng = L.latLng(place.latitude, place.longitude);
        const d = candidateLatLng.distanceTo(placeLatLng);
        if (d < minDistToPlace) {
          minDistToPlace = d;
        }
      }

      if (minDistToPlace > maxMinDist) {
        maxMinDist = minDistToPlace;
        bestPoint = candidate;
      }
    }
  }

  return bestPoint || findTrackMiddlePoint(track);
};
