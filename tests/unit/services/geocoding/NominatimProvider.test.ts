import { NominatimProvider } from '@/services/geocoding/NominatimProvider';

// Mock fetch global
global.fetch = jest.fn();

describe('NominatimProvider', () => {
  let provider: NominatimProvider;

  beforeEach(() => {
    provider = new NominatimProvider();
    (global.fetch as jest.Mock).mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('search', () => {
    it('returns results for valid query', async () => {
      const mockResponse = [
        {
          lat: '48.8566',
          lon: '2.3522',
          display_name: 'Paris, France',
          address: { city: 'Paris', country: 'France' },
          boundingbox: ['48.815', '48.902', '2.224', '2.469']
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const promise = provider.search('Paris');

      // Advance timers to bypass rate limit wait if any
      jest.advanceTimersByTime(1000);

      const results = await promise;

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        latitude: 48.8566,
        longitude: 2.3522,
        displayName: 'Paris, France',
        locality: 'Paris',
        country: 'France',
        boundingBox: [48.815, 48.902, 2.224, 2.469]
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('handles empty results', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const promise = provider.search('Nowhere');
      jest.advanceTimersByTime(1000);
      const results = await promise;

      expect(results).toEqual([]);
    });

    it('handles network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const promise = provider.search('Error');
      jest.advanceTimersByTime(4000); // Allow for retries
      const results = await promise;

      expect(results).toEqual([]);
    });
  });

  describe('reverse', () => {
    it('returns locality for valid coordinates', async () => {
      const mockResponse = {
        lat: '51.5074',
        lon: '-0.1278',
        display_name: 'London, UK',
        address: { city: 'London', country: 'United Kingdom' }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const promise = provider.reverse(51.5074, -0.1278);
      jest.advanceTimersByTime(1000);
      const result = await promise;

      expect(result).toEqual({
        locality: 'London',
        displayName: 'London, UK',
        country: 'United Kingdom'
      });
    });

    it('falls back when address components are missing', async () => {
        const mockResponse = {
            display_name: 'Middle of Nowhere',
            address: { country: 'Nowhere Land' }
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const promise = provider.reverse(0, 0);
        jest.advanceTimersByTime(1000);
        const result = await promise;

        expect(result.locality).toBe('Unknown Location');
    });

    it('handles error with fallback', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        const promise = provider.reverse(10, 10);
        jest.advanceTimersByTime(4000); // Retries
        const result = await promise;

        expect(result.locality).toBe('Unknown Location');
        expect(result.displayName).toContain('10.000000, 10.000000');
    });
  });

  describe('rate limiting', () => {
    it('queues requests to enforce 1 req/second', async () => {
       (global.fetch as jest.Mock).mockResolvedValue({
           ok: true,
           json: async () => []
       });

       const p1 = provider.search('A');
       const p2 = provider.search('B');
       const p3 = provider.search('C');

       expect(global.fetch).toHaveBeenCalledTimes(0);

       jest.advanceTimersByTime(1); // Start first
       // p1 should fire immediately (or close to it if no previous request)
       // Wait, the logic is: waitTime = max(0, 1000 - timeSinceLastRequest).
       // Initially lastRequestTime is 0.
       // If Date.now() is T, and T - 0 > 1000 (which it is usually not in jest fake timers starts at 0?),
       // In Jest fake timers, Date.now starts at 0? Let's assume so.
       // 0 - 0 = 0. 1000 - 0 = 1000. So it waits 1000ms.

       // Let's verify start time behavior.

       jest.advanceTimersByTime(1000);
       // p1 should have fired.
       // p2 is queued.
       // p3 is queued.

       // Actually, promises need to resolve for the queue to proceed.
       // Since we are using fake timers, and the queue uses `await new Promise(setTimeout)`,
       // advancing time resolves those timeouts.

       // However, the `fetch` is mocked to return immediately (microtask).

       await p1;
       expect(global.fetch).toHaveBeenCalledTimes(1);

       // Now p2 should be starting its wait.
       jest.advanceTimersByTime(1000);
       await p2;
       expect(global.fetch).toHaveBeenCalledTimes(2);

       jest.advanceTimersByTime(1000);
       await p3;
       expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});
