/**
 * Interface for geocoding service providers.
 */
export interface GeocodingProvider {
  /**
   * Search for locations matching the query.
   * @param query The search query string.
   * @returns A promise resolving to an array of geocoding results.
   */
  search(query: string): Promise<GeocodingResult[]>;

  /**
   * Reverse geocode coordinates to find a location.
   * @param lat Latitude.
   * @param lon Longitude.
   * @returns A promise resolving to a reverse geocoding result.
   */
  reverse(lat: number, lon: number): Promise<ReverseGeocodingResult>;
}

/**
 * Result from a geocoding search.
 */
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  locality: string; // City/town name
  country: string;
  boundingBox?: number[]; // [south, north, west, east]
}

/**
 * Result from a reverse geocoding request.
 */
export interface ReverseGeocodingResult {
  locality: string; // Short recognizable name
  displayName: string; // Full address
  country: string;
}
