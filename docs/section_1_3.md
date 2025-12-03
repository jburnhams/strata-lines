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

- [x] Define provider interface
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

- [x] Export interfaces from file
- [x] Add JSDoc comments explaining each field

### Nominatim Provider Implementation

Create `src/services/geocoding/NominatimProvider.ts`:

- [x] Implement NominatimProvider class
  - [x] Constructor accepts optional baseUrl (default: nominatim.openstreetmap.org)
  - [x] Constructor accepts optional userAgent (required by Nominatim)
  - [x] Store configuration in private fields

- [x] Implement search method
  - [x] Build Nominatim search URL with query
  - [x] Add format=json parameter
  - [x] Add addressdetails=1 for structured address
  - [x] Add limit parameter (default 5 results)
  - [x] Add User-Agent header (required by Nominatim)
  - [x] Fetch from API with timeout (10s)
  - [x] Parse JSON response
  - [x] Transform to GeocodingResult array
  - [x] Extract locality from address.city || address.town || address.village
  - [x] Handle empty results
  - [x] Handle network errors
  - [x] Handle rate limit errors (429)

- [x] Implement reverse method
  - [x] Build Nominatim reverse geocoding URL
  - [x] Add format=json and addressdetails=1
  - [x] Add zoom=10 for locality-level results
  - [x] Add User-Agent header
  - [x] Fetch from API with timeout
  - [x] Parse JSON response
  - [x] Extract short locality name
  - [x] Prefer city > town > village > county
  - [x] Handle missing address components
  - [x] Handle network errors
  - [x] Handle rate limit errors

- [x] Implement rate limiting
  - [x] Queue requests to enforce 1 req/second
  - [x] Use simple Promise queue with delays
  - [x] Retry with exponential backoff on 429 errors
  - [x] Max 3 retries before failing
  - [x] Log rate limit warnings

- [x] Implement error handling
  - [x] Network timeout errors
  - [x] Invalid JSON responses
  - [x] HTTP error status codes
  - [x] Rate limit exceeded
  - [x] Wrap errors with descriptive messages

### Geocoding Service

Create `src/services/geocodingService.ts`:

- [x] Create singleton service instance
  - [x] Initialize with NominatimProvider by default
  - [x] Allow provider injection for testing
  - [x] Export getGeocodingService() factory function

- [x] Implement search wrapper
  - [x] searchPlaces(query: string): Promise<GeocodingResult[]>
  - [x] Validate query not empty
  - [x] Trim whitespace
  - [x] Call provider.search()
  - [x] Cache results for 5 minutes (optional optimization)
  - [x] Return results or empty array on error

- [x] Implement reverse geocoding wrapper
  - [x] getLocalityName(lat: number, lon: number): Promise<string>
  - [x] Validate coordinates in valid range
  - [x] Call provider.reverse()
  - [x] Return locality string
  - [x] Cache results by rounded coordinates (optional)
  - [x] Fallback to "Unnamed Location" on error

- [x] Implement provider switching
  - [x] setProvider(provider: GeocodingProvider): void
  - [x] Allow runtime provider changes
  - [x] Clear cache on provider change

### Geocoding Search Dialog

Create `src/components/places/GeocodingSearchDialog.tsx`:

- [x] Define component props
  - [x] `isOpen: boolean`
  - [x] `onClose: () => void`
  - [x] `onSelectLocation: (result: GeocodingResult) => void`

- [x] Implement search UI
  - [x] Text input with search icon
  - [x] Search button or Enter key trigger
  - [x] Loading indicator during search
  - [x] Clear button to reset input

- [x] Implement results display
  - [x] List of results with radio selection
  - [x] Show displayName as primary text
  - [x] Show country as secondary text
  - [x] Show coordinates on hover
  - [x] Highlight selected result
  - [x] Empty state when no results
  - [x] Error state on search failure

- [x] Implement result selection
  - [x] Click or Enter to select
  - [x] Preview on map before selection (optional)
  - [x] Confirm button to finalize selection
  - [x] Cancel button to close dialog

- [x] Implement keyboard navigation
  - [x] Arrow keys navigate results
  - [x] Enter to select highlighted result
  - [x] Escape to close dialog
  - [x] Tab to move between input and results

- [x] Implement debounced search
  - [x] Debounce input changes (500ms)
  - [x] Show "Type to search" hint
  - [x] Auto-search on input if >3 characters
  - [x] Cancel pending searches on input change

### Integration with Place Controls

Modify `src/components/places/PlaceControls.tsx`:

- [x] Add state for search dialog visibility
- [x] Open dialog on "Add Place" button click
- [x] Pass onSelectLocation callback
- [x] Create Place from GeocodingResult
  - [x] Use locality as default title
  - [x] Set coordinates from result
  - [x] Set source to 'manual'
  - [x] Call usePlaceManagement.addPlace()
- [x] Handle dialog close
- [x] Show success notification on place creation

## Testing

### Unit Tests

Create `tests/unit/services/geocoding/NominatimProvider.test.ts`:

- [x] Test search functionality
  - [x] Returns results for valid query
  - [x] Returns empty array for no results
  - [x] Handles network errors gracefully
  - [x] Respects rate limiting (mock delays)
  - [x] Retries on 429 errors
  - [x] Transforms response correctly
  - [x] Extracts locality from address components

- [x] Test reverse geocoding
  - [x] Returns locality for valid coordinates
  - [x] Handles missing address components
  - [x] Prefers city over town over village
  - [x] Handles network errors
  - [x] Respects rate limiting

- [x] Test error handling
  - [x] Network timeout
  - [x] Invalid JSON response
  - [x] HTTP error codes (4xx, 5xx)
  - [x] Rate limit exceeded (429)
  - [x] Invalid coordinates

- [x] Test rate limiting
  - [x] Queues requests correctly
  - [x] Enforces 1 req/second delay
  - [x] Concurrent requests queued properly

Create `tests/unit/services/geocodingService.test.ts`:

- [x] Test service initialization
  - [x] Singleton instance created
  - [x] Default provider is Nominatim
  - [x] Custom provider can be injected

- [x] Test searchPlaces
  - [x] Returns results from provider
  - [x] Validates query
  - [x] Handles empty query
  - [x] Returns empty array on error

- [x] Test getLocalityName
  - [x] Returns locality from provider
  - [x] Validates coordinates
  - [x] Returns fallback on error
  - [x] Caches results (if implemented)

- [x] Test provider switching
  - [x] setProvider changes active provider
  - [x] Subsequent calls use new provider

Create `tests/unit/components/places/GeocodingSearchDialog.test.tsx`:

- [x] Test rendering
  - [x] Dialog opens when isOpen true
  - [x] Dialog closes when isOpen false
  - [x] Search input renders
  - [x] Results list renders

- [x] Test search interaction
  - [x] Typing triggers search with debounce
  - [x] Search button triggers search
  - [x] Enter key triggers search
  - [x] Loading indicator shows during search
  - [x] Results display after search

- [x] Test result selection
  - [x] Click result calls onSelectLocation
  - [x] Enter on highlighted result calls callback
  - [x] Confirm button finalizes selection
  - [x] Cancel button closes dialog

- [x] Test keyboard navigation
  - [x] Arrow keys navigate results
  - [x] Escape closes dialog
  - [x] Tab moves focus correctly

- [x] Test error states
  - [x] Shows error message on search failure
  - [x] Shows empty state when no results
  - [x] Retry search after error

### Integration Tests

Create `tests/integration/services/geocoding/NominatimProvider.integration.test.ts`:

- [x] Test real API calls (with caution)
  - [x] Search for known location returns results
  - [x] Reverse geocode known coordinates returns locality
  - [x] Rate limiting works with multiple requests
  - [x] Skip or use VCR/nock to record/replay HTTP
  - [x] Respect Nominatim usage policy (use test server if available)

Create `tests/integration/components/places/GeocodingSearchDialog.integration.test.tsx`:

- [x] Test complete search workflow
  - [x] Open dialog → type query → see results → select → place created
  - [x] Handle real API responses (mocked or recorded)
  - [x] Error states display correctly
  - [x] Dialog closes after selection

## Acceptance Criteria

- [x] GeocodingProvider interface defined with search and reverse methods
- [x] NominatimProvider implements interface with rate limiting
- [x] geocodingService provides singleton access with provider injection
- [x] GeocodingSearchDialog allows location search and selection
- [x] PlaceControls integrates search dialog
- [x] Rate limiting respects Nominatim 1 req/second policy
- [x] Error handling provides user-friendly messages
- [x] Reverse geocoding extracts short locality names
- [x] Unit test coverage >85% for all geocoding code
- [x] Integration tests verify API interactions (with mocking)
- [x] TypeScript strict mode compliance
- [x] JSDoc comments on all public APIs
- [x] No API keys required for Nominatim (free tier)

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
