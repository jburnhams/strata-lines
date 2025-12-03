import { NominatimProvider } from '@/services/geocoding/NominatimProvider';

describe('NominatimProvider Integration', () => {
  let provider: NominatimProvider;

  beforeEach(() => {
    provider = new NominatimProvider();
    // We mock fetch globally to avoid real network requests in CI/Sandbox
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should fetch and parse results correctly', async () => {
    const mockResponse = [{
      lat: "51.5073219",
      lon: "-0.1276474",
      display_name: "London, Greater London, England, United Kingdom",
      address: {
        city: "London",
        state: "England",
        country: "United Kingdom"
      },
      boundingbox: ["51.2867602", "51.6918741", "-0.5103751", "0.3340155"]
    }];

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const results = await provider.search('London');

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].locality).toBe('London');
    expect(results[0].latitude).toBeCloseTo(51.5073);
  });
});
