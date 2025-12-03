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
    service.setProvider(mockProvider);
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
});
