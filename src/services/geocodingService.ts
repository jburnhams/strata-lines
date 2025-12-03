import { GeocodingProvider, GeocodingResult } from './geocoding/GeocodingProvider';
import { NominatimProvider } from './geocoding/NominatimProvider';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class GeocodingService {
  private provider: GeocodingProvider;
  private static instance: GeocodingService;

  private searchCache: Map<string, CacheEntry<GeocodingResult[]>>;
  private reverseCache: Map<string, CacheEntry<string>>;

  private readonly MAX_CACHE_SIZE = 100;
  private readonly SEARCH_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly REVERSE_TTL = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    this.provider = new NominatimProvider();
    this.searchCache = new Map();
    this.reverseCache = new Map();
  }

  public static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  public setProvider(provider: GeocodingProvider): void {
    this.provider = provider;
    this.clearCache();
  }

  private clearCache(): void {
    this.searchCache.clear();
    this.reverseCache.clear();
  }

  private getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string, ttl: number): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > ttl) {
      cache.delete(key);
      return null;
    }

    // Refresh LRU order by deleting and re-setting
    cache.delete(key);
    cache.set(key, entry);

    return entry.data;
  }

  private addToCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
    if (cache.has(key)) {
       // If updating existing, remove old first to update insertion order
       cache.delete(key);
    } else if (cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entry (first item in Map iterator)
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(key, { data, timestamp: Date.now() });
  }

  public async searchPlaces(query: string): Promise<GeocodingResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    // Check cache
    const cachedResult = this.getFromCache(this.searchCache, trimmedQuery, this.SEARCH_TTL);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      const results = await this.provider.search(trimmedQuery);
      this.addToCache(this.searchCache, trimmedQuery, results);
      return results;
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  public async getLocalityName(lat: number, lon: number): Promise<string> {
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return 'Invalid Coordinates';
    }

    // Round coordinates to 3 decimal places for caching
    // 0.001 degrees is approximately 111 meters
    const roundedLat = Number(lat.toFixed(3));
    const roundedLon = Number(lon.toFixed(3));
    const cacheKey = `${roundedLat},${roundedLon}`;

    // Check cache
    const cachedResult = this.getFromCache(this.reverseCache, cacheKey, this.REVERSE_TTL);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      const result = await this.provider.reverse(lat, lon);
      const locality = result.locality;
      this.addToCache(this.reverseCache, cacheKey, locality);
      return locality;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return 'Unnamed Location';
    }
  }
}

export const getGeocodingService = () => GeocodingService.getInstance();
