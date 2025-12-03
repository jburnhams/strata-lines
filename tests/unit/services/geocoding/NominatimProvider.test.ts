import { NominatimProvider } from '@/services/geocoding/NominatimProvider';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NominatimProvider', () => {
  let provider: NominatimProvider;

  beforeEach(() => {
    provider = new NominatimProvider();
    mockFetch.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('search', () => {
    it('returns results for valid query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            lat: '51.5074',
            lon: '-0.1278',
            display_name: 'London, Greater London, England, United Kingdom',
            address: { city: 'London', country: 'United Kingdom' },
            boundingbox: ['51.28', '51.69', '-0.51', '0.33'],
          },
        ],
      });

      const results = await provider.search('London');

      expect(results).toHaveLength(1);
      expect(results[0].locality).toBe('London');
      expect(results[0].latitude).toBe(51.5074);
      expect(results[0].longitude).toBe(-0.1278);
    });

    it('returns empty array for no results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const results = await provider.search('NonExistentPlace');
      expect(results).toEqual([]);
    });

    it('handles network errors gracefully', async () => {
        const error = new Error('Network error');
        mockFetch.mockRejectedValue(error);

        const searchPromise = provider.search('London');

        // We need to catch the floating promise rejection that happens during retries
        searchPromise.catch(() => {});

        // Advance timers to exhaust all retries
        await jest.runAllTimersAsync();

        await expect(searchPromise).rejects.toThrow('Network error');
    });

    it('retries on 429 errors', async () => {
      mockFetch
        .mockResolvedValueOnce({ status: 429, ok: false })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
             {
                lat: '51.5074',
                lon: '-0.1278',
                display_name: 'London',
                address: { city: 'London' },
             }
          ],
        });

      const searchPromise = provider.search('London');
      await jest.runAllTimersAsync();
      const results = await searchPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(1);
    });
  });

  describe('reverse', () => {
    it('returns locality for valid coordinates', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          lat: '51.5074',
          lon: '-0.1278',
          display_name: 'London, UK',
          address: { city: 'London', country: 'United Kingdom' },
        }),
      });

      const result = await provider.reverse(51.5074, -0.1278);
      expect(result.locality).toBe('London');
    });

    it('prefers city over town over village', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
           lat: '0', lon: '0', display_name: 'Test',
           address: { town: 'MyTown', village: 'MyVillage' },
        }),
      });

      const result = await provider.reverse(0, 0);
      expect(result.locality).toBe('MyTown');
    });
  });

  describe('rate limiting', () => {
      it('queues requests correctly', async () => {
          mockFetch.mockResolvedValue({
              ok: true,
              json: async () => [],
          });

          const p1 = provider.search('1');
          const p2 = provider.search('2');

          // p1 should start immediately, p2 should wait
          expect(mockFetch).toHaveBeenCalledTimes(0); // Wait for microtasks

          await jest.runAllTimersAsync();

          await Promise.all([p1, p2]);

          // Should have called fetch twice
          expect(mockFetch).toHaveBeenCalledTimes(2);
      });
  });
});
