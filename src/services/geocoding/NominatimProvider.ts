import { GeocodingProvider, GeocodingResult, ReverseGeocodingResult } from './GeocodingProvider';

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
}

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
  boundingbox?: string[];
}

export class NominatimProvider implements GeocodingProvider {
  private baseUrl: string;
  private userAgent: string;
  private requestQueue: Promise<any> = Promise.resolve();
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 1100; // 1.1s to be safe

  constructor(
    baseUrl: string = 'https://nominatim.openstreetmap.org',
    userAgent: string = 'StrataLines/1.0 (https://github.com/jburnhams/strata-lines)'
  ) {
    this.baseUrl = baseUrl;
    this.userAgent = userAgent;
  }

  async search(query: string): Promise<GeocodingResult[]> {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5'
    });

    try {
      const data = await this.enqueueRequest<NominatimResponse[]>(`${this.baseUrl}/search?${params}`);
      return data.map(item => this.transformResult(item));
    } catch (error) {
      console.error('Nominatim search failed:', error);
      throw error;
    }
  }

  async reverse(lat: number, lon: number): Promise<ReverseGeocodingResult> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      addressdetails: '1',
      zoom: '10'
    });

    try {
      const data = await this.enqueueRequest<NominatimResponse>(`${this.baseUrl}/reverse?${params}`);
      return this.transformReverseResult(data);
    } catch (error) {
      console.error('Nominatim reverse failed:', error);
      throw error;
    }
  }

  private transformResult(item: NominatimResponse): GeocodingResult {
    return {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      displayName: item.display_name,
      locality: this.extractLocality(item.address),
      country: item.address?.country || 'Unknown',
      boundingBox: item.boundingbox ? item.boundingbox.map(parseFloat) : undefined
    };
  }

  private transformReverseResult(item: NominatimResponse): ReverseGeocodingResult {
    return {
      locality: this.extractLocality(item.address),
      displayName: item.display_name,
      country: item.address?.country || 'Unknown'
    };
  }

  private extractLocality(address?: NominatimAddress): string {
    if (!address) return 'Unknown Location';
    return address.city || address.town || address.village || address.county || address.state || 'Unknown Location';
  }

  private async performRequest<T>(url: string, retries: number): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent }
      });

      if (!response.ok) {
        if (response.status === 429 && retries > 0) {
          console.warn(`Nominatim rate limit exceeded, retrying... (${retries} attempts left)`);
          const backoff = (4 - retries) * 2000;
          await new Promise(r => setTimeout(r, backoff));
          return this.performRequest<T>(url, retries - 1);
        }
        throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  private async enqueueRequest<T>(url: string, retries = 3): Promise<T> {
    const task = async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
        await new Promise(r => setTimeout(r, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }

      this.lastRequestTime = Date.now();

      return this.performRequest<T>(url, retries);
    };

    const resultPromise = this.requestQueue.catch(() => {}).then(task);
    this.requestQueue = resultPromise;
    return resultPromise as Promise<T>;
  }
}
