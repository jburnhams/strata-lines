import { NominatimProvider } from '@/services/geocoding/NominatimProvider';

const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('NominatimProvider', () => {
  let provider: NominatimProvider;
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01')); // Ensure initial time is set
    provider = new NominatimProvider();
    fetchSpy = jest.fn();
    global.fetch = fetchSpy;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('search returns results for valid query', async () => {
    const mockResponse = [{
      lat: '51.5074',
      lon: '-0.1278',
      display_name: 'London, Greater London, England, United Kingdom',
      address: { city: 'London', country: 'United Kingdom' },
      boundingbox: ['51.3', '51.7', '-0.5', '0.3']
    }];

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const promise = provider.search('London');

    await flushPromises();
    jest.runAllTimers();

    const results = await promise;

    expect(results).toHaveLength(1);
    expect(results[0].locality).toBe('London');
    expect(results[0].latitude).toBe(51.5074);
    expect(results[0].longitude).toBe(-0.1278);
  });

  it('reverse returns locality for valid coordinates', async () => {
    const mockResponse = {
      lat: '51.5074',
      lon: '-0.1278',
      display_name: 'London, UK',
      address: { city: 'London', country: 'United Kingdom' }
    };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const promise = provider.reverse(51.5074, -0.1278);
    await flushPromises();
    jest.runAllTimers();
    const result = await promise;

    expect(result.locality).toBe('London');
  });

  it('enforces rate limiting', async () => {
    const mockResponse: any[] = [];
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as Response);

    // Request 1
    const req1 = provider.search('1');
    jest.advanceTimersByTime(100);
    await req1;
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Request 2
    const req2 = provider.search('2');
    await flushPromises();

    // Should wait
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Advance time by 1.1s
    jest.advanceTimersByTime(1100);
    await flushPromises();

    await req2;
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 errors', async () => {
    // First call fails with 429
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests'
    } as Response);

    // Second call succeeds
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => []
    } as Response);

    const promise = provider.search('retry');

    await flushPromises();

    // Initial call
    jest.advanceTimersByTime(100);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Backoff (2000ms)
    jest.advanceTimersByTime(2000);
    await flushPromises();

    // Retry call
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    await promise;
  });

  it('extracts locality with priority', async () => {
      // village
      fetchSpy.mockResolvedValueOnce({
          ok: true,
          json: async () => [{
              lat: '0', lon: '0', display_name: 'x',
              address: { village: 'MyVillage', county: 'MyCounty' }
          }]
      } as Response);

      const res1Promise = provider.search('v');
      await flushPromises();
      jest.advanceTimersByTime(100);
      const res1 = await res1Promise;
      expect(res1[0].locality).toBe('MyVillage');

      // county fallback
      fetchSpy.mockResolvedValueOnce({
          ok: true,
          json: async () => [{
              lat: '0', lon: '0', display_name: 'x',
              address: { county: 'MyCounty' }
          }]
      } as Response);

      const res2Promise = provider.search('c');
      await flushPromises();

      // Need to advance timers because of queue (1100ms spacing)
      jest.advanceTimersByTime(1100);

      const res2 = await res2Promise;
      expect(res2[0].locality).toBe('MyCounty');
  });
});
