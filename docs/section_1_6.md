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

- [ ] Add track place association fields
  ```typescript
  interface Track {
    // ... existing fields
    startPlaceId?: string;
    middlePlaceId?: string;
    endPlaceId?: string;
  }
  ```

- [ ] Add helper types
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

- [ ] Implement middle point calculation
  - [ ] `findTrackMiddlePoint(track: Track): Point`
    - Calculate cumulative distance along track
    - Find point at 50% total distance
    - If exact point not found, interpolate between adjacent points
    - Return [latitude, longitude] tuple

- [ ] Implement optimized middle point
  - [ ] `findOptimalMiddlePoint(track: Track, existingPlaces: Place[]): Point`
    - Calculate middle third of track (33% to 66% distance)
    - Sample N candidate points (e.g., 10 points)
    - For each candidate, calculate distance to nearest existing place
    - Select candidate with maximum distance to nearest place
    - Return optimal point coordinates
    - If no existing places, return exact middle point

- [ ] Implement distance calculations
  - [ ] `calculateDistanceAlongTrack(track: Track, pointIndex: number): number`
    - Sum distances from start to given point index
    - Use Leaflet's geodesic distance
    - Return distance in kilometers

  - [ ] `calculateTotalTrackDistance(track: Track): number`
    - Return track.length (already calculated)
    - Or recalculate if not present

- [ ] Implement interpolation
  - [ ] `interpolatePoint(point1: Point, point2: Point, fraction: number): Point`
    - Linear interpolation between two points
    - fraction: 0 = point1, 1 = point2, 0.5 = midpoint
    - Handle latitude/longitude correctly (no wrap-around for now)
    - Return interpolated point

### Track Place Creation

Extend `src/hooks/useTrackManagement.ts`:

- [ ] Add track place creation functions
  - [ ] `createTrackStartPlace(trackId: string, useLocalityName: boolean = false): Promise<Place>`
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

  - [ ] `createTrackMiddlePlace(trackId: string, useLocalityName: boolean = false): Promise<Place>`
    - Get track by id
    - Get all existing places
    - Calculate optimal middle point
    - Determine title (geocoded or track name)
    - Create place with source 'track-middle'
    - Set trackId reference
    - Save to database
    - Update track.middlePlaceId
    - Return created place

  - [ ] `createTrackEndPlace(trackId: string, useLocalityName: boolean = false): Promise<Place>`
    - Get track by id
    - Extract last point
    - Determine title (geocoded or track name)
    - Create place with source 'track-end'
    - Set trackId reference
    - Save to database
    - Update track.endPlaceId
    - Return created place

  - [ ] `removeTrackPlace(trackId: string, type: TrackPlaceType): Promise<void>`
    - Get track by id
    - Get place id from track (startPlaceId, middlePlaceId, or endPlaceId)
    - Delete place from database
    - Clear track place reference
    - Update track in database
    - Update local state

- [ ] Add batch track place operations
  - [ ] `createAllTrackPlaces(trackId: string, useLocalityName: boolean = false): Promise<{ start: Place, middle: Place, end: Place }>`
    - Create all three places for track
    - Execute in sequence (start → middle → end)
    - Middle calculation considers start place
    - Return all created places

  - [ ] `removeAllTrackPlaces(trackId: string): Promise<void>`
    - Remove start, middle, and end places
    - Execute in parallel
    - Clear all track references
    - Update track in database

- [ ] Add helper functions
  - [ ] `getTrackPlaces(trackId: string): Promise<Place[]>`
    - Query places with matching trackId
    - Return array of associated places
    - Sort by source (start, middle, end)

  - [ ] `hasTrackPlace(trackId: string, type: TrackPlaceType): boolean`
    - Check if track has place of given type
    - Use track.startPlaceId, middlePlaceId, or endPlaceId
    - Return boolean

### Track List UI Integration

Modify `src/components/tracks/TrackListItem.tsx` (or equivalent):

- [ ] Add place action buttons
  - [ ] Group place buttons in expandable section
  - [ ] Show on hover or when expanded
  - [ ] Three button groups: Start, Middle, End
  - [ ] Each group has Add/Remove toggle
  - [ ] Icon indicates current state (filled/empty pin)

- [ ] Implement Add Place button
  - [ ] Click calls createTrackPlace function
  - [ ] Show loading indicator during creation
  - [ ] Show success notification
  - [ ] Update button to Remove state
  - [ ] Handle errors with user message
  - [ ] Tooltip: "Add start/middle/end place"

- [ ] Implement Remove Place button
  - [ ] Click calls removeTrackPlace function
  - [ ] Show confirmation dialog (optional)
  - [ ] Show loading indicator during deletion
  - [ ] Update button to Add state
  - [ ] Handle errors with user message
  - [ ] Tooltip: "Remove start/middle/end place"

- [ ] Implement Batch Add All button
  - [ ] Button above individual buttons
  - [ ] Click calls createAllTrackPlaces
  - [ ] Show progress (1/3, 2/3, 3/3)
  - [ ] Disable during creation
  - [ ] Show success notification with count
  - [ ] Tooltip: "Add all track places"

- [ ] Add visual indicators
  - [ ] Badge showing place count (0-3)
  - [ ] Highlight track when places visible
  - [ ] Show geocoding status (loading, success, error)

### Context Menu Integration

Create `src/components/tracks/TrackContextMenu.tsx` (optional):

- [ ] Implement right-click context menu
  - [ ] Show on track row right-click
  - [ ] Menu items:
    - Add Start Place
    - Add Middle Place
    - Add End Place
    - Add All Places
    - Separator
    - Remove All Places
  - [ ] Disable items based on state
  - [ ] Close menu after action

### Geocoding Progress

Create `src/components/places/GeocodingProgress.tsx`:

- [ ] Implement progress indicator
  - [ ] Show during batch place creation
  - [ ] Display current operation (e.g., "Geocoding start point...")
  - [ ] Progress bar or spinner
  - [ ] Cancel button to abort
  - [ ] Success/error status per place

- [ ] Integrate with track operations
  - [ ] Show when creating multiple places
  - [ ] Update progress after each place
  - [ ] Close automatically on completion
  - [ ] Show summary on completion

### Error Handling

Extend error handling in place creation:

- [ ] Handle geocoding failures
  - [ ] Network timeout
  - [ ] Rate limit exceeded (queue and retry)
  - [ ] No results found (fallback to track name)
  - [ ] User-friendly error messages

- [ ] Handle track not found
  - [ ] Check track exists before creating place
  - [ ] Handle track deleted during operation
  - [ ] Clean error message

- [ ] Handle database errors
  - [ ] Save failure rollback (remove partially created places)
  - [ ] Update failure (track reference inconsistency)
  - [ ] Retry logic for transient errors

### Track Deletion Handling

Modify track deletion logic in `src/hooks/useTrackManagement.ts`:

- [ ] Update deleteTrack function
  - [ ] Places are NOT deleted when track deleted
  - [ ] Places remain visible with null trackId
  - [ ] Place title unchanged
  - [ ] Place source remains track-start/middle/end
  - [ ] User can manually delete orphaned places
  - [ ] Optional: Show "Track deleted" indicator on place

- [ ] Add orphaned place detection
  - [ ] `getOrphanedPlaces(): Place[]`
    - Find places with trackId that doesn't exist
    - Return array of orphaned places
  - [ ] Show warning in UI (optional)
  - [ ] Bulk delete option for orphaned places

### Settings Integration

Add to `src/hooks/useExportState.ts` or create place settings:

- [ ] Add track place preferences
  - [ ] defaultUseLocalityName: boolean (default false)
  - [ ] autoCreatePlaces: boolean (default false - auto-create on track upload)
  - [ ] middlePointSearchRadius: number (default 33-66% range)
  - [ ] Persist to localStorage

- [ ] Implement settings UI
  - [ ] Toggle for locality name vs track name
  - [ ] Toggle for auto-creation on upload
  - [ ] Slider for middle point search range

## Testing

### Unit Tests

Create `tests/unit/utils/trackPlaceUtils.test.ts`:

- [ ] Test middle point calculation
  - [ ] Returns exact middle for simple track
  - [ ] Interpolates for middle not on point
  - [ ] Handles track with 2 points
  - [ ] Handles track with many points
  - [ ] Handles track with equal-distance points

- [ ] Test optimized middle point
  - [ ] Returns middle when no existing places
  - [ ] Moves away from existing places
  - [ ] Stays within middle third
  - [ ] Handles multiple existing places
  - [ ] Handles places on track line

- [ ] Test distance calculations
  - [ ] Calculates distance along track correctly
  - [ ] Handles first point (distance 0)
  - [ ] Handles last point (total distance)
  - [ ] Uses geodesic distance

- [ ] Test interpolation
  - [ ] Midpoint between two points correct
  - [ ] Fractional points correct
  - [ ] Handles 0 and 1 fractions
  - [ ] Handles points at same location

Create `tests/unit/hooks/useTrackManagement.trackPlaces.test.ts`:

- [ ] Test createTrackStartPlace
  - [ ] Creates place at first point
  - [ ] Uses track name as title
  - [ ] Uses locality name if requested
  - [ ] Sets trackId reference
  - [ ] Updates track.startPlaceId
  - [ ] Handles invalid track id

- [ ] Test createTrackMiddlePlace
  - [ ] Creates place near middle
  - [ ] Considers existing places
  - [ ] Uses track name as title
  - [ ] Sets trackId reference
  - [ ] Updates track.middlePlaceId

- [ ] Test createTrackEndPlace
  - [ ] Creates place at last point
  - [ ] Uses track name as title
  - [ ] Uses locality name if requested
  - [ ] Sets trackId reference
  - [ ] Updates track.endPlaceId

- [ ] Test removeTrackPlace
  - [ ] Deletes place from database
  - [ ] Clears track reference
  - [ ] Updates track in database
  - [ ] Handles already deleted place

- [ ] Test batch operations
  - [ ] createAllTrackPlaces creates all three
  - [ ] removeAllTrackPlaces removes all
  - [ ] Handles partial failures
  - [ ] Middle place considers start place

- [ ] Test helper functions
  - [ ] getTrackPlaces returns correct places
  - [ ] hasTrackPlace checks correctly
  - [ ] Handles missing places

Create `tests/unit/components/tracks/TrackListItem.places.test.tsx`:

- [ ] Test place buttons rendering
  - [ ] Shows Add button when place not present
  - [ ] Shows Remove button when place present
  - [ ] Disables during loading
  - [ ] Shows correct tooltips

- [ ] Test place button interactions
  - [ ] Add button calls create function
  - [ ] Remove button calls delete function
  - [ ] Batch add button creates all
  - [ ] Handles errors gracefully

- [ ] Test visual indicators
  - [ ] Badge shows correct count
  - [ ] Highlights track with places
  - [ ] Shows loading state

### Integration Tests

Create `tests/integration/hooks/trackPlaces.integration.test.ts`:

- [ ] Test complete workflow
  - [ ] Upload track → create places → verify in database
  - [ ] Create places with geocoding → verify titles
  - [ ] Remove places → verify deletion
  - [ ] Delete track → verify places remain

- [ ] Test geocoding integration
  - [ ] Create place with locality name
  - [ ] Verify API called correctly
  - [ ] Verify fallback on error
  - [ ] Verify rate limiting

- [ ] Test middle point optimization
  - [ ] Create start place → create middle → verify separation
  - [ ] Multiple tracks with places → verify no clustering

- [ ] Test performance
  - [ ] Create places for 10 tracks in <5s
  - [ ] Batch creation parallelizes where possible

Create `tests/integration/components/tracks/TrackPlaces.integration.test.tsx`:

- [ ] Test UI workflow
  - [ ] Click add button → place appears on map
  - [ ] Click remove button → place disappears
  - [ ] Batch add → all three places appear
  - [ ] Visual indicators update correctly

- [ ] Test with real geocoding
  - [ ] Mock or use test Nominatim instance
  - [ ] Verify locality names resolved
  - [ ] Verify rate limiting respected

## Acceptance Criteria

- [ ] Track-Place association fields added to Track interface
- [ ] Middle point calculation finds optimal position
- [ ] Optimized middle point avoids existing places
- [ ] Track place creation functions in useTrackManagement
- [ ] Batch operations create/remove all places
- [ ] Track list UI shows place action buttons
- [ ] Add/Remove buttons work correctly
- [ ] Geocoding integration provides locality names
- [ ] Fallback to track name on geocoding failure
- [ ] Track deletion leaves places intact
- [ ] Orphaned place detection implemented
- [ ] Settings for track place preferences
- [ ] Unit test coverage >85% for track place code
- [ ] Integration tests verify complete workflows
- [ ] TypeScript strict mode compliance
- [ ] Error handling provides clear user feedback

## Notes

### Middle Point Optimization Algorithm

```
1. Calculate track cumulative distances
2. Find middle third range (33%-66% of total distance)
3. Sample N candidate points uniformly in middle third (e.g., N=10)
4. For each candidate:
   a. Calculate distance to nearest existing place
   b. Store candidate with distance score
5. Select candidate with maximum distance score
6. If no existing places, use exact 50% point
```

Time complexity: O(n × m) where n = candidate count, m = existing places count
For n=10, m=100: 1000 operations (negligible)

### Geocoding vs Track Name

**Use Track Name when:**
- User prefers consistent labeling
- Track name is descriptive (e.g., "Mount Rainier Summit")
- Offline usage required
- Fast creation needed

**Use Locality Name when:**
- Track name is generic (e.g., "Morning Run")
- Geographic context important
- Export for sharing with others
- Internet connection available

Default to track name for speed and reliability.

### Track Place Reference Behavior

**When track deleted:**
- Place remains in database
- Place.trackId still references deleted track
- Place visible and editable
- No cascading delete
- User can manually delete if desired

**Rationale:**
- User may want to keep place even after removing track
- Avoids accidental data loss
- Allows track re-import without losing places
- Consistent with "places are independent entities" model

### Button Layout Suggestion

```
Track Name                   [Places 2/3]
                            [● ○ ●]
                            S  M  E
```

Or expanded:
```
Track Name
  Places:
    [Remove Start]   [Add Middle]   [Remove End]
    [Add All Places]
```

### Performance Considerations

- Geocoding is slow (1 req/second rate limit)
- Batch operations should show progress
- Consider queuing geocoding requests
- Cache geocoding results by coordinates
- Parallel creation where possible (multiple tracks)
- Show loading indicators for user feedback

### Future Enhancements

- Custom place types (summit, water stop, photo spot)
- Snap middle point to specific track feature (elevation max, turn point)
- Multiple middle points (quartiles)
- Import places from GPX waypoints
- Bulk create places for all tracks
- Smart naming (e.g., "Start of Morning Run", "Middle of Bike Ride")
