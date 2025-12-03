export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  locality: string;      // City/town name
  country: string;
  boundingBox?: number[]; // [south, north, west, east]
}

export interface ReverseGeocodingResult {
  locality: string;      // Short recognizable name
  displayName: string;   // Full address
  country: string;
}

export interface GeocodingProvider {
  /**
   * Search for locations matching the query string
   * @param query The search term
   */
  search(query: string): Promise<GeocodingResult[]>;

  /**
   * Find the address for a given coordinate
   * @param lat Latitude
   * @param lon Longitude
   */
  reverse(lat: number, lon: number): Promise<ReverseGeocodingResult>;
}
