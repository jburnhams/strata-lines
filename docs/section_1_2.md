# Section 1.2: UI Components

## Overview

Implement user interface components for places management, including collapsible places list, place controls, and integration with existing ControlsPanel layout.

## Dependencies

**Required:** 1.1 (Data Model and Persistence)
**Blocks:** 1.6 (Track Integration), 1.7 (Interactive Editing)

## Complexity

**Level:** Medium
**Scope:** Medium

## Component Architecture

### New Components

**PlacesList** - Collapsible list showing all places with visibility toggles
**PlaceListItem** - Individual place row with edit/delete buttons
**PlaceControls** - Controls for adding new places and global settings
**PlaceSettingsPanel** - Title size slider and global icon toggle

### Modified Components

**ControlsPanel** - Add collapsible Places section below Tracks section
**App** - Integrate place state management

## Tasks

### State Management Hook

Create `src/hooks/usePlaceManagement.ts`:

- [ ] Define hook interface and return type
  - [ ] `places: Place[]` - Current place list
  - [ ] `isLoading: boolean` - Loading state
  - [ ] `addPlace: (place: Place) => Promise<void>` - Add new place
  - [ ] `updatePlace: (id: string, updates: Partial<Place>) => Promise<void>` - Update place
  - [ ] `deletePlace: (id: string) => Promise<void>` - Delete place
  - [ ] `togglePlaceVisibility: (id: string) => void` - Toggle visibility
  - [ ] `toggleAllPlacesVisibility: (visible: boolean) => void` - Bulk visibility
  - [ ] `getPlaceById: (id: string) => Place | undefined` - Lookup helper
  - [ ] `getVisiblePlaces: () => Place[]` - Filter visible places

- [ ] Implement state initialization
  - [ ] Load places from IndexedDB on mount
  - [ ] Set loading state during initial load
  - [ ] Sort places by createdAt descending
  - [ ] Handle load errors gracefully

- [ ] Implement addPlace function
  - [ ] Validate place data
  - [ ] Check for duplicate coordinates (within 10 meters)
  - [ ] Save to IndexedDB
  - [ ] Update local state optimistically
  - [ ] Show success notification
  - [ ] Handle errors with user-friendly messages

- [ ] Implement updatePlace function
  - [ ] Merge partial updates
  - [ ] Save to IndexedDB
  - [ ] Update local state
  - [ ] Validate title not empty
  - [ ] Handle errors

- [ ] Implement deletePlace function
  - [ ] Remove from IndexedDB
  - [ ] Update local state
  - [ ] Show confirmation for manual places
  - [ ] Handle errors

- [ ] Implement visibility toggles
  - [ ] Toggle single place visibility in state
  - [ ] Toggle all places visibility
  - [ ] Persist visibility changes to IndexedDB

- [ ] Add helper functions
  - [ ] getPlaceById for quick lookups
  - [ ] getVisiblePlaces for rendering
  - [ ] getPlacesBySource for filtering

### PlacesList Component

Create `src/components/places/PlacesList.tsx`:

- [ ] Define component props
  - [ ] `places: Place[]`
  - [ ] `onToggleVisibility: (id: string) => void`
  - [ ] `onEdit: (place: Place) => void`
  - [ ] `onDelete: (id: string) => void`
  - [ ] `isCollapsed: boolean`
  - [ ] `onToggleCollapse: () => void`

- [ ] Implement collapsible header
  - [ ] Show "Places" title with count badge
  - [ ] Collapse/expand icon button
  - [ ] Smooth height transition animation
  - [ ] Persist collapsed state to localStorage

- [ ] Implement list rendering
  - [ ] Render PlaceListItem for each place
  - [ ] Group by source type (manual, track-derived, import)
  - [ ] Show empty state when no places
  - [ ] Virtual scrolling if >50 places for performance

- [ ] Implement keyboard navigation
  - [ ] Arrow keys to navigate list
  - [ ] Enter to edit selected place
  - [ ] Delete key to delete selected place
  - [ ] Escape to clear selection

- [ ] Implement accessibility
  - [ ] ARIA labels for screen readers
  - [ ] Keyboard focus management
  - [ ] Role attributes for list semantics

### PlaceListItem Component

Create `src/components/places/PlaceListItem.tsx`:

- [ ] Define component props
  - [ ] `place: Place`
  - [ ] `onToggleVisibility: () => void`
  - [ ] `onEdit: () => void`
  - [ ] `onDelete: () => void`
  - [ ] `isSelected: boolean`

- [ ] Implement item layout
  - [ ] Visibility toggle checkbox on left
  - [ ] Place title in center (truncate if long)
  - [ ] Source icon/badge
  - [ ] Edit button
  - [ ] Delete button on right
  - [ ] Track reference indicator if trackId present

- [ ] Implement hover state
  - [ ] Highlight on hover
  - [ ] Show edit/delete buttons on hover
  - [ ] Zoom to place on double-click

- [ ] Implement visual indicators
  - [ ] Icon style preview (pin/dot)
  - [ ] Color-code by source type
  - [ ] Show coordinates on tooltip
  - [ ] Show creation date on tooltip

- [ ] Handle track references
  - [ ] Display linked track name if trackId exists
  - [ ] Clicking track link scrolls to track in list
  - [ ] Show "Track deleted" if trackId invalid

### PlaceControls Component

Create `src/components/places/PlaceControls.tsx`:

- [ ] Define component props
  - [ ] `onAddPlace: () => void`
  - [ ] `allPlacesVisible: boolean`
  - [ ] `onToggleAllVisibility: (visible: boolean) => void`
  - [ ] `placeCount: number`

- [ ] Implement "Add Place" button
  - [ ] Primary action button with plus icon
  - [ ] Opens geocoding search dialog
  - [ ] Disabled during loading states
  - [ ] Keyboard shortcut (Ctrl/Cmd + P)

- [ ] Implement bulk actions
  - [ ] "Show All" / "Hide All" toggle button
  - [ ] Delete all places button (with confirmation)
  - [ ] Export places as GeoJSON button (future)

- [ ] Implement count display
  - [ ] Show total places count
  - [ ] Show visible places count
  - [ ] Show count by source type on hover

### PlaceSettingsPanel Component

Create `src/components/places/PlaceSettingsPanel.tsx`:

- [ ] Define component props
  - [ ] `titleSize: number` (1-100 scale)
  - [ ] `onTitleSizeChange: (size: number) => void`
  - [ ] `showIconsGlobally: boolean`
  - [ ] `onToggleIconsGlobally: (show: boolean) => void`

- [ ] Implement title size slider
  - [ ] Range input 1-100 with default 50
  - [ ] Live preview of size changes on map
  - [ ] Display current size value
  - [ ] Persist to localStorage
  - [ ] Debounce updates for performance

- [ ] Implement global icon toggle
  - [ ] Checkbox to show/hide all icons
  - [ ] Override individual place icon settings
  - [ ] Icon style selector (pin/dot)
  - [ ] Persist to localStorage

- [ ] Implement preview
  - [ ] Show example place title at current size
  - [ ] Show example icon at current style

### ControlsPanel Integration

Modify `src/components/ControlsPanel.tsx`:

- [ ] Add Places section below Tracks section
  - [ ] Collapsible like Tracks section
  - [ ] Independent collapse state
  - [ ] Same visual styling as Tracks

- [ ] Integrate PlaceControls component
  - [ ] Render above PlacesList
  - [ ] Pass place management callbacks
  - [ ] Share loading states

- [ ] Integrate PlacesList component
  - [ ] Render below PlaceControls
  - [ ] Pass places and callbacks
  - [ ] Handle empty state

- [ ] Integrate PlaceSettingsPanel component
  - [ ] Render in export settings area or separate tab
  - [ ] Pass settings and callbacks
  - [ ] Show/hide based on panel mode

- [ ] Adjust panel scrolling
  - [ ] Ensure both Tracks and Places sections scrollable
  - [ ] Maintain scroll position when collapsing sections
  - [ ] Handle small screen layouts

### App Integration

Modify `src/App.tsx`:

- [ ] Import usePlaceManagement hook
- [ ] Initialize place state alongside track state
- [ ] Initialize place settings state (title size, icon visibility)
- [ ] Pass place props to ControlsPanel
- [ ] Pass place props to MapComponent for rendering
- [ ] Handle place-related errors with notifications
- [ ] Coordinate place and track state updates

### Local Storage State

Create or extend `src/hooks/useLocalStorage.ts`:

- [ ] Add place settings keys
  - [ ] `places-collapsed`: boolean for collapse state
  - [ ] `place-title-size`: number for title size slider
  - [ ] `place-show-icons-globally`: boolean for icon visibility

- [ ] Implement persistence
  - [ ] Save on change with debounce
  - [ ] Load on mount with defaults
  - [ ] Handle parse errors gracefully

## Testing

### Unit Tests

Create `tests/unit/hooks/usePlaceManagement.test.ts`:

- [ ] Test hook initialization
  - [ ] Loads places from IndexedDB on mount
  - [ ] Sets loading state correctly
  - [ ] Handles load errors
  - [ ] Returns empty array when no places

- [ ] Test addPlace function
  - [ ] Adds place to state and DB
  - [ ] Shows success notification
  - [ ] Handles duplicate coordinates
  - [ ] Handles DB errors
  - [ ] Validates required fields

- [ ] Test updatePlace function
  - [ ] Updates place in state and DB
  - [ ] Merges partial updates
  - [ ] Handles invalid place id
  - [ ] Validates title not empty

- [ ] Test deletePlace function
  - [ ] Removes place from state and DB
  - [ ] Handles invalid place id
  - [ ] No errors on already deleted place

- [ ] Test visibility toggles
  - [ ] Toggles single place visibility
  - [ ] Toggles all places visibility
  - [ ] Updates state immediately
  - [ ] Persists to DB

Create `tests/unit/components/places/PlacesList.test.tsx`:

- [ ] Test rendering
  - [ ] Renders all places
  - [ ] Shows empty state when no places
  - [ ] Groups by source type correctly
  - [ ] Shows correct count in header

- [ ] Test interactions
  - [ ] Collapse/expand works
  - [ ] Visibility toggle calls callback
  - [ ] Edit button calls callback
  - [ ] Delete button calls callback
  - [ ] Double-click zooms to place

- [ ] Test keyboard navigation
  - [ ] Arrow keys navigate list
  - [ ] Enter opens edit
  - [ ] Delete removes place
  - [ ] Escape clears selection

Create `tests/unit/components/places/PlaceListItem.test.tsx`:

- [ ] Test rendering
  - [ ] Shows place title
  - [ ] Shows source indicator
  - [ ] Shows track reference if present
  - [ ] Shows icon preview

- [ ] Test interactions
  - [ ] Visibility toggle works
  - [ ] Edit button works
  - [ ] Delete button works
  - [ ] Hover shows buttons

Create `tests/unit/components/places/PlaceControls.test.tsx`:

- [ ] Test rendering
  - [ ] Shows add place button
  - [ ] Shows bulk actions
  - [ ] Shows place count

- [ ] Test interactions
  - [ ] Add place button calls callback
  - [ ] Toggle all visibility works
  - [ ] Bulk delete works with confirmation

Create `tests/unit/components/places/PlaceSettingsPanel.test.tsx`:

- [ ] Test rendering
  - [ ] Shows title size slider
  - [ ] Shows icon toggle
  - [ ] Shows preview

- [ ] Test interactions
  - [ ] Title size slider updates value
  - [ ] Icon toggle updates value
  - [ ] Changes persist to localStorage
  - [ ] Debounces updates

### Integration Tests

Create `tests/integration/components/places/PlacesWorkflow.integration.test.tsx`:

- [ ] Test complete workflow
  - [ ] Add place → appears in list
  - [ ] Edit place → updates in list
  - [ ] Toggle visibility → updates map
  - [ ] Delete place → removes from list
  - [ ] Persist and reload → places restored

- [ ] Test multiple places
  - [ ] Add 10 places
  - [ ] Toggle all visibility
  - [ ] Delete multiple places
  - [ ] Search/filter places

- [ ] Test performance
  - [ ] Render 100 places in <100ms
  - [ ] Virtual scrolling works
  - [ ] No memory leaks on add/delete

## Acceptance Criteria

- [ ] usePlaceManagement hook manages all place state and operations
- [ ] PlacesList component renders places in collapsible list
- [ ] PlaceListItem component shows place details with actions
- [ ] PlaceControls component provides add and bulk actions
- [ ] PlaceSettingsPanel component controls title size and icon visibility
- [ ] ControlsPanel integrates Places section below Tracks
- [ ] App coordinates place state with track state
- [ ] Local storage persists UI preferences
- [ ] Keyboard navigation works throughout
- [ ] Accessibility attributes present
- [ ] Unit test coverage >85% for all components
- [ ] Integration tests verify complete workflows
- [ ] TypeScript strict mode compliance
- [ ] No console errors or warnings
- [ ] Responsive layout works on small screens

## Notes

- Follow existing patterns from track list UI for consistency
- Use same color scheme and styling as track components
- Reuse Icons component for UI icons
- Consider mobile touch targets (min 44px)
- Implement optimistic updates for better UX
- Debounce expensive operations (title size changes, search)
- Virtual scrolling threshold: 50 places
- Duplicate detection threshold: 10 meters (using Leaflet distance calculation)
