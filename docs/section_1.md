# Section 1: Places Feature

## Overview

The Places feature adds support for marking, labeling, and rendering named locations on GPS track visualizations. Places extend the existing track-based workflow by allowing users to annotate specific points of interest with human-readable names derived from reverse geocoding or manual input.

## Feature Summary

**Core Capabilities:**
- Define places with coordinates, titles, timestamps, and optional track associations
- Automatic title generation via reverse geocoding (Nominatim API)
- Manual place creation and editing
- Track-derived places at start, middle, and end points
- Persistent storage in IndexedDB
- Rendering on both preview map and high-resolution exports
- Smart title positioning to minimize overlap and maximize readability
- Optional pin/dot icons with customizable visibility
- Configurable title sizing with multi-line support

**User Workflow:**
1. User clicks "Add Place" and selects location via geocoding search
2. System derives default title from nearest locality name
3. Place appears in collapsible places list with visibility toggle
4. User can edit title, toggle icon, or delete place
5. For tracks, user can add start/middle/end places with track name as title
6. Places render on map with intelligent positioning away from other places
7. Click place title on map to open editing overlay
8. Places export as additional layer on top of all other content

## Technical Architecture

**New Components:**
- `Place` interface and data model
- `PlacesList` component (parallel to track list UI)
- `PlaceControls` component for add/edit/delete operations
- `GeocodingService` with pluggable provider interface (Nominatim default)
- `PlaceRenderingService` for canvas-based place rendering
- `TitlePositioningAlgorithm` for collision-free placement
- `PlaceEditOverlay` draggable component
- IndexedDB `places` object store

**Integration Points:**
- Extends `useTrackManagement` or creates `usePlaceManagement` hook
- Adds place layer to export pipeline in `exportService`
- Integrates with `MapComponent` for interactive editing
- Shares rendering utilities with `exportHelpers`

## Subsection Breakdown

### 1.1 Data Model and Persistence
Defines Place interface, IndexedDB schema, and CRUD operations. This is the foundation for all other work.

**Complexity:** Low
**Dependencies:** None
**Estimated Scope:** Small

### 1.2 UI Components
Implements places list, controls panel, and integration with existing UI layout.

**Complexity:** Medium
**Dependencies:** 1.1
**Estimated Scope:** Medium

### 1.3 Geocoding Service
Implements Nominatim integration with pluggable provider interface for address lookup and reverse geocoding.

**Complexity:** Low
**Dependencies:** None (standalone)
**Estimated Scope:** Small

### 1.4 Place Rendering Engine
Renders places with titles and icons on canvas for preview and export, including text rendering with wrapping.

**Complexity:** Medium
**Dependencies:** 1.1
**Estimated Scope:** Medium

### 1.5 Title Positioning Algorithm
Implements intelligent left/right positioning to minimize overlap with other place titles.

**Complexity:** High
**Dependencies:** 1.4
**Estimated Scope:** Medium

### 1.6 Track Integration
Adds start/middle/end place creation from tracks with smart middle-point selection.

**Complexity:** Medium
**Dependencies:** 1.1, 1.2, 1.3
**Estimated Scope:** Small-Medium

### 1.7 Interactive Editing
Implements click-to-edit on map with draggable overlay for place editing.

**Complexity:** Medium
**Dependencies:** 1.2, 1.4
**Estimated Scope:** Small-Medium

## Implementation Order

Recommended sequence to minimize blocking dependencies:

1. **1.1 Data Model** - Foundation for everything
2. **1.2 UI Components** - Enables manual place creation and testing
3. **1.3 Geocoding Service** - Enables smart title generation
4. **1.4 Place Rendering** - Core feature for visualization
5. **1.6 Track Integration** - High-value feature, depends on 1.1-1.3
6. **1.5 Title Positioning** - Polish, complex algorithm can be refined iteratively
7. **1.7 Interactive Editing** - Final polish for user experience

## Testing Strategy

**Unit Tests:**
- Mock IndexedDB for place persistence tests
- Mock Nominatim API responses for geocoding tests
- Mock canvas context for rendering tests
- Test title positioning algorithm with various configurations
- Test collision detection and multi-line wrapping logic
- Test track middle-point calculation edge cases

**Integration Tests:**
- Use @napi-rs/canvas for actual place rendering
- Test complete add/edit/delete workflows
- Test place export at various resolutions and subdivisions
- Test place visibility in subdivision calculations
- Test track-place association lifecycle
- Verify geocoding service provider switching

## Performance Considerations

- Limit to ~100 places maximum
- Filter places by viewport bounds before rendering
- For subdivisions, include places where title bounding box intersects subdivision
- Cache rendered place icons (same icon reused for multiple places)
- Debounce title position recalculation on map pan/zoom
- Lazy-load geocoding provider only when needed

## Future Enhancements

- Multiple icon styles and categories
- Place search and filtering
- Bulk import from GPX waypoints or GeoJSON
- Place clustering at low zoom levels
- Export places as separate CSV/GeoJSON
- Undo/redo for place operations
- Photo attachments and descriptions
- Keyboard shortcuts for place management

---

See individual subsection documents for detailed implementation tasks.
