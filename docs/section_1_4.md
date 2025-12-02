# Section 1.4: Place Rendering Engine

## Overview

Implement canvas-based rendering of places with titles, icons, and text styling effects for both preview map and high-resolution exports.

## Dependencies

**Required:** 1.1 (Data Model and Persistence)
**Blocks:** 1.5 (Title Positioning), 1.7 (Interactive Editing)

## Complexity

**Level:** Medium
**Scope:** Medium

## Architecture

Places render as an additional export layer similar to tracks/lines. Rendering occurs in two contexts:
1. **Preview**: Real-time rendering on Leaflet canvas overlay
2. **Export**: High-resolution rendering during image generation

## Tasks

### Text Styling Configuration

Extend `src/types.ts`:

- [ ] Define text styling interface
  ```typescript
  interface PlaceTextStyle {
    fontSize: number;           // Base font size (scaled by title size slider)
    fontFamily: string;         // Default: 'Noto Sans'
    fontWeight: string;         // Default: 'bold'
    color: string;             // Hex color or 'auto'
    strokeColor?: string;       // Drop shadow color
    strokeWidth?: number;       // Drop shadow width
    glowColor?: string;         // Glow effect color
    glowBlur?: number;          // Glow blur radius
  }

  interface PlaceIconConfig {
    style: PlaceIconStyle;      // 'pin' | 'dot' | 'circle' | 'marker' | 'flag' | 'star'
    size: number;               // Icon size in pixels
    color: string;              // Icon color (hex)
  }

  type PlaceIconStyle = 'pin' | 'dot' | 'circle' | 'marker' | 'flag' | 'star';
  ```

- [ ] Update Place interface to include rendering config
  ```typescript
  interface Place {
    // ... existing fields
    textStyle?: PlaceTextStyle;
    iconConfig?: PlaceIconConfig;
  }
  ```

- [ ] Add global place render settings to export state
  ```typescript
  interface ExportSettings {
    // ... existing fields
    includePlaces: boolean;           // Toggle places layer
    placeTitleSize: number;           // 1-100 scale
    placeShowIconsGlobally: boolean;  // Global icon visibility
    placeTextStyle: PlaceTextStyle;   // Global text styling
  }
  ```

### Icon Rendering Utilities

Create `src/utils/placeIconRenderer.ts`:

- [ ] Implement icon rendering functions
  - [ ] `renderPinIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string)`
    - Draw teardrop pin shape with point at x,y
    - Pin should be centered horizontally on point
    - Include circular highlight at top
    - Cast subtle shadow if enabled
    - Size determines overall dimensions

  - [ ] `renderDotIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string)`
    - Draw filled circle centered at x,y
    - Add white border for contrast
    - Size determines diameter

  - [ ] `renderCircleIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string)`
    - Draw hollow circle centered at x,y
    - Thick stroke for visibility
    - White background fill for contrast

  - [ ] `renderMarkerIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string)`
    - Draw map marker shape (rounded square with point)
    - Similar to pin but more geometric
    - Point at x,y

  - [ ] `renderFlagIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string)`
    - Draw flag on pole with point at x,y
    - Triangular or rectangular flag
    - Pole extends downward from point

  - [ ] `renderStarIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string)`
    - Draw 5-pointed star centered at x,y
    - Filled with color
    - White border for contrast

- [ ] Implement icon factory
  - [ ] `renderIcon(ctx: CanvasRenderingContext2D, style: PlaceIconStyle, x: number, y: number, size: number, color: string)`
    - Switch on style and call appropriate render function
    - Default to 'pin' if style invalid

- [ ] Implement icon shadow rendering
  - [ ] `renderIconShadow(ctx: CanvasRenderingContext2D, style: PlaceIconStyle, x: number, y: number, size: number)`
    - Render semi-transparent shadow offset from icon
    - Blur effect for soft shadow
    - Only for 3D-style icons (pin, marker, flag)

- [ ] Cache rendered icons
  - [ ] Create offscreen canvas for each icon style/size/color combination
  - [ ] Reuse cached canvas when rendering multiple places with same config
  - [ ] Clear cache on style changes
  - [ ] LRU cache with max 50 entries

### Text Rendering Utilities

Create `src/utils/placeTextRenderer.ts`:

- [ ] Implement text wrapping
  - [ ] `wrapText(text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[]`
    - Split text into words
    - Measure word widths with measureText
    - Group words into lines under maxWidth
    - Break long words with hyphen if needed
    - Return array of lines (max 4 lines)
    - Add ellipsis to last line if truncated

- [ ] Implement text measurement
  - [ ] `measureTextBounds(lines: string[], fontSize: number, fontFamily: string, ctx: CanvasRenderingContext2D): { width: number, height: number }`
    - Calculate bounding box for wrapped text
    - Account for line height (1.2x fontSize)
    - Return width of widest line and total height

- [ ] Implement auto text color
  - [ ] `getAutoTextColor(lat: number, lon: number, zoom: number, tileLayer: TileLayer): Promise<string>`
    - Sample tile pixel colors at location
    - Calculate average brightness
    - Return white text for dark backgrounds
    - Return black text for light backgrounds
    - Use RGB to perceived brightness formula: (0.299*R + 0.587*G + 0.114*B)
    - Threshold at 128 for black/white decision
    - Cache results for same location/zoom/layer

- [ ] Implement text effects rendering
  - [ ] `renderTextWithEffects(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, style: PlaceTextStyle)`
    - Apply drop shadow if enabled
      - Save context state
      - Set shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY
      - Render text
      - Restore context
    - Apply glow effect if enabled
      - Render text multiple times with increasing blur
      - Use strokeText with glow color
      - Layer renders for smooth glow
    - Render final text
      - Set font from style
      - Set fillStyle to text color
      - fillText for each line with line height spacing
    - Return final bounding box

- [ ] Implement text stroke (outline) rendering
  - [ ] `renderTextStroke(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, strokeColor: string, strokeWidth: number)`
    - Render text outline for contrast against any background
    - Use strokeText with specified color and width
    - Render before main text fill

### Place Rendering Service

Create `src/services/placeRenderingService.ts`:

- [ ] Implement place rendering pipeline
  - [ ] `renderPlacesOnCanvas(canvas: HTMLCanvasElement, places: Place[], bounds: LatLngBounds, zoom: number, settings: ExportSettings): void`
    - Filter places by visibility and bounds
    - Calculate pixel positions for each place
    - Sort places by latitude (south to north) for proper layering
    - Render icons first (bottom layer)
    - Render text after (top layer)
    - Use Leaflet's latLngToContainerPoint for coordinate conversion

- [ ] Implement single place rendering
  - [ ] `renderPlace(ctx: CanvasRenderingContext2D, place: Place, x: number, y: number, settings: ExportSettings): PlaceRenderResult`
    - Calculate effective title size from settings.placeTitleSize
    - Wrap title text to max width (200px * titleSize scale)
    - Determine text position (left or right of icon)
    - Render icon if enabled (global setting AND place setting)
    - Resolve 'auto' text color if needed
    - Render text with effects
    - Return bounding box of rendered content
    ```typescript
    interface PlaceRenderResult {
      iconBounds?: DOMRect;
      textBounds?: DOMRect;
      totalBounds: DOMRect;
    }
    ```

- [ ] Implement viewport filtering
  - [ ] `getVisiblePlaces(places: Place[], bounds: LatLngBounds, padding: number): Place[]`
    - Filter places within bounds plus padding
    - Padding accounts for text extending outside viewport
    - Use 500px padding for text that may extend far
    - Return filtered array

- [ ] Implement subdivision-aware rendering
  - [ ] `getPlacesForSubdivision(places: Place[], subdivisionBounds: LatLngBounds, zoom: number, settings: ExportSettings): Place[]`
    - Include places where icon OR text bounding box intersects subdivision
    - Calculate text bounds based on title size and wrapping
    - Account for left/right text positioning
    - Conservative bounds calculation (assume largest possible text extent)
    - Return places to render in subdivision

### Preview Map Integration

Modify `src/components/MapComponent.tsx`:

- [ ] Add canvas overlay for places
  - [ ] Create Canvas layer on top of tracks
  - [ ] Render places on canvas update
  - [ ] Update canvas on map move/zoom
  - [ ] Update canvas on place changes
  - [ ] Debounce render for performance (100ms)

- [ ] Implement place hover detection
  - [ ] Track mouse position on canvas
  - [ ] Check if mouse over place icon or text
  - [ ] Change cursor to pointer on hover
  - [ ] Store hovered place id in state
  - [ ] Use for click interaction (1.7)

- [ ] Implement place render caching
  - [ ] Don't re-render if places haven't changed
  - [ ] Only re-render on zoom/pan if text size changes
  - [ ] Track rendered place bounds for hover detection

### Export Integration

Modify `src/services/exportService.ts`:

- [ ] Add places to export pipeline
  - [ ] Check settings.includePlaces flag
  - [ ] Add place rendering after track rendering
  - [ ] Use same subdivision logic as tracks
  - [ ] Render places on each subdivision canvas

Modify `src/utils/exportHelpers.ts`:

- [ ] Update renderCanvasForBounds
  - [ ] Add places parameter
  - [ ] Add placeSettings parameter
  - [ ] Call placeRenderingService after track rendering
  - [ ] Ensure places render on top of all other layers

- [ ] Update calculateSubdivisions
  - [ ] Consider place bounds when calculating subdivisions
  - [ ] Include places in subdivision metadata
  - [ ] Pass place settings through pipeline

### Export Controls Integration

Modify `src/components/controls/ExportControls.tsx`:

- [ ] Add "Include Places" layer toggle
  - [ ] Checkbox similar to "Include Lines"
  - [ ] Default to true
  - [ ] Persist to localStorage
  - [ ] Disable place-specific controls when unchecked

- [ ] Add place rendering preview
  - [ ] Show example place at current settings
  - [ ] Update preview on text size change
  - [ ] Update preview on text style change

## Testing

### Unit Tests

Create `tests/unit/utils/placeIconRenderer.test.ts`:

- [ ] Test icon rendering functions
  - [ ] Each icon style renders without errors
  - [ ] Icons scale correctly with size parameter
  - [ ] Icons apply color correctly
  - [ ] Shadow rendering works
  - [ ] Icon factory handles all styles
  - [ ] Icon caching works correctly

Create `tests/unit/utils/placeTextRenderer.test.ts`:

- [ ] Test text wrapping
  - [ ] Wraps long text to multiple lines
  - [ ] Respects maxWidth constraint
  - [ ] Handles single word longer than maxWidth
  - [ ] Limits to 4 lines with ellipsis
  - [ ] Handles empty text
  - [ ] Handles text with multiple spaces

- [ ] Test text measurement
  - [ ] Calculates correct bounds for single line
  - [ ] Calculates correct bounds for multiple lines
  - [ ] Accounts for line height
  - [ ] Handles different font sizes

- [ ] Test auto text color
  - [ ] Returns white for dark backgrounds
  - [ ] Returns black for light backgrounds
  - [ ] Caches results correctly
  - [ ] Handles network errors gracefully

- [ ] Test text effects
  - [ ] Drop shadow renders correctly
  - [ ] Glow effect renders correctly
  - [ ] Both effects can be combined
  - [ ] Text stroke renders correctly

Create `tests/unit/services/placeRenderingService.test.ts`:

- [ ] Test place rendering pipeline
  - [ ] Filters places by visibility
  - [ ] Filters places by bounds
  - [ ] Renders all visible places
  - [ ] Renders icons when enabled
  - [ ] Renders text with correct styling
  - [ ] Returns correct bounding boxes

- [ ] Test viewport filtering
  - [ ] Includes places within bounds
  - [ ] Excludes places outside bounds
  - [ ] Includes places with text extending into bounds
  - [ ] Applies padding correctly

- [ ] Test subdivision filtering
  - [ ] Includes places in subdivision
  - [ ] Includes places with text in subdivision
  - [ ] Excludes places completely outside
  - [ ] Handles edge cases (place on boundary)

### Integration Tests

Create `tests/integration/services/placeRendering.integration.test.ts`:

- [ ] Test complete rendering workflow
  - [ ] Create canvas with @napi-rs/canvas
  - [ ] Render places at various zoom levels
  - [ ] Verify pixel output (compare to snapshot)
  - [ ] Test all icon styles render correctly
  - [ ] Test text wrapping with real canvas
  - [ ] Test text effects (shadow, glow) render

- [ ] Test export integration
  - [ ] Places render on export canvas
  - [ ] Places render in subdivisions correctly
  - [ ] Places layer toggle works
  - [ ] Text size scaling works at high resolution

- [ ] Test performance
  - [ ] Render 100 places in <200ms
  - [ ] Icon caching reduces render time
  - [ ] Subdivision filtering improves performance

Create `tests/integration/components/places/PlacePreview.integration.test.tsx`:

- [ ] Test preview rendering
  - [ ] Places appear on map
  - [ ] Places update on pan/zoom
  - [ ] Text size slider updates preview
  - [ ] Text style changes update preview
  - [ ] Icon toggle updates preview

## Acceptance Criteria

- [ ] PlaceTextStyle and PlaceIconConfig types defined
- [ ] Six icon styles implemented (pin, dot, circle, marker, flag, star)
- [ ] Icon rendering with shadows for 3D styles
- [ ] Icon caching for performance
- [ ] Text wrapping with 4-line limit
- [ ] Auto text color based on background brightness
- [ ] Drop shadow and glow effects for text
- [ ] Text stroke (outline) for contrast
- [ ] Place rendering service handles preview and export
- [ ] Subdivision-aware place filtering
- [ ] Canvas overlay on MapComponent for preview
- [ ] Export integration with layer toggle
- [ ] Unit test coverage >85% for rendering code
- [ ] Integration tests verify actual canvas output
- [ ] TypeScript strict mode compliance
- [ ] No performance degradation with 100 places

## Notes

### Icon Design Guidelines

- **Pin**: Classic location marker, point at bottom center
- **Dot**: Simple filled circle, good for dense areas
- **Circle**: Hollow ring, less prominent than dot
- **Marker**: Geometric alternative to pin
- **Flag**: Good for finish lines or destinations
- **Star**: Good for featured locations or summits

### Text Rendering Considerations

- Use Noto Sans font (already loaded in integration tests)
- Bold weight for readability at small sizes
- Line height 1.2x for comfortable reading
- Max 4 lines prevents excessive vertical space
- Ellipsis (...) indicates truncated text

### Auto Text Color Algorithm

Perceived brightness formula (ITU-R BT.601):
```
brightness = (0.299 * R + 0.587 * G + 0.114 * B)
```
- Brightness > 128: use black text
- Brightness ≤ 128: use white text

### Performance Optimizations

- Cache rendered icons in offscreen canvases
- Debounce preview renders to 100ms
- Only re-render on actual changes (compare place data)
- Filter places by subdivision bounds early
- Use conservative bounds for subdivision filtering (better to include than exclude)

### Text Effects Performance

- Drop shadow: minimal cost (native canvas shadow)
- Glow: moderate cost (multiple stroke renders)
- Stroke: minimal cost (single strokeText call)
- Recommend enabling only one effect for optimal performance

### Subdivision Text Handling

Places near subdivision boundaries need special handling:
- Text can extend far (up to 200px * titleSize scale)
- Calculate text bounds conservatively for subdivision filtering
- A place's text may appear in multiple subdivisions
- Better to duplicate in edge subdivisions than omit
