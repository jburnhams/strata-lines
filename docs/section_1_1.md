# Section 1.1: Data Model and Persistence

## Overview

Establish the core Place data model, TypeScript interfaces, and IndexedDB persistence layer. This subsection provides the foundation for all place-related features.

## Dependencies

**Required:** None (foundational)
**Blocks:** All other subsections (1.2-1.7)

## Complexity

**Level:** Low
**Scope:** Small

## Data Model

### Place Interface

Add to `src/types.ts`:

```typescript
interface Place {
  id: string;                    // UUID
  latitude: number;              // WGS84 coordinate
  longitude: number;             // WGS84 coordinate
  title: string;                 // Display name
  createdAt: number;             // Unix timestamp (milliseconds)
  source: PlaceSource;           // Origin of place
  trackId?: string;              // Optional track reference
  isVisible: boolean;            // Display toggle
  showIcon: boolean;             // Icon visibility toggle
  iconStyle: PlaceIconStyle;     // Pin, dot, etc.
}

type PlaceSource = 'manual' | 'track-start' | 'track-middle' | 'track-end' | 'import';

type PlaceIconStyle = 'pin' | 'dot';  // Extensible for future styles

interface PlaceBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### Derived Types

```typescript
interface PlaceWithMetadata extends Place {
  distanceToNearestPlace?: number;  // Calculated during positioning
  titleLines?: string[];            // Wrapped title lines
  titlePosition?: 'left' | 'right'; // Calculated position
}
```

## Tasks

### Type Definitions

- [x] Add `Place` interface to `src/types.ts`
- [x] Add `PlaceSource` type union to `src/types.ts`
- [x] Add `PlaceIconStyle` type union to `src/types.ts`
- [x] Add `PlaceBounds` interface to `src/types.ts`
- [x] Add `PlaceWithMetadata` interface to `src/types.ts`
- [x] Export all new types from `src/types.ts`

### Database Schema

- [x] Update `src/services/db.ts` database version from 2 to 3
- [x] Add `places` object store in upgrade handler with keyPath `id`
- [x] Add index on `trackId` field for efficient track-based queries
- [x] Add index on `source` field for filtering by source type
- [x] Add index on `createdAt` field for chronological ordering

### CRUD Operations

Create new functions in `src/services/db.ts`:

- [x] Implement `savePlaceToDb(place: Place): Promise<void>`
  - Open database transaction for `places` store
  - Use `put` operation for upsert behavior
  - Handle transaction errors
- [x] Implement `getPlaceFromDb(id: string): Promise<Place | undefined>`
  - Open readonly transaction
  - Get place by id
  - Return undefined if not found
- [x] Implement `getAllPlacesFromDb(): Promise<Place[]>`
  - Open readonly transaction
  - Get all places
  - Sort by createdAt descending (newest first)
- [x] Implement `getPlacesByTrackId(trackId: string): Promise<Place[]>`
  - Use trackId index for efficient query
  - Return all places associated with track
  - Sort by source order (start, middle, end)
- [x] Implement `deletePlaceFromDb(id: string): Promise<void>`
  - Open readwrite transaction
  - Delete place by id
  - Handle not found case gracefully
- [x] Implement `updatePlaceInDb(id: string, updates: Partial<Place>): Promise<Place>`
  - Fetch existing place
  - Merge updates
  - Save updated place
  - Return updated place
- [x] Implement `clearAllPlacesFromDb(): Promise<void>`
  - Open readwrite transaction
  - Clear entire places store
  - Used for bulk delete or testing

### Database Migration

- [x] Test upgrade from version 2 to version 3 with existing data
  - Verify tracks and source_files stores remain intact
  - Verify new places store created
  - Verify indexes created correctly
- [ ] Handle edge case of database corruption during upgrade
- [ ] Add migration logging for debugging

### Utility Functions

Add to `src/services/utils.ts` or create new file `src/services/placeUtils.ts`:

- [x] Implement `generatePlaceId(): string`
  - Use `crypto.randomUUID()` for UUID generation
  - Fallback to timestamp-based ID if crypto unavailable
- [x] Implement `createPlace(partial: Partial<Place>): Place`
  - Generate default values for required fields
  - Default `isVisible` to true
  - Default `showIcon` to true
  - Default `iconStyle` to 'pin'
  - Default `source` to 'manual'
  - Set `createdAt` to current timestamp
- [x] Implement `calculatePlaceBounds(places: Place[]): PlaceBounds | null`
  - Return bounds encompassing all places
  - Return null if places array empty
  - Use Leaflet LatLngBounds for calculation

## Testing

### Unit Tests

Create `tests/unit/services/db.places.test.ts`:

- [x] Test place CRUD operations
  - [x] Save new place successfully
  - [x] Save updates existing place with same id
  - [x] Get place by id returns correct place
  - [x] Get place by invalid id returns undefined
  - [x] Get all places returns all saved places
  - [x] Get all places returns empty array when none exist
  - [x] Delete place removes it from database
  - [x] Delete non-existent place succeeds silently
  - [x] Update place merges partial updates correctly
  - [x] Clear all places empties the store

- [x] Test track-based queries
  - [x] Get places by trackId returns only matching places
  - [x] Get places by trackId returns empty array when none match
  - [x] Get places by trackId sorts by source order (start, middle, end)

- [ ] Test database migration
  - [ ] Upgrade from version 2 to 3 succeeds
  - [ ] Existing stores remain intact after upgrade
  - [ ] New places store accessible after upgrade
  - [ ] Indexes created correctly

- [x] Test error handling
  - [ ] Handle database open failure
  - [ ] Handle transaction abort
  - [ ] Handle corrupted data gracefully

Create `tests/unit/services/placeUtils.test.ts`:

- [x] Test utility functions
  - [x] generatePlaceId returns valid UUID
  - [x] generatePlaceId returns unique values
  - [x] createPlace applies default values
  - [x] createPlace merges provided values
  - [x] createPlace generates unique id
  - [x] calculatePlaceBounds returns correct bounds
  - [x] calculatePlaceBounds handles single place
  - [x] calculatePlaceBounds handles empty array
  - [x] calculatePlaceBounds handles places spanning antimeridian

### Integration Tests

Create `tests/integration/services/db.places.integration.test.ts`:

- [x] Test full place lifecycle
  - [x] Create, read, update, delete place successfully
  - [x] Multiple places persist correctly
  - [x] Track association maintained through operations

- [x] Test concurrent operations
  - [x] Multiple saves don't corrupt data
  - [x] Read during write returns consistent data

- [x] Test performance
  - [x] Save 100 places in reasonable time (<1s)
  - [x] Query 100 places in reasonable time (<100ms)
  - [x] Index queries faster than full scans

## Acceptance Criteria

- [x] Place interface defined with all required fields
- [x] PlaceSource and PlaceIconStyle types defined
- [x] IndexedDB places store created with indexes
- [x] All CRUD operations implemented and tested
- [x] Database migration from v2 to v3 works correctly
- [x] Utility functions for place creation and bounds calculation
- [x] Unit test coverage >85% for all new code
- [x] Integration tests verify real IndexedDB operations
- [x] No breaking changes to existing track/source_files stores
- [x] TypeScript strict mode compliance
- [x] All functions have JSDoc comments explaining purpose and parameters

## Notes

- Place id generation uses `crypto.randomUUID()` for browser compatibility
- Track deletion does NOT cascade to places - places remain with null trackId reference
- Places store is independent of tracks store - no foreign key constraints
- Consider adding createdAt and updatedAt timestamps for future audit trails
- Icon style extensibility allows future additions (marker, flag, star, etc.)
