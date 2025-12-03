import { geocodingService } from '@/services/geocodingService';
import { GeocodingProvider } from '@/services/geocoding/GeocodingProvider';

describe('GeocodingService', () => {
  let mockProvider: jest.Mocked<GeocodingProvider>;

  beforeEach(() => {
    mockProvider = {
      search: jest.fn(),
      reverse: jest.fn()
    };
    geocodingService.setProvider(mockProvider);
  });

  describe('searchPlaces', () => {
    it('returns results from provider', async () => {
      const mockResults = [{
        latitude: 10,
        longitude: 10,
        displayName: 'Test Place',
        locality: 'Test',
        country: 'TestLand'
      }];
      mockProvider.search.mockResolvedValue(mockResults);

      const results = await geocodingService.searchPlaces('query');
      expect(results).toBe(mockResults);
      expect(mockProvider.search).toHaveBeenCalledWith('query');
    });

    it('validates query', async () => {
      await geocodingService.searchPlaces('  ');
      expect(mockProvider.search).not.toHaveBeenCalled();
    });
  });

  describe('getLocalityName', () => {
    it('returns locality from provider', async () => {
      mockProvider.reverse.mockResolvedValue({
        locality: 'Test City',
        displayName: 'Test City, Country',
        country: 'Country'
      });

      const locality = await geocodingService.getLocalityName(10, 20);
      expect(locality).toBe('Test City');
    });

    it('returns fallback on error', async () => {
      mockProvider.reverse.mockRejectedValue(new Error('Fail'));
      const locality = await geocodingService.getLocalityName(10, 20);
      expect(locality).toBe('Unknown Location');
    });

    it('validates coordinates', async () => {
        const locality = await geocodingService.getLocalityName(100, 200);
        expect(locality).toBe('Invalid Coordinates');
        expect(mockProvider.reverse).not.toHaveBeenCalled();
    });
  });
});
