# Section 1.7: Interactive Editing

## Overview

Implement click-to-edit functionality for places on the preview map, displaying a draggable overlay with editing options for title, icon style, visibility, and text styling.

## Dependencies

**Required:**
- 1.2 (UI Components - reuses place editing components)
- 1.4 (Place Rendering - needs click detection on rendered places)

**Blocks:** None (polish feature)

## Complexity

**Level:** Medium
**Scope:** Small-Medium

## Feature Overview

Users can click on a place title or icon on the preview map to open an editing overlay. The overlay is draggable and contains all place editing options.

## Tasks

### Click Detection

Extend `src/components/MapComponent.tsx`:

- [ ] Implement place click detection
  - [ ] Add click event listener to canvas overlay
  - [ ] Get click coordinates relative to canvas
  - [ ] Check if click intersects any place icon or text bounds
  - [ ] Use cached place render results from positioning
  - [ ] Determine which place was clicked (if multiple overlap, pick topmost)
  - [ ] Handle mobile touch events (touchend)

- [ ] Implement hit testing
  - [ ] `isPointInBounds(x: number, y: number, bounds: DOMRect): boolean`
    - Check if point within rectangle
    - Account for click tolerance (add 5px padding)
    - Return true if hit

  - [ ] `getPlaceAtPoint(x: number, y: number, renderedPlaces: Map<string, PlaceRenderResult>): string | null`
    - Iterate rendered places (reverse order for top-to-bottom)
    - Check click against icon bounds
    - Check click against text bounds
    - Return first matching place id
    - Return null if no hit

- [ ] Add click state management
  - [ ] `selectedPlaceId: string | null` - Currently selected place
  - [ ] `editOverlayPosition: { x: number, y: number }` - Overlay screen position
  - [ ] `setSelectedPlace: (id: string | null) => void` - Selection handler

- [ ] Handle click event
  - [ ] On canvas click:
    - Get place id at click point
    - If place found:
      - Set selectedPlaceId
      - Calculate overlay position (near click but not covering place)
      - Open edit overlay
    - If no place found and overlay open:
      - Close overlay (clear selectedPlaceId)

### Edit Overlay Component

Create `src/components/places/PlaceEditOverlay.tsx`:

- [ ] Define component props
  ```typescript
  interface PlaceEditOverlayProps {
    place: Place;
    isOpen: boolean;
    position: { x: number, y: number };
    onClose: () => void;
    onUpdate: (updates: Partial<Place>) => void;
    onDelete: () => void;
    textStyleOptions: PlaceTextStyle;
    onTextStyleChange: (style: PlaceTextStyle) => void;
  }
  ```

- [ ] Implement overlay layout
  - [ ] Draggable container div
  - [ ] Title bar with place name and close button
  - [ ] Content area with editing controls
  - [ ] Footer with Delete button
  - [ ] Styled with shadow and border for prominence
  - [ ] Max-width: 400px
  - [ ] Responsive on small screens (full width on mobile)

- [ ] Implement drag functionality
  - [ ] Handle mousedown on title bar to start drag
  - [ ] Track mousemove to update position
  - [ ] Handle mouseup to end drag
  - [ ] Constrain to viewport bounds
  - [ ] Update position state during drag
  - [ ] Cursor: move on title bar
  - [ ] Touch support for mobile

- [ ] Implement title editing
  - [ ] Text input with current title
  - [ ] Real-time validation (non-empty)
  - [ ] Save on blur or Enter key
  - [ ] Cancel on Escape key
  - [ ] Show character count (limit 50 chars)
  - [ ] Highlight input on focus

- [ ] Implement icon style selector
  - [ ] Dropdown or radio buttons for icon styles
  - [ ] Options: pin, dot, circle, marker, flag, star
  - [ ] Visual preview of each style
  - [ ] Current selection highlighted
  - [ ] Change updates immediately

- [ ] Implement icon visibility toggle
  - [ ] Checkbox "Show Icon"
  - [ ] Overridden by global icon setting (show disabled state)
  - [ ] Help text: "Global setting off" when disabled
  - [ ] Change updates immediately

- [ ] Implement text styling controls
  - [ ] Color picker for text color
    - Hex input field
    - Color swatch button opening picker
    - "Auto" option checkbox (high contrast based on background)
    - Preview text with current color

  - [ ] Drop shadow controls
    - Checkbox "Enable Drop Shadow"
    - Color picker for shadow color (default black)
    - Slider for shadow width (1-5px)
    - Collapsed when disabled

  - [ ] Glow effect controls
    - Checkbox "Enable Glow"
    - Color picker for glow color (default white)
    - Slider for glow blur (2-10px)
    - Collapsed when disabled

- [ ] Implement visibility toggle
  - [ ] Checkbox "Visible on Map"
  - [ ] Change updates immediately
  - [ ] Also available in places list

- [ ] Implement delete button
  - [ ] Red "Delete Place" button in footer
  - [ ] Show confirmation dialog
  - [ ] Call onDelete callback
  - [ ] Close overlay after deletion

- [ ] Implement keyboard shortcuts
  - [ ] Escape: close overlay
  - [ ] Enter: save and close (if title focused)
  - [ ] Delete: delete place (with confirmation)
  - [ ] Tab: navigate between controls

- [ ] Implement position calculation
  - [ ] `calculateOverlayPosition(clickX: number, clickY: number, placeBounds: DOMRect, viewportBounds: DOMRect): { x: number, y: number }`
    - Prefer right and below click point
    - Avoid covering place title/icon
    - Keep within viewport bounds
    - Offset by 20px from click
    - Return screen coordinates

### Color Picker Component

Create `src/components/places/ColorPicker.tsx`:

- [ ] Define component props
  ```typescript
  interface ColorPickerProps {
    color: string;           // Hex color value
    onChange: (color: string) => void;
    label: string;
    allowAuto?: boolean;     // Show "Auto" option
    autoEnabled?: boolean;   // Current auto state
    onAutoToggle?: (enabled: boolean) => void;
  }
  ```

- [ ] Implement color picker UI
  - [ ] Color swatch button showing current color
  - [ ] Click opens popover with picker
  - [ ] Hex input field for manual entry
  - [ ] Validation for hex format (#RRGGBB or #RGB)
  - [ ] Color slider or preset palette (optional)
  - [ ] "Auto" checkbox if allowAuto prop true

- [ ] Use native input[type="color"] or library
  - [ ] Native: good browser support, simple
  - [ ] Library (react-color): better UX, more features
  - [ ] Decision: start with native, upgrade if needed

- [ ] Implement auto mode
  - [ ] When auto enabled, disable manual color selection
  - [ ] Show preview of auto color result
  - [ ] Explain: "Automatically contrasts with map background"

### Confirmation Dialog Component

Create `src/components/common/ConfirmDialog.tsx`:

- [ ] Define component props
  ```typescript
  interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';  // Styling variant
  }
  ```

- [ ] Implement dialog UI
  - [ ] Modal overlay blocking interaction
  - [ ] Centered dialog box
  - [ ] Title and message
  - [ ] Confirm and Cancel buttons
  - [ ] Escape key to cancel
  - [ ] Focus on confirm button by default
  - [ ] Danger variant: red confirm button for destructive actions

- [ ] Implement accessibility
  - [ ] ARIA role="dialog"
  - [ ] aria-labelledby for title
  - [ ] Focus trap within dialog
  - [ ] Return focus to trigger on close

### State Management Integration

Modify `src/hooks/usePlaceManagement.ts`:

- [ ] Add text style state
  - [ ] `globalTextStyle: PlaceTextStyle` - Default text styling
  - [ ] `updateGlobalTextStyle: (style: PlaceTextStyle) => void`
  - [ ] Persist to localStorage

- [ ] Add selected place state
  - [ ] `selectedPlace: Place | null` - Currently editing place
  - [ ] `selectPlace: (id: string | null) => void`
  - [ ] `updateSelectedPlace: (updates: Partial<Place>) => void`

- [ ] Add update handlers
  - [ ] Handle title change
  - [ ] Handle icon style change
  - [ ] Handle icon visibility change
  - [ ] Handle text style change (per place)
  - [ ] Handle visibility toggle
  - [ ] Persist all changes to IndexedDB
  - [ ] Update state optimistically

### Map Integration

Modify `src/components/MapComponent.tsx`:

- [ ] Integrate PlaceEditOverlay
  - [ ] Render overlay when selectedPlaceId set
  - [ ] Pass selected place data
  - [ ] Pass update callbacks
  - [ ] Handle overlay close
  - [ ] Position overlay based on click location

- [ ] Update place hover feedback
  - [ ] Change cursor to pointer on hover
  - [ ] Highlight hovered place (optional)
  - [ ] Show tooltip with place name (optional)

- [ ] Handle overlay interactions
  - [ ] Clicking outside overlay closes it
  - [ ] Clicking another place switches to that place
  - [ ] Dragging map doesn't close overlay
  - [ ] Zooming updates overlay position if place moves off screen

### Multi-Select for Bulk Delete

Extend places list for multi-select:

Create `src/hooks/useMultiSelect.ts`:

- [ ] Implement multi-select hook
  - [ ] `selectedIds: Set<string>` - Selected place/track ids
  - [ ] `toggleSelection: (id: string) => void`
  - [ ] `selectAll: () => void`
  - [ ] `clearSelection: () => void`
  - [ ] `isSelected: (id: string) => boolean`
  - [ ] Generic hook for reuse with tracks and places

Modify `src/components/places/PlacesList.tsx`:

- [ ] Add multi-select mode
  - [ ] Toggle button to enable multi-select
  - [ ] Checkboxes appear when enabled
  - [ ] Select all checkbox in header
  - [ ] Show count of selected places
  - [ ] Bulk delete button (active when > 0 selected)

- [ ] Implement bulk delete
  - [ ] Show confirmation with count
  - [ ] Delete all selected places
  - [ ] Show progress for large batches
  - [ ] Show success notification
  - [ ] Clear selection after delete
  - [ ] Handle partial failures gracefully

Modify `src/components/tracks/TrackList.tsx`:

- [ ] Add same multi-select functionality
  - [ ] Reuse useMultiSelect hook
  - [ ] Bulk delete tracks
  - [ ] Show count and confirmation
  - [ ] Handle track-place associations

### Places Export

Create `src/services/placeExportService.ts`:

- [ ] Implement GeoJSON export
  - [ ] `exportPlacesToGeoJSON(places: Place[]): string`
    - Create GeoJSON FeatureCollection
    - Each place as Point feature
    - Properties: title, source, activityType, createdAt
    - Format with proper indentation
    - Return JSON string

- [ ] Implement CSV export
  - [ ] `exportPlacesToCSV(places: Place[]): string`
    - CSV columns: ID, Title, Latitude, Longitude, Source, Created, TrackID
    - Escape commas in title
    - Header row
    - Return CSV string

- [ ] Implement GPX waypoints export
  - [ ] `exportPlacesToGPX(places: Place[]): string`
    - Create GPX 1.1 XML
    - Each place as <wpt> element
    - Include name, description, time
    - Return XML string

- [ ] Add download trigger
  - [ ] `downloadPlaces(places: Place[], format: 'geojson' | 'csv' | 'gpx'): void`
    - Generate file content
    - Create blob with correct MIME type
    - Trigger browser download
    - Filename: `places-YYYY-MM-DD.{ext}`

Modify `src/components/places/PlaceControls.tsx`:

- [ ] Add export button
  - [ ] Dropdown for format selection
  - [ ] Options: GeoJSON, CSV, GPX
  - [ ] Click triggers download
  - [ ] Disabled when no places
  - [ ] Show notification on download

## Testing

### Unit Tests

Create `tests/unit/components/MapComponent.clickDetection.test.tsx`:

- [ ] Test click detection
  - [ ] Click on place icon registers hit
  - [ ] Click on place text registers hit
  - [ ] Click outside place returns null
  - [ ] Click tolerance (padding) works
  - [ ] Multiple overlapping places returns topmost

- [ ] Test overlay positioning
  - [ ] Calculates position avoiding place
  - [ ] Keeps overlay in viewport
  - [ ] Handles edge cases (near viewport edge)

Create `tests/unit/components/places/PlaceEditOverlay.test.tsx`:

- [ ] Test rendering
  - [ ] Shows place title
  - [ ] Shows all editing controls
  - [ ] Shows delete button
  - [ ] Renders at correct position

- [ ] Test interactions
  - [ ] Title editing works
  - [ ] Icon style change calls callback
  - [ ] Icon visibility toggle works
  - [ ] Text style changes call callback
  - [ ] Delete button shows confirmation
  - [ ] Close button calls onClose

- [ ] Test drag functionality
  - [ ] Drag updates position
  - [ ] Constrained to viewport
  - [ ] Touch events work

- [ ] Test keyboard shortcuts
  - [ ] Escape closes overlay
  - [ ] Enter saves title
  - [ ] Delete triggers delete

Create `tests/unit/components/places/ColorPicker.test.tsx`:

- [ ] Test rendering
  - [ ] Shows current color swatch
  - [ ] Opens picker on click
  - [ ] Shows auto checkbox when enabled

- [ ] Test interactions
  - [ ] Hex input validates correctly
  - [ ] Color change calls callback
  - [ ] Auto toggle works

Create `tests/unit/hooks/useMultiSelect.test.ts`:

- [ ] Test selection management
  - [ ] Toggle selection adds/removes
  - [ ] Select all selects all items
  - [ ] Clear selection empties set
  - [ ] isSelected returns correct state

Create `tests/unit/services/placeExportService.test.ts`:

- [ ] Test GeoJSON export
  - [ ] Valid GeoJSON format
  - [ ] All places included
  - [ ] Properties correct
  - [ ] Handles empty array

- [ ] Test CSV export
  - [ ] Valid CSV format
  - [ ] Headers correct
  - [ ] Escapes commas in title
  - [ ] Handles empty array

- [ ] Test GPX export
  - [ ] Valid GPX 1.1 XML
  - [ ] All waypoints included
  - [ ] Handles empty array

### Integration Tests

Create `tests/integration/components/places/PlaceEditing.integration.test.tsx`:

- [ ] Test complete editing workflow
  - [ ] Render place on map
  - [ ] Click place to open overlay
  - [ ] Edit title → verify update
  - [ ] Change icon style → verify render
  - [ ] Toggle visibility → verify map update
  - [ ] Delete place → verify removal

- [ ] Test text styling
  - [ ] Change text color → verify render
  - [ ] Enable drop shadow → verify effect
  - [ ] Enable glow → verify effect
  - [ ] Auto color → verify contrast

- [ ] Test drag functionality
  - [ ] Drag overlay with mouse
  - [ ] Drag overlay with touch
  - [ ] Overlay stays in viewport

Create `tests/integration/components/places/MultiSelect.integration.test.tsx`:

- [ ] Test multi-select workflow
  - [ ] Enable multi-select mode
  - [ ] Select multiple places
  - [ ] Bulk delete → verify all deleted
  - [ ] Select all → all selected
  - [ ] Clear selection → none selected

- [ ] Test with tracks
  - [ ] Multi-select tracks
  - [ ] Bulk delete tracks
  - [ ] Track places remain after track deletion

Create `tests/integration/services/placeExport.integration.test.ts`:

- [ ] Test export workflow
  - [ ] Create places
  - [ ] Export to GeoJSON → verify file
  - [ ] Export to CSV → verify file
  - [ ] Export to GPX → verify file
  - [ ] Re-import GPX → verify places (future)

## Acceptance Criteria

- [ ] Click detection identifies places accurately
- [ ] PlaceEditOverlay renders at correct position
- [ ] Overlay is draggable within viewport
- [ ] Title editing updates place immediately
- [ ] Icon style selector changes icon rendering
- [ ] Icon visibility toggle works
- [ ] Text styling controls (color, shadow, glow) functional
- [ ] Color picker allows custom colors and auto mode
- [ ] Delete button removes place with confirmation
- [ ] Keyboard shortcuts work (Escape, Enter, Delete)
- [ ] Multi-select mode for places and tracks
- [ ] Bulk delete removes multiple places/tracks
- [ ] Export places to GeoJSON, CSV, GPX formats
- [ ] Export button downloads file correctly
- [ ] Unit test coverage >85% for interactive editing
- [ ] Integration tests verify complete workflows
- [ ] TypeScript strict mode compliance
- [ ] Accessibility attributes present (ARIA, focus management)

## Notes

### Click Detection Tolerance

Add 5px padding around place bounds for easier clicking:
- Small icons easier to click
- Text with slight padding
- Mobile touch targets at least 44px

### Overlay Positioning Logic

```
1. Prefer: right and below click point (+20px offset)
2. If doesn't fit right: try left
3. If doesn't fit below: try above
4. Always keep within viewport bounds
5. Never cover the clicked place (add margin)
```

### Drag Constraints

Constrain overlay to viewport:
- Min x: 0
- Max x: viewportWidth - overlayWidth
- Min y: 0
- Max y: viewportHeight - overlayHeight

### Text Style State Management

Per-place text styles override global style:
```
Render priority:
1. Place.textStyle (if defined)
2. globalTextStyle (default)
3. Hardcoded fallback (black text, no effects)
```

### Auto Text Color Implementation

See section 1.4 for auto color algorithm.
Cache results by:
- Location (rounded to 3 decimals)
- Zoom level
- Tile layer
- Time to live: 5 minutes

### Multi-Select UX

Visual states:
- Normal: no checkboxes
- Multi-select mode: checkboxes visible
- Selected: checkbox checked, row highlighted
- Bulk action bar: appears when selection > 0

Keyboard shortcuts:
- Ctrl/Cmd + Click: toggle individual selection
- Shift + Click: range selection
- Ctrl/Cmd + A: select all
- Delete: bulk delete (with confirmation)

### Export Format Details

**GeoJSON:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [longitude, latitude]
      },
      "properties": {
        "title": "Place Name",
        "source": "manual",
        "createdAt": 1234567890000,
        "trackId": "uuid-if-present"
      }
    }
  ]
}
```

**CSV:**
```
ID,Title,Latitude,Longitude,Source,Created,TrackID
uuid,Place Name,47.6062,-122.3321,manual,2024-01-15T10:30:00Z,uuid-or-empty
```

**GPX:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="StrataLines">
  <wpt lat="47.6062" lon="-122.3321">
    <name>Place Name</name>
    <desc>Source: manual</desc>
    <time>2024-01-15T10:30:00Z</time>
  </wpt>
</gpx>
```

### Performance Considerations

- Debounce text style previews (300ms)
- Cache rendered places for click detection
- Limit color picker updates (use onChange, not onInput)
- Batch IndexedDB updates when possible
- Optimize overlay re-renders (React.memo)

### Accessibility

- Focus trap in overlay
- Escape key closes overlay
- ARIA labels on all controls
- Color picker accessible (keyboard navigable)
- Confirmation dialog accessible
- Screen reader announcements for state changes

### Future Enhancements

- Bulk edit (apply style to multiple places)
- Place templates (save/load style presets)
- Undo/redo for place edits
- Place groups (organize related places)
- Custom icon upload
- Place photos (attach images to places)
- Place links (URL field for external reference)
