# Project Guidelines

## Overview
- Web app for visualizing GPS tracks on Leaflet maps with export features.

## Testing Strategy
- Tests live under `tests/`.
- Follow the split between `tests/unit/` (fast, isolated, mocked) and `tests/integration/` (real Leaflet stack, minimal mocking).

### Unit tests (`tests/unit/`)
- Cover single functions or components with exhaustive edge cases.
- Run in jsdom with localStorage; **never import `leaflet-node` or `@napi-rs/canvas`.**
- Mock external dependencies, DOM/canvas APIs, and slow operations freely.

### Integration tests (`tests/integration/`)
- Exercise end-to-end workflows using the actual Leaflet and canvas implementations.
- Use helpers like `createTestMap()`/`cleanupTestMaps()` from `leaflet-node/testing`.
- Only mock true external services (e.g., network calls, filesystem) and keep Leaflet/canvas real.

## Critical Rules
1. Do **not** add `@jest-environment node`; jsdom is required for localStorage.
2. Unit tests mock dependencies; integration tests do not mock Leaflet, canvas, or DOM.
3. Both suites rely on jsdom so DOM APIs and localStorage are always available.

## Commands
```bash
npm test                  # Run all tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # Coverage run
npm run dev               # Start the dev server
npm run build             # Production build
```
