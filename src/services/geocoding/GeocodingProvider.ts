/**
 * Interface for geocoding service providers.
 * Allows swapping different geocoding services (Nominatim, Google, Mapbox)
 * without changing the consuming code.
 */
export interface GeocodingProvider {
  /**
   * Search for locations by query string.
   * @param query The search query (e.g., "Paris, France").
   * @returns A promise resolving to an array of geocoding results.
   */
  search(query: string): Promise<GeocodingResult[]>;

  /**
   * Reverse geocode coordinates to find a location name.
   * @param lat Latitude.
   * @param lon Longitude.
   * @returns A promise resolving to a reverse geocoding result.
   */
  reverse(lat: number, lon: number): Promise<ReverseGeocodingResult>;
}

/**
 * Result from a geocoding search operation.
 */
export interface GeocodingResult {
  /** Latitude in decimal degrees */
  latitude: number;
  /** Longitude in decimal degrees */
  longitude: number;
  /** Full formatted address or display name */
  displayName: string;
  /** City, town, or village name */
  locality: string;
  /** Country name */
  country: string;
  /** Bounding box of the location [south, north, west, east] */
  boundingBox?: number[];
}

/**
 * Result from a reverse geocoding operation.
 */
export interface ReverseGeocodingResult {
  /** Short recognizable name (city/town) */
  locality: string;
  /** Full address */
  displayName: string;
  /** Country name */
  country: string;
}
