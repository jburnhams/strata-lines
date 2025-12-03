import { GeocodingProvider, GeocodingResult } from './geocoding/GeocodingProvider';
import { NominatimProvider } from './geocoding/NominatimProvider';

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

  public setProvider(provider: GeocodingProvider): void {
    this.provider = provider;
  }

  public async searchPlaces(query: string): Promise<GeocodingResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    try {
      return await this.provider.search(trimmedQuery);
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  public async getLocalityName(lat: number, lon: number): Promise<string> {
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return 'Invalid Coordinates';
    }

    try {
      const result = await this.provider.reverse(lat, lon);
      return result.locality;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return 'Unnamed Location';
    }
  }
}

export const getGeocodingService = () => GeocodingService.getInstance();
