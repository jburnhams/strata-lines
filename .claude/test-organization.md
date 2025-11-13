# Test Organization

This document explains the test organization for the Strata Lines project.

## Test Environment Setup

All tests run in **jsdom** environment with real canvas support from `@napi-rs/canvas` (via leaflet-node).

### Why jsdom?
- Provides `localStorage` which leaflet-node requires
- Provides DOM APIs that many tests need
- We override jsdom's incomplete canvas with real canvas from `@napi-rs/canvas`

### Test Setup (`tests/setup.ts`)
The setup file:
1. Imports `@napi-rs/canvas` (Canvas, Image, ImageData)
2. Overrides `HTMLCanvasElement`, `HTMLImageElement`, and `ImageData` with real implementations
3. Imports and configures leaflet-node
4. Mocks `leaflet` to use `leaflet-node` module
5. Sets up testing utilities (matchMedia mock, cleanup)

## Test Categories

### Unit Tests (with mocks)
These tests mock external dependencies to test specific units in isolation:

- **exportService.test.ts** - Unit test for export service logic
  - Mocks: exportHelpers, image-stitch
  - Uses real canvas for toBlob

- **exportHelpers.test.ts** - Unit tests for export helper functions
  - Uses real canvas from @napi-rs/canvas

- **mapCalculations.test.ts** - Unit tests for map calculations

- **colorAssignment.test.ts** - Unit tests for color assignment logic

- **db.test.ts** - Unit tests for database operations

- **gpxProcessor.test.ts** - Unit tests for GPX processing

- **gpxGenerator.test.ts** - Unit tests for GPX generation

- **utils.test.ts** - Unit tests for utility functions

- **progressTracker.test.ts** - Unit tests for progress tracking

- **useExportState.test.tsx** - Unit tests for React hook

- **useLocalStorage.test.ts** - Unit tests for localStorage hook

- **progress-ui.test.tsx** - Unit tests for React components

### Integration Tests (with leaflet-node)
These tests use real leaflet-node with minimal mocking:

- **leaflet-node-api.test.ts** - Integration tests for leaflet-node API
  - Uses real leaflet-node, real canvas
  - Tests basic leaflet-node functionality

- **leaflet-node-2.0.8-features.test.ts** - Integration tests for leaflet-node 2.0.8 features
  - Uses leaflet-node/testing utilities
  - Tests createTestMap, waitForTiles, map.toBuffer, etc.

- **leaflet-node-rendering-full.test.ts** - Full rendering integration tests
  - Uses real leaflet-node for server-side rendering
  - Tests map creation, track rendering, tile loading

- **subdivision-rendering.test.ts** - Subdivision rendering integration tests
  - Uses real leaflet-node
  - Tests subdivision logic with real map rendering

- **export-labels.test.ts** - Label export integration tests
  - Uses real leaflet-node
  - Tests label rendering at different zoom levels

- **export.test.ts** - Export coordinate system tests

- **subdivision.test.ts** - Subdivision logic tests
  - Uses real leaflet-node for bounds calculations

- **subdivision-ordering.test.ts** - Subdivision ordering tests

- **render-waiting.test.ts** - Render waiting functionality tests
  - Tests canvas renderer waiting mechanism

- **performance-check.test.ts** - Performance tests

- **src-setter-test.test.ts** - Source setter tests

- **progress-callbacks.test.ts** - Progress callback tests

## Key Points

1. **No @jest-environment node directive** - All tests use jsdom for localStorage support

2. **Real canvas from @napi-rs/canvas** - Setup overrides jsdom's incomplete canvas

3. **leaflet-node provides real Leaflet** - All leaflet operations use leaflet-node

4. **Unit tests mock dependencies** - Keep unit tests fast and isolated

5. **Integration tests use real components** - Ensure real-world functionality works

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Specific test file
npm test -- tests/exportService.test.ts

# With coverage
npm run test:coverage
```

## Adding New Tests

### For Unit Tests:
- Mock external dependencies using `jest.mock()`
- Test logic in isolation
- Use real canvas if testing canvas operations

### For Integration Tests:
- Import from 'leaflet-node' or 'leaflet-node/testing'
- Use real components where possible
- Only mock external services (APIs, file system if needed)
- Test realistic workflows

## Common Issues

### localStorage errors
**Symptom:** `SecurityError: Cannot initialize local storage`
**Solution:** Ensure test doesn't have `@jest-environment node` directive

### Canvas context errors
**Symptom:** `Cannot read properties of undefined (reading 'save')`
**Solution:** Ensure `tests/setup.ts` properly overrides HTMLCanvasElement

### toBlob not found
**Symptom:** `Not implemented: HTMLCanvasElement.prototype.toBlob`
**Solution:** Ensure using real canvas from @napi-rs/canvas (check setup.ts)
