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
  address: NominatimAddress;
  boundingbox?: string[];
}

export class NominatimProvider implements GeocodingProvider {
  private baseUrl: string;
  private userAgent: string;
  private lastRequestTime: number = 0;
  private requestQueue: Promise<void> = Promise.resolve();
  private readonly RATE_LIMIT_MS = 1000;

  constructor(
    baseUrl: string = 'https://nominatim.openstreetmap.org',
    userAgent: string = 'StrataLines/1.0 (https://github.com/jburnhams/strata-lines)'
  ) {
    this.baseUrl = baseUrl;
    this.userAgent = userAgent;
  }

  async search(query: string): Promise<GeocodingResult[]> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.append('q', query);
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('limit', '5');

    return this.scheduleRequest(async () => {
      const data = await this.fetchWithRetry<NominatimResponse[]>(url);
      return data.map((item) => ({
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        displayName: item.display_name,
        locality: this.extractLocality(item.address),
        country: item.address.country || '',
        boundingBox: item.boundingbox ? item.boundingbox.map(parseFloat) : undefined,
      }));
    });
  }

  async reverse(lat: number, lon: number): Promise<ReverseGeocodingResult> {
    const url = new URL(`${this.baseUrl}/reverse`);
    url.searchParams.append('lat', lat.toString());
    url.searchParams.append('lon', lon.toString());
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('zoom', '10');

    return this.scheduleRequest(async () => {
      const data = await this.fetchWithRetry<NominatimResponse>(url);
      return {
        locality: this.extractLocality(data.address),
        displayName: data.display_name,
        country: data.address.country || '',
      };
    });
  }

  private extractLocality(address: NominatimAddress): string {
    return (
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      address.state ||
      'Unnamed Location'
    );
  }

  private async scheduleRequest<T>(task: () => Promise<T>): Promise<T> {
    // Chain requests to ensure sequential execution
    const currentQueue = this.requestQueue;

    // Create a new promise for this task that waits for the previous one
    const nextTask = (async () => {
      try {
        await currentQueue;
      } catch {
        // Ignore errors from previous requests
      }

      // Enforce rate limit delay relative to last request time
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.RATE_LIMIT_MS - timeSinceLastRequest)
        );
      }

      this.lastRequestTime = Date.now();
      return task();
    })();

    // Update the queue pointer
    this.requestQueue = nextTask.then(() => {}).catch(() => {});

    return nextTask;
  }

  private async fetchWithRetry<T>(url: URL, retries = 3, backoff = 1000): Promise<T> {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      if (response.status === 429) {
        if (retries > 0) {
          console.warn(`Rate limit exceeded for ${url}, retrying in ${backoff}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          return this.fetchWithRetry(url, retries - 1, backoff * 2);
        }
        throw new Error('Rate limit exceeded');
      }

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.message === 'Rate limit exceeded') {
          throw error;
      }

      // Retry on network errors
      if (retries > 0 && error instanceof Error) {
          await new Promise((resolve) => setTimeout(resolve, backoff));
          return this.fetchWithRetry(url, retries - 1, backoff * 2);
      }
      throw error;
    }
  }
}
