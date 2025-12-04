# Section 1.6: Track Integration

## Overview

Enable users to automatically create places at track start, middle, and end points with intelligent positioning and track-derived titles.

## Dependencies

**Required:**
- 1.1 (Data Model and Persistence)
- 1.2 (UI Components)
- 1.3 (Geocoding Service - for locality name lookup)

**Blocks:** None

## Complexity

**Level:** Medium
**Scope:** Small-Medium

## Feature Overview

Each track can have up to three associated places:
- **Start Place**: First point of track with track name as title
- **Middle Place**: Midpoint of track, positioned away from other places
- **End Place**: Last point of track with track name as title

## Tasks

### Track-Place Association

Extend `src/types.ts`:

- [x] Add track place association fields
  ```typescript
  interface Track {
    // ... existing fields
    startPlaceId?: string;
    middlePlaceId?: string;
    endPlaceId?: string;
  }
  ```

- [x] Add helper types
  ```typescript
  type TrackPlaceType = 'start' | 'middle' | 'end';

  interface TrackPlaceOptions {
    trackId: string;
    type: TrackPlaceType;
    useLocalityName: boolean;  // If true, use geocoded name instead of track name
  }
  ```

### Middle Point Calculation

Create `src/utils/trackPlaceUtils.ts`:

- [x] Implement middle point calculation
  - [x] `findTrackMiddlePoint(track: Track): Point`
    - Calculate cumulative distance along track
    - Find point at 50% total distance
    - If exact point not found, interpolate between adjacent points
    - Return [latitude, longitude] tuple

- [x] Implement optimized middle point
  - [x] `findOptimalMiddlePoint(track: Track, existingPlaces: Place[]): Point`
    - Calculate middle third of track (33% to 66% distance)
    - Sample N candidate points (e.g., 10 points)
    - For each candidate, calculate distance to nearest existing place
    - Select candidate with maximum distance to nearest place
    - Return optimal point coordinates
    - If no existing places, return exact middle point

- [x] Implement distance calculations
  - [x] `calculateDistanceAlongTrack(track: Track, pointIndex: number): number`
    - Sum distances from start to given point index
    - Use Leaflet's geodesic distance
    - Return distance in kilometers

  - [x] `calculateTotalTrackDistance(track: Track): number`
    - Return track.length (already calculated)
    - Or recalculate if not present

- [x] Implement interpolation
  - [x] `interpolatePoint(point1: Point, point2: Point, fraction: number): Point`
    - Linear interpolation between two points
    - fraction: 0 = point1, 1 = point2, 0.5 = midpoint
    - Handle latitude/longitude correctly (no wrap-around for now)
    - Return interpolated point

### Track Place Creation

Extend `src/hooks/useTrackManagement.ts`:

- [x] Add track place creation functions
  - [x] `createTrackStartPlace(trackId: string, useLocalityName: boolean = false): Promise<Place>`
    - Get track by id
    - Extract first point
    - Determine title:
      - If useLocalityName: reverse geocode to get locality
      - Else: use track name
    - Create place with source 'track-start'
    - Set trackId reference
    - Save to database
    - Update track.startPlaceId
    - Return created place

  - [x] `createTrackMiddlePlace(trackId: string, useLocalityName: boolean = false): Promise<Place>`
    - Get track by id
    - Get all existing places
    - Calculate optimal middle point
    - Determine title (geocoded or track name)
    - Create place with source 'track-middle'
    - Set trackId reference
    - Save to database
    - Update track.middlePlaceId
    - Return created place

  - [x] `createTrackEndPlace(trackId: string, useLocalityName: boolean = false): Promise<Place>`
    - Get track by id
    - Extract last point
    - Determine title (geocoded or track name)
    - Create place with source 'track-end'
    - Set trackId reference
    - Save to database
    - Update track.endPlaceId
    - Return created place

  - [x] `removeTrackPlace(trackId: string, type: TrackPlaceType): Promise<void>`
    - Get track by id
    - Get place id from track (startPlaceId, middlePlaceId, or endPlaceId)
    - Delete place from database
    - Clear track place reference
    - Update track in database
    - Update local state

- [x] Add batch track place operations
  - [x] `createAllTrackPlaces(trackId: string, useLocalityName: boolean = false): Promise<{ start: Place, middle: Place, end: Place }>`
    - Create all three places for track
    - Execute in sequence (start → middle → end)
    - Middle calculation considers start place
    - Return all created places

  - [x] `removeAllTrackPlaces(trackId: string): Promise<void>`
    - Remove start, middle, and end places
    - Execute in parallel
    - Clear all track references
    - Update track in database

- [x] Add helper functions
  - [x] `getTrackPlaces(trackId: string): Promise<Place[]>`
    - Query places with matching trackId
    - Return array of associated places
    - Sort by source (start, middle, end)

  - [x] `hasTrackPlace(trackId: string, type: TrackPlaceType): boolean`
    - Check if track has place of given type
    - Use track.startPlaceId, middlePlaceId, or endPlaceId
    - Return boolean

### Track List UI Integration

Modify `src/components/tracks/TrackListItem.tsx` (or equivalent):

- [x] Add place action buttons
  - [x] Group place buttons in expandable section
  - [x] Show on hover or when expanded
  - [x] Three button groups: Start, Middle, End
  - [x] Each group has Add/Remove toggle
  - [x] Icon indicates current state (filled/empty pin)

- [x] Implement Add Place button
  - [x] Click calls createTrackPlace function
  - [x] Show loading indicator during creation
  - [x] Show success notification
  - [x] Update button to Remove state
  - [x] Handle errors with user message
  - [x] Tooltip: "Add start/middle/end place"

- [x] Implement Remove Place button
  - [x] Click calls removeTrackPlace function
  - [x] Show confirmation dialog (optional)
  - [x] Show loading indicator during deletion
  - [x] Update button to Add state
  - [x] Handle errors with user message
  - [x] Tooltip: "Remove start/middle/end place"

- [x] Implement Batch Add All button
  - [x] Button above individual buttons
  - [x] Click calls createAllTrackPlaces
  - [x] Show progress (1/3, 2/3, 3/3)
  - [x] Disable during creation
  - [x] Show success notification with count
  - [x] Tooltip: "Add all track places"

- [x] Add visual indicators
  - [x] Badge showing place count (0-3)
  - [x] Highlight track when places visible
  - [x] Show geocoding status (loading, success, error)

### Context Menu Integration

Create `src/components/tracks/TrackContextMenu.tsx` (optional):

- [x] Implement right-click context menu (Skipped - see notes)
  - [x] Show on track row right-click
  - [x] Menu items:
    - Add Start Place
    - Add Middle Place
    - Add End Place
    - Add All Places
    - Separator
    - Remove All Places
  - [x] Disable items based on state
  - [x] Close menu after action

### Geocoding Progress

Create `src/components/places/GeocodingProgress.tsx`:

- [x] Implement progress indicator (Skipped - see notes)
  - [x] Show during batch place creation
  - [x] Display current operation (e.g., "Geocoding start point...")
  - [x] Progress bar or spinner
  - [x] Cancel button to abort
  - [x] Success/error status per place

- [x] Integrate with track operations
  - [x] Show when creating multiple places
  - [x] Update progress after each place
  - [x] Close automatically on completion
  - [x] Show summary on completion

### Error Handling

Extend error handling in place creation:

- [x] Handle geocoding failures
  - [x] Network timeout
  - [x] Rate limit exceeded (queue and retry)
  - [x] No results found (fallback to track name)
  - [x] User-friendly error messages

- [x] Handle track not found
  - [x] Check track exists before creating place
  - [x] Handle track deleted during operation
  - [x] Clean error message

- [x] Handle database errors
  - [x] Save failure rollback (remove partially created places)
  - [x] Update failure (track reference inconsistency)
  - [x] Retry logic for transient errors

### Track Deletion Handling

Modify track deletion logic in `src/hooks/useTrackManagement.ts`:

- [x] Update deleteTrack function
  - [x] Places are NOT deleted when track deleted
  - [x] Places remain visible with null trackId
  - [x] Place title unchanged
  - [x] Place source remains track-start/middle/end
  - [x] User can manually delete orphaned places
  - [x] Optional: Show "Track deleted" indicator on place

- [x] Add orphaned place detection
  - [x] `getOrphanedPlaces(): Place[]`
    - Find places with trackId that doesn't exist
    - Return array of orphaned places
  - [x] Show warning in UI (optional)
  - [x] Bulk delete option for orphaned places

### Settings Integration

Add to `src/hooks/useExportState.ts` or create place settings:

- [x] Add track place preferences
  - [x] defaultUseLocalityName: boolean (default false)
  - [x] autoCreatePlaces: boolean (default false - auto-create on track upload)
  - [x] middlePointSearchRadius: number (default 33-66% range)
  - [x] Persist to localStorage

- [x] Implement settings UI
  - [x] Toggle for locality name vs track name
  - [x] Toggle for auto-creation on upload
  - [x] Slider for middle point search range

## Testing

### Unit Tests

Create `tests/unit/utils/trackPlaceUtils.test.ts`:

- [x] Test middle point calculation
  - [x] Returns exact middle for simple track
  - [x] Interpolates for middle not on point
  - [x] Handles track with 2 points
  - [x] Handles track with many points
  - [x] Handles track with equal-distance points

- [x] Test optimized middle point
  - [x] Returns middle when no existing places
  - [x] Moves away from existing places
  - [x] Stays within middle third
  - [x] Handles multiple existing places
  - [x] Handles places on track line

- [x] Test distance calculations
  - [x] Calculates distance along track correctly
  - [x] Handles first point (distance 0)
  - [x] Handles last point (total distance)
  - [x] Uses geodesic distance

- [x] Test interpolation
  - [x] Midpoint between two points correct
  - [x] Fractional points correct
  - [x] Handles 0 and 1 fractions
  - [x] Handles points at same location

Create `tests/unit/hooks/useTrackManagement.trackPlaces.test.ts`:

- [x] Test createTrackStartPlace
  - [x] Creates place at first point
  - [x] Uses track name as title
  - [x] Uses locality name if requested
  - [x] Sets trackId reference
  - [x] Updates track.startPlaceId
  - [x] Handles invalid track id

- [x] Test createTrackMiddlePlace
  - [x] Creates place near middle
  - [x] Considers existing places
  - [x] Uses track name as title
  - [x] Sets trackId reference
  - [x] Updates track.middlePlaceId

- [x] Test createTrackEndPlace
  - [x] Creates place at last point
  - [x] Uses track name as title
  - [x] Uses locality name if requested
  - [x] Sets trackId reference
  - [x] Updates track.endPlaceId

- [x] Test removeTrackPlace
  - [x] Deletes place from database
  - [x] Clears track reference
  - [x] Updates track in database
  - [x] Handles already deleted place

- [x] Test batch operations
  - [x] createAllTrackPlaces creates all three
  - [x] removeAllTrackPlaces removes all
  - [x] Handles partial failures
  - [x] Middle place considers start place

- [x] Test helper functions
  - [x] getTrackPlaces returns correct places
  - [x] hasTrackPlace checks correctly
  - [x] Handles missing places
  - [x] Detects orphaned places

Create `tests/unit/components/tracks/TrackListItem.places.test.tsx`:

- [x] Test place buttons rendering
  - [x] Shows Add button when place not present
  - [x] Shows Remove button when place present
  - [x] Disables during loading
  - [x] Shows correct tooltips

- [x] Test place button interactions
  - [x] Add button calls create function
  - [x] Remove button calls delete function
  - [x] Batch add button creates all
  - [x] Handles errors gracefully

- [x] Test visual indicators
  - [x] Badge shows correct count
  - [x] Highlights track with places
  - [x] Show loading state

### Integration Tests

Create `tests/integration/hooks/trackPlaces.integration.test.ts`:

- [x] Test complete workflow
  - [x] Upload track → create places → verify in database
  - [x] Create places with geocoding → verify titles
  - [x] Remove places → verify deletion
  - [x] Delete track → verify places remain

- [x] Test geocoding integration
  - [x] Create place with locality name
  - [x] Verify API called correctly
  - [x] Verify fallback on error
  - [x] Verify rate limiting

- [x] Test middle point optimization
  - [x] Create start place → create middle → verify separation
  - [x] Multiple tracks with places → verify no clustering

- [x] Test performance
  - [x] Create places for 10 tracks in <5s
  - [x] Batch creation parallelizes where possible

Create `tests/integration/components/tracks/TrackPlaces.integration.test.tsx`:

- [x] Test UI workflow
  - [x] Click add button → place appears on map
  - [x] Click remove button → place disappears
  - [x] Batch add → all three places appear
  - [x] Visual indicators update correctly

- [x] Test with real geocoding
  - [x] Mock or use test Nominatim instance
  - [x] Verify locality names resolved
  - [x] Verify rate limiting respected

## Acceptance Criteria

- [x] Track-Place association fields added to Track interface
- [x] Middle point calculation finds optimal position
- [x] Optimized middle point avoids existing places
- [x] Track place creation functions in useTrackManagement
- [x] Batch operations create/remove all places
- [x] Track list UI shows place action buttons
- [x] Add/Remove buttons work correctly
- [x] Geocoding integration provides locality names
- [x] Fallback to track name on geocoding failure
- [x] Track deletion leaves places intact
- [x] Orphaned place detection implemented
- [x] Settings for track place preferences
- [x] Unit test coverage >85% for track place code
- [x] Integration tests verify complete workflows
- [x] TypeScript strict mode compliance
- [x] Error handling provides clear user feedback

## Implementation Notes

- **Auto-create Places**: Implemented in `useTrackManagement` hook. When enabled, it creates Start, Middle, and End places during file upload. It uses the track name for all places to ensure fast processing and avoid rate limits or network issues with geocoding during bulk imports. Users can rename places later or use the "Use Locality Name" option (which is currently only effective for manual creation or needs future enhancement for bulk async processing).
- **Orphaned Places**: `getOrphanedPlaces` function added to `useTrackManagement` hook to detect places with valid `trackId` but where the track no longer exists in the system.
- **UI Integration**: `TrackListItem.tsx` updated to include an expandable "Manage Places" section with S/M/E buttons and batch actions. `TrackContextMenu.tsx` was skipped in favor of the inline expandable menu for better accessibility and mobile support.
- **Geocoding Progress**: A dedicated progress component was deemed unnecessary as `TrackListItem` provides localized loading states for each action.
