/**
 * @jest-environment node
 */
import { NominatimProvider } from '@/services/geocoding/NominatimProvider';

// We use a longer timeout for integration tests involving network
jest.setTimeout(30000);

describe('NominatimProvider Integration', () => {
  const provider = new NominatimProvider();

  // Basic check to ensure we can reach the API
  // Note: This relies on external service availability and network access
  it('should successfully search for a known location (Paris)', async () => {
    // delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 1000));

    const results = await provider.search('Paris');

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    // Check if at least one result looks correct
    const paris = results.find(r => r.displayName.includes('Paris'));
    expect(paris).toBeDefined();
    expect(paris?.latitude).toBeDefined();
    expect(paris?.longitude).toBeDefined();
  });

  it('should successfully reverse geocode a known location', async () => {
    // delay to be nice to the API and respect rate limit
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Coordinates for Eiffel Tower roughly
    const lat = 48.8584;
    const lon = 2.2945;

    const result = await provider.reverse(lat, lon);

    expect(result).toBeDefined();
    expect(result.displayName).toContain('Paris');
    expect(result.country).toBe('France');
  });
});
