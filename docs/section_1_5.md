# Section 1.5: Title Positioning Algorithm

## Overview

Implement intelligent positioning algorithm to place place titles left or right of their location markers, minimizing overlap with other place titles and maximizing readability.

## Dependencies

**Required:** 1.4 (Place Rendering Engine - needs text bounds calculation)
**Blocks:** None (optimization feature)

## Complexity

**Level:** High
**Scope:** Medium

## Algorithm Overview

The positioning algorithm determines whether each place's title should appear to the left or right of its icon. The algorithm prioritizes:
1. Keeping title within export bounds (if possible)
2. Maximizing distance to other place titles (minimize overlap)
3. Consistent positioning where possible (avoid flip-flopping)

## Tasks

### Position Types

Add to `src/types.ts`:

- [ ] Define positioning types
  ```typescript
  type PlaceTitlePosition = 'left' | 'right';

  interface PlaceTitleBounds {
    placeId: string;
    position: PlaceTitlePosition;
    bounds: DOMRect;              // Screen coordinates
    geoBounds: LatLngBounds;      // Geographic coordinates
  }

  interface PositioningConstraints {
    exportBounds?: LatLngBounds;  // Preferred boundary (can exceed)
    minDistance: number;          // Minimum pixels between titles
    preferredGap: number;         // Preferred pixels between titles
  }
  ```

### Distance Calculation Utilities

Create `src/utils/positioningUtils.ts`:

- [ ] Implement bounding box distance calculation
  - [ ] `getDistance(bounds1: DOMRect, bounds2: DOMRect): number`
    - Calculate minimum distance between two rectangles
    - Return 0 if overlapping
    - Return edge-to-edge distance if not overlapping
    - Use Euclidean distance for diagonal cases

- [ ] Implement overlap detection
  - [ ] `hasOverlap(bounds1: DOMRect, bounds2: DOMRect, buffer: number = 0): boolean`
    - Check if rectangles overlap with optional buffer
    - Buffer adds padding around rectangles
    - Return true if any overlap exists

- [ ] Implement bounds containment check
  - [ ] `isWithinBounds(titleBounds: DOMRect, containerBounds: DOMRect): boolean`
    - Check if title fully contained within container
    - Used for export bounds constraint
    - Return true if completely inside

- [ ] Implement geographic to pixel conversion
  - [ ] `geoBoundsToPixelBounds(geoBounds: LatLngBounds, map: Leaflet.Map): DOMRect`
    - Convert geographic bounds to screen pixel bounds
    - Use Leaflet map projection
    - Return DOMRect in pixel coordinates

- [ ] Implement overlap area calculation
  - [ ] `getOverlapArea(bounds1: DOMRect, bounds2: DOMRect): number`
    - Calculate area of intersection between rectangles
    - Return 0 if no overlap
    - Used for overlap minimization scoring

### Position Scoring System

Create `src/services/positionScoring.ts`:

- [ ] Implement position scoring
  - [ ] `scorePosition(titleBounds: DOMRect, position: PlaceTitlePosition, existingBounds: PlaceTitleBounds[], constraints: PositioningConstraints): number`
    - Calculate score for a potential title position
    - Higher score = better position
    - Scoring factors:
      - Within export bounds: +1000 bonus
      - Distance to nearest neighbor: +10 per pixel (up to preferredGap)
      - Overlap penalty: -1000 per overlapping title
      - Overlap area penalty: -10 per square pixel of overlap
    - Return total score

- [ ] Implement batch scoring
  - [ ] `scoreBothPositions(placeId: string, iconX: number, iconY: number, titleWidth: number, titleHeight: number, existingBounds: PlaceTitleBounds[], constraints: PositioningConstraints): { left: number, right: number }`
    - Calculate left title bounds
    - Calculate right title bounds
    - Score both positions
    - Return both scores

- [ ] Implement optimal selection
  - [ ] `selectBestPosition(leftScore: number, rightScore: number, bias?: PlaceTitlePosition): PlaceTitlePosition`
    - Choose higher scoring position
    - Apply bias if scores within 10% (prefer consistency)
    - Default to right if scores equal
    - Return selected position

### Title Bounds Calculation

Extend `src/utils/placeTextRenderer.ts`:

- [ ] Implement bounds calculation for positioning
  - [ ] `calculateTitleBounds(place: Place, titleLines: string[], fontSize: number, iconX: number, iconY: number, position: PlaceTitlePosition, padding: number): DOMRect`
    - Calculate bounding box for title at given position
    - Position 'left': right edge touches icon left edge minus gap
    - Position 'right': left edge touches icon right edge plus gap
    - Vertical center aligns with icon vertical center
    - Add padding for buffer zone
    - Return DOMRect with {x, y, width, height}

- [ ] Implement geographic bounds calculation
  - [ ] `titleBoundsToGeoBounds(pixelBounds: DOMRect, map: Leaflet.Map): LatLngBounds`
    - Convert pixel title bounds to geographic bounds
    - Use Leaflet unproject for corners
    - Return LatLngBounds
    - Used for subdivision filtering

### Positioning Algorithm

Create `src/services/titlePositioningService.ts`:

- [ ] Implement main positioning algorithm
  - [ ] `calculateOptimalPositions(places: Place[], map: Leaflet.Map, settings: ExportSettings, constraints?: PositioningConstraints): Map<string, PlaceTitlePosition>`
    - Sort places by priority (larger titles first, then south to north)
    - Initialize result map
    - Initialize array of positioned title bounds
    - For each place:
      - Calculate icon position in pixels
      - Calculate title dimensions (with wrapping)
      - Score both left and right positions
      - Select best position
      - Add positioned bounds to array
      - Store position in result map
    - Return map of placeId → position

- [ ] Implement iterative refinement (optional optimization)
  - [ ] `refinePositions(places: Place[], initialPositions: Map<string, PlaceTitlePosition>, map: Leaflet.Map, settings: ExportSettings, maxIterations: number = 3): Map<string, PlaceTitlePosition>`
    - Start with initial positions
    - For each iteration:
      - Find place with worst score (most overlap)
      - Try flipping its position
      - Keep change if improves global score
      - Stop if no improvements found
    - Return refined positions

- [ ] Implement conflict resolution
  - [ ] `resolveConflicts(titleBounds: PlaceTitleBounds[], constraints: PositioningConstraints): PlaceTitleBounds[]`
    - Detect overlapping titles
    - For overlaps, try micro-adjustments:
      - Shift vertically by line height
      - Flip position of lower-priority place
      - Accept overlap if unavoidable
    - Return adjusted bounds

- [ ] Implement constraints
  - [ ] Default constraints:
    - minDistance: 5 pixels
    - preferredGap: 20 pixels
    - exportBounds: from export settings (can be exceeded)
  - [ ] Allow custom constraints for testing

### Integration with Rendering

Modify `src/services/placeRenderingService.ts`:

- [ ] Update renderPlacesOnCanvas to use positioning algorithm
  - [ ] Call calculateOptimalPositions before rendering
  - [ ] Pass positions to renderPlace calls
  - [ ] Store positions in cache for hover detection
  - [ ] Invalidate cache on zoom/pan/settings change

- [ ] Update renderPlace signature
  - [ ] Add position parameter
  - [ ] Use position to determine text x-coordinate
  - [ ] Calculate text bounds for return value

- [ ] Add position caching
  - [ ] Cache positions per zoom level
  - [ ] Invalidate on place changes
  - [ ] Invalidate on settings changes
  - [ ] Use WeakMap for automatic cleanup

### Preview Integration

Modify `src/components/MapComponent.tsx`:

- [ ] Update preview rendering to show positions
  - [ ] Calculate positions on render
  - [ ] Cache positions for interaction
  - [ ] Update on zoom with debounce
  - [ ] Show debug overlay (optional dev mode)

- [ ] Add debug visualization (dev mode only)
  - [ ] Render title bounding boxes
  - [ ] Show distance measurements
  - [ ] Highlight overlaps in red
  - [ ] Toggle with URL parameter or dev tools

### Settings Integration

Modify `src/hooks/useExportState.ts`:

- [ ] Add positioning settings
  - [ ] preferredTitleGap: number (default 20)
  - [ ] allowOverlap: boolean (default true - unavoidable for dense places)
  - [ ] optimizePositions: boolean (default true - enable iterative refinement)

- [ ] Persist settings to localStorage
  - [ ] Load on mount
  - [ ] Save on change
  - [ ] Provide defaults

## Testing

### Unit Tests

Create `tests/unit/utils/positioningUtils.test.ts`:

- [ ] Test distance calculations
  - [ ] Adjacent rectangles return correct distance
  - [ ] Overlapping rectangles return 0
  - [ ] Diagonal rectangles return Euclidean distance
  - [ ] Same rectangle returns 0

- [ ] Test overlap detection
  - [ ] Detects overlapping rectangles
  - [ ] Detects non-overlapping rectangles
  - [ ] Buffer parameter works correctly
  - [ ] Edge touching cases handled correctly

- [ ] Test bounds containment
  - [ ] Fully contained returns true
  - [ ] Partially outside returns false
  - [ ] Fully outside returns false
  - [ ] Exactly on boundary returns true

- [ ] Test coordinate conversions
  - [ ] Geographic to pixel conversion correct
  - [ ] Pixel to geographic conversion correct
  - [ ] Round-trip conversion preserves bounds

Create `tests/unit/services/positionScoring.test.ts`:

- [ ] Test position scoring
  - [ ] Within bounds gives bonus
  - [ ] Outside bounds no penalty (allowed)
  - [ ] Distance to neighbors increases score
  - [ ] Overlap decreases score significantly
  - [ ] Overlap area affects score

- [ ] Test batch scoring
  - [ ] Calculates both left and right scores
  - [ ] Returns correct scores
  - [ ] Handles edge cases (no neighbors)

- [ ] Test optimal selection
  - [ ] Selects higher score
  - [ ] Applies bias when scores close
  - [ ] Defaults to right when equal
  - [ ] Bias works correctly

Create `tests/unit/services/titlePositioningService.test.ts`:

- [ ] Test positioning algorithm
  - [ ] Single place positions correctly
  - [ ] Multiple non-overlapping places position correctly
  - [ ] Overlapping places minimize overlap
  - [ ] Priority sorting works (south to north)
  - [ ] Larger titles positioned first
  - [ ] Export bounds constraint considered

- [ ] Test iterative refinement
  - [ ] Improves initial positions
  - [ ] Stops after max iterations
  - [ ] Stops when no improvement
  - [ ] Doesn't make positions worse

- [ ] Test conflict resolution
  - [ ] Detects overlaps
  - [ ] Applies micro-adjustments
  - [ ] Accepts unavoidable overlaps
  - [ ] Doesn't create new conflicts

- [ ] Test edge cases
  - [ ] Empty place array
  - [ ] Single place
  - [ ] All places on same line (vertical)
  - [ ] All places on same line (horizontal)
  - [ ] Places spanning export bounds
  - [ ] Very long titles
  - [ ] 100 places (performance)

### Integration Tests

Create `tests/integration/services/titlePositioning.integration.test.ts`:

- [ ] Test with real canvas and Leaflet
  - [ ] Position places on real map
  - [ ] Render with real text measurements
  - [ ] Verify no overlaps when possible
  - [ ] Verify bounds calculations correct
  - [ ] Visual snapshot testing

- [ ] Test complete workflow
  - [ ] Add 10 random places
  - [ ] Calculate positions
  - [ ] Render to canvas
  - [ ] Measure actual overlaps
  - [ ] Assert overlap below threshold

- [ ] Test performance
  - [ ] 100 places positioned in <500ms
  - [ ] Iterative refinement completes in <200ms
  - [ ] Caching reduces re-calculation time

- [ ] Test at different zoom levels
  - [ ] Positions update appropriately
  - [ ] Text size scaling works
  - [ ] Icon spacing maintained

Create `tests/integration/components/places/PlacePositioning.integration.test.tsx`:

- [ ] Test preview positioning
  - [ ] Positions update on pan/zoom
  - [ ] Positions cached appropriately
  - [ ] Cache invalidated on changes
  - [ ] No position flickering

- [ ] Test export positioning
  - [ ] High-resolution positions correct
  - [ ] Subdivision positions consistent
  - [ ] Text doesn't clip at edges

## Acceptance Criteria

- [ ] PlaceTitlePosition type and related interfaces defined
- [ ] Distance and overlap utilities implemented
- [ ] Position scoring system calculates meaningful scores
- [ ] Title bounds calculation accurate for both positions
- [ ] Main positioning algorithm minimizes overlaps
- [ ] Iterative refinement improves positions
- [ ] Integration with rendering service complete
- [ ] Preview shows positions correctly
- [ ] Export uses optimized positions
- [ ] Debug visualization available (dev mode)
- [ ] Unit test coverage >85% for positioning code
- [ ] Integration tests verify real-world scenarios
- [ ] Performance target: 100 places in <500ms
- [ ] TypeScript strict mode compliance
- [ ] Algorithm handles edge cases gracefully

## Notes

### Algorithm Complexity

Time complexity: O(n²) where n = number of places
- Each place scored against all existing positions
- Acceptable for n < 100
- Consider spatial indexing (R-tree) if scaling beyond 100

### Priority Ordering

Places positioned in this order:
1. **Title size**: Larger titles harder to place, position first
2. **Latitude**: South to north (bottom to top)
3. **Longitude**: West to east (left to right) as tiebreaker

### Scoring Weights

Fine-tune these based on testing:
- Within bounds bonus: +1000 (strong preference but not required)
- Distance per pixel: +10 (up to preferredGap)
- Overlap penalty: -1000 per overlapping title (very undesirable)
- Overlap area penalty: -10 per square pixel (minimize overlap amount)

### Export Bounds Behavior

Unlike strict clipping, title can extend outside export bounds if:
- Placing inside would cause severe overlap
- Place is near boundary
This ensures all place titles are visible and readable.

### Micro-adjustment Strategy

For conflict resolution, try in order:
1. Shift up by one line height
2. Shift down by one line height
3. Flip position (left ↔ right)
4. Accept overlap (last resort)

### Caching Strategy

Cache positions at each zoom level:
- Key: zoom level + place data hash
- Invalidate on: place add/delete/update, settings change
- Use WeakMap for automatic memory management
- Cache hit rate should be >90% during normal pan/zoom

### Performance Optimizations

- Early exit if no conflicts (all scores positive)
- Skip iterative refinement if initial placement good enough
- Use spatial indexing for neighbor lookups if n > 100
- Debounce position recalculation in preview (300ms)
- Only recalculate on integer zoom changes (not during animation)

### Future Enhancements

- Curved text following track line
- Multi-position options (top, bottom, diagonal)
- Clustering for very dense areas
- Manual position override per place
- Position locking (prevent algorithm from moving specific places)
