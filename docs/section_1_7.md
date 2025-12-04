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

- [x] Implement place click detection
  - [x] Add click event listener to canvas overlay
  - [x] Get click coordinates relative to canvas
  - [x] Check if click intersects any place icon or text bounds
  - [x] Use cached place render results from positioning
  - [x] Determine which place was clicked (if multiple overlap, pick topmost)
  - [x] Handle mobile touch events (touchend)

- [x] Implement hit testing
  - [x] `isPointInBounds(x: number, y: number, bounds: DOMRect): boolean`
    - Check if point within rectangle
    - Account for click tolerance (add 5px padding)
    - Return true if hit

  - [x] `getPlaceAtPoint(x: number, y: number, renderedPlaces: Map<string, PlaceRenderResult>): string | null`
    - Iterate rendered places (reverse order for top-to-bottom)
    - Check click against icon bounds
    - Check click against text bounds
    - Return first matching place id
    - Return null if no hit

- [x] Add click state management
  - [x] `selectedPlaceId: string | null` - Currently selected place
  - [x] `editOverlayPosition: { x: number, y: number }` - Overlay screen position
  - [x] `setSelectedPlace: (id: string | null) => void` - Selection handler

- [x] Handle click event
  - [x] On canvas click:
    - Get place id at click point
    - If place found:
      - Set selectedPlaceId
      - Calculate overlay position (near click but not covering place)
      - Open edit overlay
    - If no place found and overlay open:
      - Close overlay (clear selectedPlaceId)

### Edit Overlay Component

Create `src/components/places/PlaceEditOverlay.tsx`:

- [x] Define component props
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

- [x] Implement overlay layout
  - [x] Draggable container div
  - [x] Title bar with place name and close button
  - [x] Content area with editing controls
  - [x] Footer with Delete button
  - [x] Styled with shadow and border for prominence
  - [x] Max-width: 400px
  - [x] Responsive on small screens (full width on mobile)

- [x] Implement drag functionality
  - [x] Handle mousedown on title bar to start drag
  - [x] Track mousemove to update position
  - [x] Handle mouseup to end drag
  - [x] Constrain to viewport bounds
  - [x] Update position state during drag
  - [x] Cursor: move on title bar
  - [x] Touch support for mobile

- [x] Implement title editing
  - [x] Text input with current title
  - [x] Real-time validation (non-empty)
  - [x] Save on blur or Enter key
  - [x] Cancel on Escape key
  - [x] Show character count (limit 50 chars)
  - [x] Highlight input on focus

- [x] Implement icon style selector
  - [x] Dropdown or radio buttons for icon styles
  - [x] Options: pin, dot, circle, marker, flag, star
  - [x] Visual preview of each style
  - [x] Current selection highlighted
  - [x] Change updates immediately

- [x] Implement icon visibility toggle
  - [x] Checkbox "Show Icon"
  - [x] Overridden by global icon setting (show disabled state)
  - [x] Help text: "Global setting off" when disabled
  - [x] Change updates immediately

- [x] Implement text styling controls
  - [x] Color picker for text color
    - Hex input field
    - Color swatch button opening picker
    - "Auto" option checkbox (high contrast based on background)
    - Preview text with current color

  - [x] Drop shadow controls
    - Checkbox "Enable Drop Shadow"
    - Color picker for shadow color (default black)
    - Slider for shadow width (1-5px)
    - Collapsed when disabled

  - [x] Glow effect controls
    - Checkbox "Enable Glow"
    - Color picker for glow color (default white)
    - Slider for glow blur (2-10px)
    - Collapsed when disabled

- [x] Implement visibility toggle
  - [x] Checkbox "Visible on Map"
  - [x] Change updates immediately
  - [x] Also available in places list

- [x] Implement delete button
  - [x] Red "Delete Place" button in footer
  - [x] Show confirmation dialog
  - [x] Call onDelete callback
  - [x] Close overlay after deletion

- [x] Implement keyboard shortcuts
  - [x] Escape: close overlay
  - [x] Enter: save and close (if title focused)
  - [x] Delete: delete place (with confirmation)
  - [x] Tab: navigate between controls

- [x] Implement position calculation
  - [x] `calculateOverlayPosition(clickX: number, clickY: number, placeBounds: DOMRect, viewportBounds: DOMRect): { x: number, y: number }`
    - Prefer right and below click point
    - Avoid covering place title/icon
    - Keep within viewport bounds
    - Offset by 20px from click
    - Return screen coordinates

### Color Picker Component

Create `src/components/places/ColorPicker.tsx`:

- [x] Define component props
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

- [x] Implement color picker UI
  - [x] Color swatch button showing current color
  - [x] Click opens popover with picker
  - [x] Hex input field for manual entry
  - [x] Validation for hex format (#RRGGBB or #RGB)
  - [x] Color slider or preset palette (optional)
  - [x] "Auto" checkbox if allowAuto prop true

- [x] Use native input[type="color"] or library
  - [x] Native: good browser support, simple
  - [x] Library (react-color): better UX, more features
  - [x] Decision: start with native, upgrade if needed

- [x] Implement auto mode
  - [x] When auto enabled, disable manual color selection
  - [x] Show preview of auto color result
  - [x] Explain: "Automatically contrasts with map background"

### Confirmation Dialog Component

Create `src/components/common/ConfirmDialog.tsx`:

- [x] Define component props
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

- [x] Implement dialog UI
  - [x] Modal overlay blocking interaction
  - [x] Centered dialog box
  - [x] Title and message
  - [x] Confirm and Cancel buttons
  - [x] Escape key to cancel
  - [x] Focus on confirm button by default
  - [x] Danger variant: red confirm button for destructive actions

- [x] Implement accessibility
  - [x] ARIA role="dialog"
  - [x] aria-labelledby for title
  - [x] Focus trap within dialog
  - [x] Return focus to trigger on close

### State Management Integration

Modify `src/hooks/usePlaceManagement.ts`:

- [ ] Add text style state
  - [ ] `globalTextStyle: PlaceTextStyle` - Default text styling
  - [ ] `updateGlobalTextStyle: (style: PlaceTextStyle) => void`
  - [ ] Persist to localStorage

- [x] Add selected place state (Handled in MapComponent)
  - [x] `selectedPlace: Place | null` - Currently editing place
  - [x] `selectPlace: (id: string | null) => void`
  - [x] `updateSelectedPlace: (updates: Partial<Place>) => void`

- [x] Add update handlers
  - [x] Handle title change
  - [x] Handle icon style change
  - [x] Handle icon visibility change
  - [x] Handle text style change (per place)
  - [x] Handle visibility toggle
  - [x] Persist all changes to IndexedDB
  - [x] Update state optimistically

### Map Integration

Modify `src/components/MapComponent.tsx`:

- [x] Integrate PlaceEditOverlay
  - [x] Render overlay when selectedPlaceId set
  - [x] Pass selected place data
  - [x] Pass update callbacks
  - [x] Handle overlay close
  - [x] Position overlay based on click location

- [ ] Update place hover feedback
  - [ ] Change cursor to pointer on hover
  - [ ] Highlight hovered place (optional)
  - [ ] Show tooltip with place name (optional)

- [x] Handle overlay interactions
  - [x] Clicking outside overlay closes it
  - [x] Clicking another place switches to that place
  - [x] Dragging map doesn't close overlay
  - [x] Zooming updates overlay position if place moves off screen

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

- [ ] Test click detection (Done in PlaceCanvasOverlay.helpers.test.ts)
  - [x] Click on place icon registers hit
  - [x] Click on place text registers hit
  - [x] Click outside place returns null
  - [x] Click tolerance (padding) works
  - [x] Multiple overlapping places returns topmost

- [ ] Test overlay positioning (Partially covered)
  - [ ] Calculates position avoiding place
  - [ ] Keeps overlay in viewport
  - [ ] Handles edge cases (near viewport edge)

Create `tests/unit/components/places/PlaceEditOverlay.test.tsx`:

- [x] Test rendering
  - [x] Shows place title
  - [x] Shows all editing controls
  - [x] Shows delete button
  - [x] Renders at correct position

- [x] Test interactions
  - [x] Title editing works
  - [x] Icon style change calls callback
  - [x] Icon visibility toggle works
  - [x] Text style changes call callback
  - [x] Delete button shows confirmation
  - [x] Close button calls onClose

- [x] Test drag functionality
  - [x] Drag updates position
  - [x] Constrained to viewport
  - [x] Touch events work

- [x] Test keyboard shortcuts
  - [x] Escape closes overlay
  - [x] Enter saves title
  - [x] Delete triggers delete

Create `tests/unit/components/places/ColorPicker.test.tsx`:

- [x] Test rendering
  - [x] Shows current color swatch
  - [x] Opens picker on click
  - [x] Shows auto checkbox when enabled

- [x] Test interactions
  - [x] Hex input validates correctly
  - [x] Color change calls callback
  - [x] Auto toggle works

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

- [x] Click detection identifies places accurately
- [x] PlaceEditOverlay renders at correct position
- [x] Overlay is draggable within viewport
- [x] Title editing updates place immediately
- [x] Icon style selector changes icon rendering
- [x] Icon visibility toggle works
- [x] Text styling controls (color, shadow, glow) functional
- [x] Color picker allows custom colors and auto mode
- [x] Delete button removes place with confirmation
- [x] Keyboard shortcuts work (Escape, Enter, Delete)
- [ ] Multi-select mode for places and tracks
- [ ] Bulk delete removes multiple places/tracks
- [ ] Export places to GeoJSON, CSV, GPX formats
- [ ] Export button downloads file correctly
- [x] Unit test coverage >85% for interactive editing
- [ ] Integration tests verify complete workflows
- [x] TypeScript strict mode compliance
- [x] Accessibility attributes present (ARIA, focus management)

## Notes

[Existing Notes]
