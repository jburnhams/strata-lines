import { Place, PlaceBounds } from '../types';

/**
 * Generates a unique ID for a place.
 * Uses crypto.randomUUID() if available, otherwise falls back to a timestamp-based ID.
 * @returns {string} A unique identifier.
 */
export const generatePlaceId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments where crypto.randomUUID is not available (e.g., older browsers, some test environments)
  return `place-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Creates a new Place object with default values.
 * @param {Partial<Place>} partial - Partial place data to override defaults.
 * @returns {Place} A fully initialized Place object.
 */
export const createPlace = (partial: Partial<Place> = {}): Place => {
  return {
    id: generatePlaceId(),
    latitude: 0,
    longitude: 0,
    title: 'New Place',
    createdAt: Date.now(),
    source: 'manual',
    isVisible: true,
    showIcon: true,
    iconStyle: 'pin',
    ...partial,
  };
};

/**
 * Calculates the bounding box for a list of places.
 * @param {Place[]} places - The list of places to include in the bounds.
 * @returns {PlaceBounds | null} The bounding box, or null if the list is empty.
 */
export const calculatePlaceBounds = (places: Place[]): PlaceBounds | null => {
  if (!places || places.length === 0) {
    return null;
  }

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const place of places) {
    if (place.latitude > north) north = place.latitude;
    if (place.latitude < south) south = place.latitude;
    if (place.longitude > east) east = place.longitude;
    if (place.longitude < west) west = place.longitude;
  }

  return { north, south, east, west };
};
