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

- [ ] Add `Place` interface to `src/types.ts`
- [ ] Add `PlaceSource` type union to `src/types.ts`
- [ ] Add `PlaceIconStyle` type union to `src/types.ts`
- [ ] Add `PlaceBounds` interface to `src/types.ts`
- [ ] Add `PlaceWithMetadata` interface to `src/types.ts`
- [ ] Export all new types from `src/types.ts`

### Database Schema

- [ ] Update `src/services/db.ts` database version from 2 to 3
- [ ] Add `places` object store in upgrade handler with keyPath `id`
- [ ] Add index on `trackId` field for efficient track-based queries
- [ ] Add index on `source` field for filtering by source type
- [ ] Add index on `createdAt` field for chronological ordering

### CRUD Operations

Create new functions in `src/services/db.ts`:

- [ ] Implement `savePlaceToDb(place: Place): Promise<void>`
  - Open database transaction for `places` store
  - Use `put` operation for upsert behavior
  - Handle transaction errors
- [ ] Implement `getPlaceFromDb(id: string): Promise<Place | undefined>`
  - Open readonly transaction
  - Get place by id
  - Return undefined if not found
- [ ] Implement `getAllPlacesFromDb(): Promise<Place[]>`
  - Open readonly transaction
  - Get all places
  - Sort by createdAt descending (newest first)
- [ ] Implement `getPlacesByTrackId(trackId: string): Promise<Place[]>`
  - Use trackId index for efficient query
  - Return all places associated with track
  - Sort by source order (start, middle, end)
- [ ] Implement `deletePlaceFromDb(id: string): Promise<void>`
  - Open readwrite transaction
  - Delete place by id
  - Handle not found case gracefully
- [ ] Implement `updatePlaceInDb(id: string, updates: Partial<Place>): Promise<Place>`
  - Fetch existing place
  - Merge updates
  - Save updated place
  - Return updated place
- [ ] Implement `clearAllPlacesFromDb(): Promise<void>`
  - Open readwrite transaction
  - Clear entire places store
  - Used for bulk delete or testing

### Database Migration

- [ ] Test upgrade from version 2 to version 3 with existing data
  - Verify tracks and source_files stores remain intact
  - Verify new places store created
  - Verify indexes created correctly
- [ ] Handle edge case of database corruption during upgrade
- [ ] Add migration logging for debugging

### Utility Functions

Add to `src/services/utils.ts` or create new file `src/services/placeUtils.ts`:

- [ ] Implement `generatePlaceId(): string`
  - Use `crypto.randomUUID()` for UUID generation
  - Fallback to timestamp-based ID if crypto unavailable
- [ ] Implement `createPlace(partial: Partial<Place>): Place`
  - Generate default values for required fields
  - Default `isVisible` to true
  - Default `showIcon` to true
  - Default `iconStyle` to 'pin'
  - Default `source` to 'manual'
  - Set `createdAt` to current timestamp
- [ ] Implement `calculatePlaceBounds(places: Place[]): PlaceBounds | null`
  - Return bounds encompassing all places
  - Return null if places array empty
  - Use Leaflet LatLngBounds for calculation

## Testing

### Unit Tests

Create `tests/unit/services/db.places.test.ts`:

- [ ] Test place CRUD operations
  - [ ] Save new place successfully
  - [ ] Save updates existing place with same id
  - [ ] Get place by id returns correct place
  - [ ] Get place by invalid id returns undefined
  - [ ] Get all places returns all saved places
  - [ ] Get all places returns empty array when none exist
  - [ ] Delete place removes it from database
  - [ ] Delete non-existent place succeeds silently
  - [ ] Update place merges partial updates correctly
  - [ ] Clear all places empties the store

- [ ] Test track-based queries
  - [ ] Get places by trackId returns only matching places
  - [ ] Get places by trackId returns empty array when none match
  - [ ] Get places by trackId sorts by source order (start, middle, end)

- [ ] Test database migration
  - [ ] Upgrade from version 2 to 3 succeeds
  - [ ] Existing stores remain intact after upgrade
  - [ ] New places store accessible after upgrade
  - [ ] Indexes created correctly

- [ ] Test error handling
  - [ ] Handle database open failure
  - [ ] Handle transaction abort
  - [ ] Handle corrupted data gracefully

Create `tests/unit/services/placeUtils.test.ts`:

- [ ] Test utility functions
  - [ ] generatePlaceId returns valid UUID
  - [ ] generatePlaceId returns unique values
  - [ ] createPlace applies default values
  - [ ] createPlace merges provided values
  - [ ] createPlace generates unique id
  - [ ] calculatePlaceBounds returns correct bounds
  - [ ] calculatePlaceBounds handles single place
  - [ ] calculatePlaceBounds handles empty array
  - [ ] calculatePlaceBounds handles places spanning antimeridian

### Integration Tests

Create `tests/integration/services/db.places.integration.test.ts`:

- [ ] Test full place lifecycle
  - [ ] Create, read, update, delete place successfully
  - [ ] Multiple places persist correctly
  - [ ] Track association maintained through operations

- [ ] Test concurrent operations
  - [ ] Multiple saves don't corrupt data
  - [ ] Read during write returns consistent data

- [ ] Test performance
  - [ ] Save 100 places in reasonable time (<1s)
  - [ ] Query 100 places in reasonable time (<100ms)
  - [ ] Index queries faster than full scans

## Acceptance Criteria

- [ ] Place interface defined with all required fields
- [ ] PlaceSource and PlaceIconStyle types defined
- [ ] IndexedDB places store created with indexes
- [ ] All CRUD operations implemented and tested
- [ ] Database migration from v2 to v3 works correctly
- [ ] Utility functions for place creation and bounds calculation
- [ ] Unit test coverage >85% for all new code
- [ ] Integration tests verify real IndexedDB operations
- [ ] No breaking changes to existing track/source_files stores
- [ ] TypeScript strict mode compliance
- [ ] All functions have JSDoc comments explaining purpose and parameters

## Notes

- Place id generation uses `crypto.randomUUID()` for browser compatibility
- Track deletion does NOT cascade to places - places remain with null trackId reference
- Places store is independent of tracks store - no foreign key constraints
- Consider adding createdAt and updatedAt timestamps for future audit trails
- Icon style extensibility allows future additions (marker, flag, star, etc.)
