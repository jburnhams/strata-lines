import { GeocodingProvider, GeocodingResult } from './geocoding/GeocodingProvider';
import { NominatimProvider } from './geocoding/NominatimProvider';

class GeocodingService {
  private provider: GeocodingProvider;
  private searchCache: Map<string, GeocodingResult[]> = new Map();
  // Using a string key "lat,lon" for reverse cache
  private reverseCache: Map<string, string> = new Map();

  constructor(provider?: GeocodingProvider) {
    this.provider = provider || new NominatimProvider();
  }

  setProvider(provider: GeocodingProvider): void {
    this.provider = provider;
    this.searchCache.clear();
    this.reverseCache.clear();
  }

  async searchPlaces(query: string): Promise<GeocodingResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    if (this.searchCache.has(trimmedQuery)) {
      return this.searchCache.get(trimmedQuery)!;
    }

    try {
      const results = await this.provider.search(trimmedQuery);
      this.searchCache.set(trimmedQuery, results);
      return results;
    } catch (error) {
      console.error('Geocoding search failed:', error);
      return [];
    }
  }

  async getLocalityName(lat: number, lon: number): Promise<string> {
    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return 'Invalid Location';
    }

    // Round to 3 decimal places for caching (~100m)
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;

    if (this.reverseCache.has(key)) {
      return this.reverseCache.get(key)!;
    }

    try {
      const result = await this.provider.reverse(lat, lon);
      const locality = result.locality;
      this.reverseCache.set(key, locality);
      return locality;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return 'Unnamed Location';
    }
  }
}

export const geocodingService = new GeocodingService();
export default geocodingService;
