import { getGeocodingService } from '@/services/geocodingService';
import { GeocodingProvider } from '@/services/geocoding/GeocodingProvider';

describe('GeocodingService', () => {
  let mockProvider: jest.Mocked<GeocodingProvider>;
  const service = getGeocodingService();

  beforeEach(() => {
    mockProvider = {
      search: jest.fn(),
      reverse: jest.fn()
    };
    service.setProvider(mockProvider); // This also clears cache
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('searchPlaces validates query and delegates to provider', async () => {
    mockProvider.search.mockResolvedValue([]);

    await service.searchPlaces('  test  ');

    expect(mockProvider.search).toHaveBeenCalledWith('test');
  });

  it('searchPlaces returns empty array for empty query', async () => {
    const result = await service.searchPlaces('');
    expect(result).toEqual([]);
    expect(mockProvider.search).not.toHaveBeenCalled();
  });

  it('getLocalityName validates coordinates', async () => {
    const result = await service.getLocalityName(100, 0); // Invalid lat
    expect(result).toBe('Invalid Coordinates');
    expect(mockProvider.reverse).not.toHaveBeenCalled();
  });

  it('getLocalityName delegates to provider', async () => {
    mockProvider.reverse.mockResolvedValue({
      locality: 'TestCity',
      displayName: 'Test',
      country: 'Test'
    });

    const result = await service.getLocalityName(10, 20);
    expect(result).toBe('TestCity');
    expect(mockProvider.reverse).toHaveBeenCalledWith(10, 20);
  });

  it('getLocalityName handles errors gracefully', async () => {
      mockProvider.reverse.mockRejectedValue(new Error('fail'));
      const result = await service.getLocalityName(10, 20);
      expect(result).toBe('Unnamed Location');
  });

  describe('Caching', () => {
    it('caches search results', async () => {
      const mockResult = [{
        latitude: 1, longitude: 1, displayName: 'Test', locality: 'Test', country: 'Test'
      }];
      mockProvider.search.mockResolvedValue(mockResult);

      // First call
      await service.searchPlaces('query');
      expect(mockProvider.search).toHaveBeenCalledTimes(1);

      // Second call (should be cached)
      const result = await service.searchPlaces('query');
      expect(result).toEqual(mockResult);
      expect(mockProvider.search).toHaveBeenCalledTimes(1);
    });

    it('expires search cache after TTL', async () => {
      mockProvider.search.mockResolvedValue([]);

      await service.searchPlaces('query');
      expect(mockProvider.search).toHaveBeenCalledTimes(1);

      // Advance time beyond 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000 + 1);

      await service.searchPlaces('query');
      expect(mockProvider.search).toHaveBeenCalledTimes(2);
    });

    it('caches reverse geocoding results using rounded coordinates', async () => {
      mockProvider.reverse.mockResolvedValue({
        locality: 'TestCity',
        displayName: 'Test',
        country: 'Test'
      });

      // 10.1234 -> 10.123
      await service.getLocalityName(10.1234, 20.1234);
      expect(mockProvider.reverse).toHaveBeenCalledTimes(1);

      // 10.1231 -> 10.123 (Same rounded coord, should hit cache)
      const result = await service.getLocalityName(10.1231, 20.1231);
      expect(result).toBe('TestCity');
      expect(mockProvider.reverse).toHaveBeenCalledTimes(1);
    });

    it('expires reverse geocoding cache after TTL', async () => {
      mockProvider.reverse.mockResolvedValue({
        locality: 'TestCity',
        displayName: 'Test',
        country: 'Test'
      });

      await service.getLocalityName(10, 20);
      expect(mockProvider.reverse).toHaveBeenCalledTimes(1);

      // Advance time beyond 15 minutes
      jest.advanceTimersByTime(15 * 60 * 1000 + 1);

      await service.getLocalityName(10, 20);
      expect(mockProvider.reverse).toHaveBeenCalledTimes(2);
    });

    it('clears cache when provider changes', async () => {
      mockProvider.search.mockResolvedValue([]);
      await service.searchPlaces('query');
      expect(mockProvider.search).toHaveBeenCalledTimes(1);

      // Change provider (even to same one, should trigger clear)
      service.setProvider(mockProvider);

      await service.searchPlaces('query');
      expect(mockProvider.search).toHaveBeenCalledTimes(2);
    });

    it('respects max cache size (LRU)', async () => {
        mockProvider.search.mockResolvedValue([]);

        // Fill cache with 100 items (query0 ... query99)
        for (let i = 0; i < 100; i++) {
            await service.searchPlaces(`query${i}`);
        }
        expect(mockProvider.search).toHaveBeenCalledTimes(100);

        // Add 101st item (query100) -> Evicts query0
        await service.searchPlaces('query100');
        expect(mockProvider.search).toHaveBeenCalledTimes(101);

        // Refresh query1 so it doesn't get evicted next
        await service.searchPlaces('query1');
        expect(mockProvider.search).toHaveBeenCalledTimes(101); // Cache hit

        // Verify 'query0' (oldest) was evicted -> Triggers provider call -> Evicts query2 (now oldest)
        await service.searchPlaces('query0');
        expect(mockProvider.search).toHaveBeenCalledTimes(102);

        // query1 should still be there because we refreshed it
        await service.searchPlaces('query1');
        expect(mockProvider.search).toHaveBeenCalledTimes(102); // Cache hit
    });
  });
});
