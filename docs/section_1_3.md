# Section 1.3: Geocoding Service

## Overview

Implement geocoding and reverse geocoding functionality using Nominatim API with a pluggable provider interface to support future alternatives.

## Dependencies

**Required:** None (standalone service)
**Blocks:** 1.6 (Track Integration - needs reverse geocoding for titles)

## Complexity

**Level:** Low
**Scope:** Small

## Architecture

### Provider Interface

Pluggable provider pattern allows swapping geocoding services without changing consuming code. Default implementation uses Nominatim (OpenStreetMap), but can be extended to support Google, Mapbox, etc.

### Rate Limiting

Nominatim requires rate limiting (max 1 request per second) per their usage policy. Implement request queuing with exponential backoff on errors.

## Tasks

### Geocoding Provider Interface

Create `src/services/geocoding/GeocodingProvider.ts`:

- [ ] Define provider interface
  ```typescript
  interface GeocodingProvider {
    search(query: string): Promise<GeocodingResult[]>;
    reverse(lat: number, lon: number): Promise<ReverseGeocodingResult>;
  }

  interface GeocodingResult {
    latitude: number;
    longitude: number;
    displayName: string;
    locality: string;      // City/town name
    country: string;
    boundingBox?: number[]; // [south, north, west, east]
  }

  interface ReverseGeocodingResult {
    locality: string;      // Short recognizable name
    displayName: string;   // Full address
    country: string;
  }
  ```

- [ ] Export interfaces from file
- [ ] Add JSDoc comments explaining each field

### Nominatim Provider Implementation

Create `src/services/geocoding/NominatimProvider.ts`:

- [ ] Implement NominatimProvider class
  - [ ] Constructor accepts optional baseUrl (default: nominatim.openstreetmap.org)
  - [ ] Constructor accepts optional userAgent (required by Nominatim)
  - [ ] Store configuration in private fields

- [ ] Implement search method
  - [ ] Build Nominatim search URL with query
  - [ ] Add format=json parameter
  - [ ] Add addressdetails=1 for structured address
  - [ ] Add limit parameter (default 5 results)
  - [ ] Add User-Agent header (required by Nominatim)
  - [ ] Fetch from API with timeout (10s)
  - [ ] Parse JSON response
  - [ ] Transform to GeocodingResult array
  - [ ] Extract locality from address.city || address.town || address.village
  - [ ] Handle empty results
  - [ ] Handle network errors
  - [ ] Handle rate limit errors (429)

- [ ] Implement reverse method
  - [ ] Build Nominatim reverse geocoding URL
  - [ ] Add format=json and addressdetails=1
  - [ ] Add zoom=10 for locality-level results
  - [ ] Add User-Agent header
  - [ ] Fetch from API with timeout
  - [ ] Parse JSON response
  - [ ] Extract short locality name
  - [ ] Prefer city > town > village > county
  - [ ] Handle missing address components
  - [ ] Handle network errors
  - [ ] Handle rate limit errors

- [ ] Implement rate limiting
  - [ ] Queue requests to enforce 1 req/second
  - [ ] Use simple Promise queue with delays
  - [ ] Retry with exponential backoff on 429 errors
  - [ ] Max 3 retries before failing
  - [ ] Log rate limit warnings

- [ ] Implement error handling
  - [ ] Network timeout errors
  - [ ] Invalid JSON responses
  - [ ] HTTP error status codes
  - [ ] Rate limit exceeded
  - [ ] Wrap errors with descriptive messages

### Geocoding Service

Create `src/services/geocodingService.ts`:

- [ ] Create singleton service instance
  - [ ] Initialize with NominatimProvider by default
  - [ ] Allow provider injection for testing
  - [ ] Export getGeocodingService() factory function

- [ ] Implement search wrapper
  - [ ] searchPlaces(query: string): Promise<GeocodingResult[]>
  - [ ] Validate query not empty
  - [ ] Trim whitespace
  - [ ] Call provider.search()
  - [ ] Cache results for 5 minutes (optional optimization)
  - [ ] Return results or empty array on error

- [ ] Implement reverse geocoding wrapper
  - [ ] getLocalityName(lat: number, lon: number): Promise<string>
  - [ ] Validate coordinates in valid range
  - [ ] Call provider.reverse()
  - [ ] Return locality string
  - [ ] Cache results by rounded coordinates (optional)
  - [ ] Fallback to "Unnamed Location" on error

- [ ] Implement provider switching
  - [ ] setProvider(provider: GeocodingProvider): void
  - [ ] Allow runtime provider changes
  - [ ] Clear cache on provider change

### Geocoding Search Dialog

Create `src/components/places/GeocodingSearchDialog.tsx`:

- [ ] Define component props
  - [ ] `isOpen: boolean`
  - [ ] `onClose: () => void`
  - [ ] `onSelectLocation: (result: GeocodingResult) => void`

- [ ] Implement search UI
  - [ ] Text input with search icon
  - [ ] Search button or Enter key trigger
  - [ ] Loading indicator during search
  - [ ] Clear button to reset input

- [ ] Implement results display
  - [ ] List of results with radio selection
  - [ ] Show displayName as primary text
  - [ ] Show country as secondary text
  - [ ] Show coordinates on hover
  - [ ] Highlight selected result
  - [ ] Empty state when no results
  - [ ] Error state on search failure

- [ ] Implement result selection
  - [ ] Click or Enter to select
  - [ ] Preview on map before selection (optional)
  - [ ] Confirm button to finalize selection
  - [ ] Cancel button to close dialog

- [ ] Implement keyboard navigation
  - [ ] Arrow keys to navigate results
  - [ ] Enter to select highlighted result
  - [ ] Escape to close dialog
  - [ ] Tab to move between input and results

- [ ] Implement debounced search
  - [ ] Debounce input changes (500ms)
  - [ ] Show "Type to search" hint
  - [ ] Auto-search on input if >3 characters
  - [ ] Cancel pending searches on input change

### Integration with Place Controls

Modify `src/components/places/PlaceControls.tsx`:

- [ ] Add state for search dialog visibility
- [ ] Open dialog on "Add Place" button click
- [ ] Pass onSelectLocation callback
- [ ] Create Place from GeocodingResult
  - [ ] Use locality as default title
  - [ ] Set coordinates from result
  - [ ] Set source to 'manual'
  - [ ] Call usePlaceManagement.addPlace()
- [ ] Handle dialog close
- [ ] Show success notification on place creation

## Testing

### Unit Tests

Create `tests/unit/services/geocoding/NominatimProvider.test.ts`:

- [ ] Test search functionality
  - [ ] Returns results for valid query
  - [ ] Returns empty array for no results
  - [ ] Handles network errors gracefully
  - [ ] Respects rate limiting (mock delays)
  - [ ] Retries on 429 errors
  - [ ] Transforms response correctly
  - [ ] Extracts locality from address components

- [ ] Test reverse geocoding
  - [ ] Returns locality for valid coordinates
  - [ ] Handles missing address components
  - [ ] Prefers city over town over village
  - [ ] Handles network errors
  - [ ] Respects rate limiting

- [ ] Test error handling
  - [ ] Network timeout
  - [ ] Invalid JSON response
  - [ ] HTTP error codes (4xx, 5xx)
  - [ ] Rate limit exceeded (429)
  - [ ] Invalid coordinates

- [ ] Test rate limiting
  - [ ] Queues requests correctly
  - [ ] Enforces 1 req/second delay
  - [ ] Concurrent requests queued properly

Create `tests/unit/services/geocodingService.test.ts`:

- [ ] Test service initialization
  - [ ] Singleton instance created
  - [ ] Default provider is Nominatim
  - [ ] Custom provider can be injected

- [ ] Test searchPlaces
  - [ ] Returns results from provider
  - [ ] Validates query
  - [ ] Handles empty query
  - [ ] Returns empty array on error

- [ ] Test getLocalityName
  - [ ] Returns locality from provider
  - [ ] Validates coordinates
  - [ ] Returns fallback on error
  - [ ] Caches results (if implemented)

- [ ] Test provider switching
  - [ ] setProvider changes active provider
  - [ ] Subsequent calls use new provider

Create `tests/unit/components/places/GeocodingSearchDialog.test.tsx`:

- [ ] Test rendering
  - [ ] Dialog opens when isOpen true
  - [ ] Dialog closes when isOpen false
  - [ ] Search input renders
  - [ ] Results list renders

- [ ] Test search interaction
  - [ ] Typing triggers search with debounce
  - [ ] Search button triggers search
  - [ ] Enter key triggers search
  - [ ] Loading indicator shows during search
  - [ ] Results display after search

- [ ] Test result selection
  - [ ] Click result calls onSelectLocation
  - [ ] Enter on highlighted result calls callback
  - [ ] Confirm button finalizes selection
  - [ ] Cancel button closes dialog

- [ ] Test keyboard navigation
  - [ ] Arrow keys navigate results
  - [ ] Escape closes dialog
  - [ ] Tab moves focus correctly

- [ ] Test error states
  - [ ] Shows error message on search failure
  - [ ] Shows empty state when no results
  - [ ] Retry search after error

### Integration Tests

Create `tests/integration/services/geocoding/NominatimProvider.integration.test.ts`:

- [ ] Test real API calls (with caution)
  - [ ] Search for known location returns results
  - [ ] Reverse geocode known coordinates returns locality
  - [ ] Rate limiting works with multiple requests
  - [ ] Skip or use VCR/nock to record/replay HTTP
  - [ ] Respect Nominatim usage policy (use test server if available)

Create `tests/integration/components/places/GeocodingSearchDialog.integration.test.tsx`:

- [ ] Test complete search workflow
  - [ ] Open dialog → type query → see results → select → place created
  - [ ] Handle real API responses (mocked or recorded)
  - [ ] Error states display correctly
  - [ ] Dialog closes after selection

## Acceptance Criteria

- [ ] GeocodingProvider interface defined with search and reverse methods
- [ ] NominatimProvider implements interface with rate limiting
- [ ] geocodingService provides singleton access with provider injection
- [ ] GeocodingSearchDialog allows location search and selection
- [ ] PlaceControls integrates search dialog
- [ ] Rate limiting respects Nominatim 1 req/second policy
- [ ] Error handling provides user-friendly messages
- [ ] Reverse geocoding extracts short locality names
- [ ] Unit test coverage >85% for all geocoding code
- [ ] Integration tests verify API interactions (with mocking)
- [ ] TypeScript strict mode compliance
- [ ] JSDoc comments on all public APIs
- [ ] No API keys required for Nominatim (free tier)

## Notes

### Nominatim Usage Policy

- Must include User-Agent header with app name and contact
- Rate limit: 1 request per second maximum
- No bulk queries or scraping
- Consider self-hosting Nominatim for production with high usage
- Alternative: use Mapbox or Google Geocoding (requires API key)

### User Agent Format

Use: `StrataLines/1.0 (https://github.com/jburnhams/strata-lines)`

### Future Provider Options

- **Google Geocoding API**: High quality, paid, requires API key
- **Mapbox Geocoding API**: Good quality, freemium, requires API key
- **HERE Geocoding API**: Alternative provider
- **Self-hosted Nominatim**: For high-volume usage

### Caching Strategy (Optional)

- Cache search results by normalized query string for 5 minutes
- Cache reverse geocoding by rounded coordinates (3 decimal places) for 15 minutes
- Implement LRU cache with max 100 entries
- Clear cache on provider change
- Consider IndexedDB for persistent cache

### Coordinate Validation

- Latitude: -90 to 90
- Longitude: -180 to 180
- Round to 6 decimal places (~0.1 meter precision)

### Locality Extraction Priority

From Nominatim address components:
1. `address.city`
2. `address.town`
3. `address.village`
4. `address.county`
5. `address.state`
6. Fallback: "Unnamed Location"
