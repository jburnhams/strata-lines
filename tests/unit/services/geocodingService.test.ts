import geocodingService from '@/services/geocodingService';
import { NominatimProvider } from '@/services/geocoding/NominatimProvider';

// Mock NominatimProvider
jest.mock('@/services/geocoding/NominatimProvider');

describe('GeocodingService', () => {
  let mockProvider: jest.Mocked<NominatimProvider>;

  beforeEach(() => {
    mockProvider = new NominatimProvider() as jest.Mocked<NominatimProvider>;
    // Directly inject the mock provider into the singleton instance
    geocodingService.setProvider(mockProvider);
  });

  describe('searchPlaces', () => {
    it('returns results from provider', async () => {
      const mockResult = [{
          latitude: 10, longitude: 20, displayName: 'Place', locality: 'City', country: 'Country'
      }];
      mockProvider.search.mockResolvedValue(mockResult);

      const results = await geocodingService.searchPlaces('query');
      expect(results).toEqual(mockResult);
      expect(mockProvider.search).toHaveBeenCalledWith('query');
    });

    it('validates query', async () => {
      await geocodingService.searchPlaces('  ');
      expect(mockProvider.search).not.toHaveBeenCalled();
    });

    it('caches results', async () => {
      const mockResult = [{
        latitude: 10, longitude: 20, displayName: 'Place', locality: 'City', country: 'Country'
      }];
      mockProvider.search.mockResolvedValue(mockResult);

      await geocodingService.searchPlaces('query');
      await geocodingService.searchPlaces('query');

      expect(mockProvider.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLocalityName', () => {
      it('returns locality from provider', async () => {
          mockProvider.reverse.mockResolvedValue({
              locality: 'City', displayName: 'Full', country: 'Country'
          });

          const locality = await geocodingService.getLocalityName(10, 20);
          expect(locality).toBe('City');
      });

      it('validates coordinates', async () => {
          const locality = await geocodingService.getLocalityName(100, 200);
          expect(locality).toBe('Invalid Location');
          expect(mockProvider.reverse).not.toHaveBeenCalled();
      });

      it('caches results', async () => {
        mockProvider.reverse.mockResolvedValue({
            locality: 'City', displayName: 'Full', country: 'Country'
        });

        await geocodingService.getLocalityName(10, 20);
        await geocodingService.getLocalityName(10, 20);

        expect(mockProvider.reverse).toHaveBeenCalledTimes(1);
      });
  });
});
