import { GeocodingProvider, GeocodingResult, ReverseGeocodingResult } from './geocoding/GeocodingProvider';
import { NominatimProvider } from './geocoding/NominatimProvider';

/**
 * Service to handle geocoding operations.
 * Allows switching between different providers.
 */
class GeocodingService {
  private provider: GeocodingProvider;
  private static instance: GeocodingService;

  private constructor() {
    this.provider = new NominatimProvider();
  }

  public static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  /**
   * Set a custom geocoding provider.
   * Useful for testing or switching services at runtime.
   */
  public setProvider(provider: GeocodingProvider) {
    this.provider = provider;
  }

  /**
   * Search for locations by query string.
   */
  public async searchPlaces(query: string): Promise<GeocodingResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      return await this.provider.search(query.trim());
    } catch (error) {
      console.error('Geocoding search failed:', error);
      return [];
    }
  }

  /**
   * Get the locality name for a set of coordinates.
   */
  public async getLocalityName(lat: number, lon: number): Promise<string> {
    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return 'Invalid Coordinates';
    }

    try {
      const result = await this.provider.reverse(lat, lon);
      return result.locality;
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return 'Unknown Location';
    }
  }
}

export const geocodingService = GeocodingService.getInstance();
export const getGeocodingService = () => GeocodingService.getInstance();
