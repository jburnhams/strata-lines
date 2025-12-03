import { GeocodingProvider, GeocodingResult, ReverseGeocodingResult } from './GeocodingProvider';

/**
 * Implementation of GeocodingProvider using OpenStreetMap's Nominatim API.
 *
 * Respects Nominatim's usage policy:
 * - Max 1 request per second
 * - Includes User-Agent header
 */
export class NominatimProvider implements GeocodingProvider {
  private baseUrl: string;
  private userAgent: string;
  private lastRequestTime: number = 0;
  private requestQueue: Promise<void> = Promise.resolve();

  constructor(
    baseUrl: string = 'https://nominatim.openstreetmap.org',
    userAgent: string = 'StrataLines/1.0 (https://github.com/jburnhams/strata-lines)'
  ) {
    this.baseUrl = baseUrl;
    this.userAgent = userAgent;
  }

  /**
   * Search for locations by query string.
   */
  async search(query: string): Promise<GeocodingResult[]> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.append('q', query);
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('limit', '5');

    try {
      const data = await this.fetchWithRateLimit(url.toString());
      return data.map((item: any) => this.mapToGeocodingResult(item));
    } catch (error) {
      console.error('Nominatim search error:', error);
      return [];
    }
  }

  /**
   * Reverse geocode coordinates to find a location name.
   */
  async reverse(lat: number, lon: number): Promise<ReverseGeocodingResult> {
    const url = new URL(`${this.baseUrl}/reverse`);
    url.searchParams.append('lat', lat.toString());
    url.searchParams.append('lon', lon.toString());
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('zoom', '10'); // City/locality level

    try {
      const data = await this.fetchWithRateLimit(url.toString());
      return this.mapToReverseResult(data);
    } catch (error) {
      console.error('Nominatim reverse geocoding error:', error);
      // Return a fallback result
      return {
        locality: 'Unknown Location',
        displayName: `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        country: ''
      };
    }
  }

  /**
   * Execute fetch request with rate limiting (1 req/sec).
   */
  private async fetchWithRateLimit(url: string, retries = 3): Promise<any> {
    // Enforce sequential execution and rate limiting
    return this.requestQueue = this.requestQueue.then(async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      const waitTime = Math.max(0, 1000 - timeSinceLastRequest);

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      this.lastRequestTime = Date.now();

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent
          }
        });

        if (!response.ok) {
          if (response.status === 429 && retries > 0) {
            console.warn(`Rate limit exceeded for ${url}. Retrying...`);
            // Exponential backoff for 429
            const backoff = (3 - retries + 1) * 2000;
            await new Promise(resolve => setTimeout(resolve, backoff));
            // This is a bit tricky with the queue, but since we are inside the chain,
            // we are effectively pausing the queue.
            // However, we need to bypass the queue wrapper for the retry to avoid deadlocking
            // if we were to call fetchWithRateLimit recursively in a naive way.
            // But since we are already inside the queue execution, we can just recurse?
            // Actually, recursion here would append to the end of the queue if we called fetchWithRateLimit.
            // We should just retry the fetch logic.
            // To keep it simple, let's just throw and let the caller handle?
            // No, requirements say "Retry with exponential backoff on 429 errors".
            // Let's implement a simple retry loop here.
            throw new Error('Rate limit exceeded');
          }
          throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error: any) {
        if (retries > 0 && (error.message === 'Rate limit exceeded' || error.name === 'TypeError')) { // TypeError for network errors
           // If we threw 'Rate limit exceeded' above, we want to retry.
           // Note: The recursion here is slightly problematic because it appends to the queue promise chain
           // IF we called fetchWithRateLimit. But we are inside the callback.
           // Let's just do a manual retry loop or recursion logic carefully.

           // Actually, since we are returning the promise, we can just retry the fetch.
           // But we need to respect the wait time again?
           // The simplest way to implement retry with the queue is to not catch inside the queue callback
           // but rather handle it.
           // Let's refine this: the whole block is what we execute.
           // If it fails, we want to re-execute it.

           // Correct approach for this strict queue:
           // The queue ensures tasks start at least 1s apart.
           // If a task fails and needs retry, it should probably block the queue further?
           // Or just re-schedule itself?

           // Let's handle 429 specifically.
           // If we get 429, we should wait and retry.
           // Since we are inside the 'then', we are blocking the queue.
           const backoff = (4 - retries) * 1000; // 1s, 2s, 3s
           await new Promise(resolve => setTimeout(resolve, backoff));
           // We can't easily recurse `fetchWithRateLimit` here because it appends to the tail.
           // We need to retry the fetch *now*.
           // So let's extract the actual fetch logic.
           return this.performFetch(url, retries - 1);
        }
        throw error;
      }
    });
  }

  private async performFetch(url: string, retries: number): Promise<any> {
     try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.userAgent
          }
        });

        if (response.status === 429 && retries > 0) {
             console.warn(`Rate limit exceeded for ${url}. Retrying...`);
             const backoff = (4 - retries) * 1000;
             await new Promise(resolve => setTimeout(resolve, backoff));
             this.lastRequestTime = Date.now(); // Update time to prevent immediate subsequent requests from other queued items
             return this.performFetch(url, retries - 1);
        }

        if (!response.ok) {
          throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
     } catch (error) {
         if (retries > 0 && error instanceof TypeError) { // Network error
             // Retry network errors too
             await new Promise(resolve => setTimeout(resolve, 1000));
             return this.performFetch(url, retries - 1);
         }
         throw error;
     }
  }

  private mapToGeocodingResult(item: any): GeocodingResult {
    const address = item.address || {};
    return {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      displayName: item.display_name,
      locality: address.city || address.town || address.village || address.municipality || 'Unknown',
      country: address.country || '',
      boundingBox: item.boundingbox ? item.boundingbox.map(parseFloat) : undefined
    };
  }

  private mapToReverseResult(item: any): ReverseGeocodingResult {
    const address = item.address || {};
    const locality = address.city || address.town || address.village || address.municipality || address.county || 'Unknown Location';

    return {
      locality,
      displayName: item.display_name || '',
      country: address.country || ''
    };
  }
}
