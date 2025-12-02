# StrataLines Technical Overview

## Purpose

StrataLines is a browser-based GPS track visualization and analysis tool that enables users to upload, visualize, and export GPS activity data on interactive maps. It supports multiple activity file formats (GPX, TCX, FIT) including gzipped variants, and provides high-resolution map image export with customizable styling and layer composition.

## Architecture

### Technology Stack

- **React 19.2.0** with TypeScript 5.9.3 in strict mode
- **Vite 7.1.12** for build tooling and development server
- **Leaflet 1.9.4** with React-Leaflet 5.0.0 for interactive mapping
- **IndexedDB** for client-side persistence
- **WebAssembly** (via image-stitch) for high-performance JPEG encoding
- **Jest** with dual test environments (unit and integration)

### Application Model

This is a pure client-side single-page application with no backend dependencies. All data processing, storage, and rendering occurs in the browser. The application follows a strict unidirectional data flow pattern with React hooks managing state at appropriate levels.

## Project Structure

### Core Components (`src/components/`)

**MapComponent** - Leaflet integration handling map rendering, track polylines, tile layers, and export bounds visualization. Manages map lifecycle, zoom controls, and coordinate transformations.

**ControlsPanel** - Primary UI panel managing track uploads, visibility toggles, export configuration, and bulk operations. Orchestrates user interactions with the track management and export systems.

**DraggableBoundsBox** - Interactive rectangle overlay for export area selection with handles for resize and drag operations. Enforces aspect ratio constraints and boundary validation.

**Icons** - SVG icon components with consistent sizing and styling.

**controls/** - Sub-components for specialized control panels (export settings, track filtering, layer selection).

### Business Logic (`src/services/`)

**gpxProcessor** - Multi-format GPS file parser supporting GPX (XML), TCX (Garmin Training Center XML), and FIT (Garmin binary format). Handles gzip decompression, metadata extraction, and coordinate normalization. Calculates track statistics including distance, bounds, and activity type classification.

**gpxGenerator** - Generates valid GPX 1.1 XML documents from track data for export and download operations. Preserves metadata and ensures schema compliance.

**exportService** - Orchestrates the complete export pipeline. Implements subdivision strategy for large exports, factory pattern for lazy canvas rendering, and streaming stitching for memory efficiency. Coordinates between tile fetching, track rendering, label composition, and final image assembly.

**db** - IndexedDB abstraction providing Promise-based API for track and source file persistence. Manages two object stores: `tracks` for processed GPS data and `source_files` for original uploaded files. Handles lifecycle events including orphaned file cleanup.

**utils** - Geographic calculations (distance, bearing), color utilities (RGB/HSV conversions), and helper functions for data transformations.

### State Management (`src/hooks/`)

**useTrackManagement** - Central hook for track CRUD operations. Manages track collection state, loading indicators, duplicate detection (based on name and point count), minimum length filtering, activity type filtering, and bulk operations. Coordinates with IndexedDB for persistence and handles UI state updates.

**useExportState** - Manages export configuration including bounds, zoom levels, quality multipliers, aspect ratios, and subdivision visualization. Performs derived calculations for pixel dimensions, viewport sizes, and export parameters. Tracks rendering progress per subdivision.

**useLocalStorage** - Generic hook for persisting UI preferences to localStorage with type safety and serialization handling.

**useMediaQuery** - Responsive breakpoint detection for adaptive UI layouts.

### Utilities (`src/utils/`)

**exportHelpers** - Comprehensive canvas rendering utilities totaling 942 lines. Key functions include `renderCanvasForBounds()` for tile and track rendering, `calculateSubdivisions()` for export area division, `calculateGridLayout()` for optimal subdivision arrangement, and `createCompatibleCanvas()` for test environment compatibility. Handles tile fetching, coordinate transformations, anti-aliased line rendering, and layer composition.

**colorAssignment** - Intelligent color distribution algorithm that maximizes visual distinction between adjacent tracks. Generates a color palette with evenly distributed hues and assigns colors based on perceptual distance in HSV space (hue weighted 3x higher than saturation/value).

**mapCalculations** - Geographic utilities for bounds calculations, coordinate transformations, and distance measurements.

**progressTracker** - Export progress tracking with granular callbacks for subdivision and stage completion.

**initBuildTimestamp** - Build versioning for cache busting and deployment tracking.

### Type Definitions (`src/types.ts`)

Comprehensive TypeScript interfaces for Track, TrackBounds, Point, ExportSettings, TileLayer, AspectRatio, and ImageSource. All interfaces follow strict type safety principles with explicit nullability where appropriate.

### Constants (`src/constants.ts`, `src/labelTiles.ts`)

Defines tile layer configurations, aspect ratio presets, export constraints (maximum dimensions, zoom levels), and label tile URL patterns.

## Key Architectural Patterns

### Export Subdivision Strategy

When export dimensions exceed `maxDimension` pixels (default 4000), the system divides the export area into a grid of subdivisions. Each subdivision is rendered independently as an ImageSource factory object with lazy evaluation. The `image-stitch` library streams these subdivisions together without loading all pixels into memory simultaneously, enabling exports up to 8000×8000 pixels (64 megapixels).

### Factory Pattern for Image Rendering

The `ImageSource` interface defines a lazy rendering contract where canvas generation is deferred until stitching time. This enables the export service to plan and coordinate complex exports without excessive memory allocation.

### Dual Test Environments

**Unit tests** (`tests/unit/`) use JSDOM with mocked canvas, IndexedDB, and fetch operations. Focus on business logic correctness with fast execution times.

**Integration tests** (`tests/integration/`) use `leaflet-node` with real `@napi-rs/canvas` rendering. Test actual tile fetching, canvas operations, and WASM JPEG encoding. These tests validate pixel-level output and full system integration.

### Color Assignment Algorithm

Generates 2N colors (where N = track count) using perceptual HSV space distribution. For each track, assigns the color with maximum perceptual distance from already-assigned neighboring tracks. This maximizes visual distinction in dense visualizations.

### IndexedDB Data Model

Two object stores with explicit versioning:
- `tracks`: Processed GPS track data with computed metadata
- `source_files`: Original uploaded files for re-export in native format

Source files are reference-counted and automatically deleted when all associated tracks are removed.

## Build System

### Vite Configuration

- **Dev Server**: Port 3000, hot module replacement enabled
- **Path Alias**: `@/` maps to `./src/` for cleaner imports
- **WASM Handling**: Special asset pipeline for `image-stitch` WASM files with preserved filenames
- **Environment Variables**: Build-time injection for API keys (currently unused)

### TypeScript Configuration

Strict mode enabled with `experimentalDecorators`, `isolatedModules` for Vite compatibility, and `allowImportingTsExtensions` for TypeScript ESM resolution. Target ES2022 with ESNext modules.

### Build Pipeline

1. **copy-wasm**: Copies JPEG encoder WASM files to `public/assets/`
2. **tsc**: Type checking without emit
3. **vite build**: Production bundle generation
4. **inject-build-timestamp.mjs**: Embeds build timestamp in JavaScript bundle
5. **verify-wasm-in-build.mjs**: Validates WASM files exist in dist output

## Testing Framework

### Jest Configuration

Two projects with shared baseline configuration:
- **Preset**: `ts-jest/presets/default-esm` for ESM compatibility
- **Transform**: Babel with React, TypeScript, and ES6 presets
- **Module Resolution**: Path mapping for `@/` alias

### Unit Test Environment

**Setup**: `tests/unit/setup.ts` configures JSDOM with comprehensive mocks:
- `HTMLCanvasElement.getContext()` returns mock 2D context
- `URL.createObjectURL()` returns stable blob URLs
- `matchMedia` for responsive queries
- IndexedDB polyfill for database operations

**Coverage Targets**:
- Lines: 80%
- Functions: 85%
- Branches: 70%
- Statements: 80%

Coverage focuses on `src/services/**` excluding database layer.

### Integration Test Environment

**Setup**: `tests/integration/setup.ts` configures real rendering:
- `leaflet-node` for headless Leaflet with actual canvas operations
- `@napi-rs/canvas` for Node.js canvas implementation
- `@fontsource/noto-sans` for label text rendering
- ReadableStream/TransformStream polyfills for Node.js streaming APIs

**Resource Constraints**:
- Node.js memory limit: 2GB (`--max-old-space-size=2048`)
- Single worker for memory stability
- Real tile fetching with network timeouts

### CI/CD

**Unit Tests**: Run on Node 20.x, 22.x, 24.x, 25.x via GitHub Actions

**Integration Tests**: Node 25.x only in separate workflow for resource-intensive canvas operations

## Domain-Specific Concepts

### Track Data Model

Tracks are immutable objects with computed properties. The `id` field is a UUID generated at parse time. The `points` array contains `[latitude, longitude]` tuples in WGS84 coordinates. Track `length` is computed using Leaflet's geodesic distance calculations. The `bounds` property enables spatial filtering and viewport optimization.

### Tile Layers

Supports multiple tile providers with different characteristics:
- **ESRI World Imagery**: Satellite imagery with optional label overlay
- **OpenStreetMap**: Community-maintained street maps
- **OpenTopoMap**: Topographic maps with elevation contours
- **CartoDB**: Stylized base maps (dark and light variants)

Label rendering is exclusive to ESRI Imagery and uses CartoDB's `light_only_labels` tile set at configurable zoom offsets.

### Export Quality Multiplier

The quality setting (1x, 2x, 4x) determines the zoom level increase from preview to export. A 2x multiplier means tiles are fetched at preview_zoom + 2, resulting in 4x the pixels (2x in each dimension). This enables high-resolution exports while maintaining preview interactivity.

### Aspect Ratio Enforcement

When an aspect ratio is selected, the export bounds are adjusted to match while preserving the center point. This uses a temporary Leaflet map instance for accurate latitude/longitude to pixel conversions at the target zoom level.

## Code Quality Standards

### TypeScript

All code must be strictly typed with no `any` types except where interfacing with untyped external libraries. Prefer explicit interfaces over type aliases for complex objects. Use discriminated unions for state machines. Generic types should have descriptive constraints.

### Component Design

Components should be functional with hooks. Separate presentation from logic - extract complex state management to custom hooks. Props interfaces must be explicitly defined. Use React.memo for expensive pure components with custom comparison functions where necessary.

### State Management

Lift state to the appropriate level - not too high (avoids unnecessary re-renders) and not too low (avoids prop drilling). Use context sparingly for truly global state. Prefer composition over context for component coupling.

### Error Handling

All async operations must have explicit error handling. User-facing errors should be actionable with clear messaging. Log unexpected errors with sufficient context for debugging. Network failures should gracefully degrade (cached tiles, retry logic).

### Performance

Avoid unnecessary re-renders through proper dependency arrays, memoization, and callback stability. Large lists should use virtualization if needed. Canvas operations should batch draws. Tile fetching should be throttled and cached.

### Testing

Unit tests focus on business logic correctness and edge cases. Integration tests validate complete workflows including rendering and export. Tests should be deterministic and isolated. Mock external dependencies (network, time, randomness) in unit tests. Use real implementations in integration tests where possible.

### Comments

Comments should explain *why*, not *what*. Complex algorithms require documentation of the approach and trade-offs. Non-obvious optimizations need justification. Public APIs require JSDoc with parameter descriptions and examples. Remove commented-out code - use version control instead.

### Naming Conventions

Functions and variables use camelCase. Components and types use PascalCase. Constants use UPPER_SNAKE_CASE. Boolean variables should read as predicates (`isVisible`, `hasError`). Function names should be imperative verbs (`calculateBounds`, `renderTrack`).

### File Organization

One component per file. Co-locate tightly coupled components. Separate concerns: components render UI, services contain business logic, utilities provide pure functions, hooks manage state. Index files should be avoided - use explicit imports.

### Dependencies

Minimize external dependencies. Prefer standard browser APIs over libraries. When adding dependencies, verify license compatibility, maintenance status, and bundle size impact. Pin exact versions in package.json.

## Performance Characteristics

- **Initial Bundle**: ~275KB gzipped JavaScript
- **Offline Capability**: Full functionality after initial load via IndexedDB
- **Memory Management**: Streaming export prevents memory spikes; 2GB limit in test environment
- **Export Constraints**: 8000×8000 pixel maximum via subdivision strategy
- **Rendering**: Leaflet handles tile caching; track rendering is batched per subdivision

## Security Considerations

Content Security Policy headers defined in `public/_headers` enforce no inline scripts and XSS protection. File upload validation checks format magic numbers. No user content is executed as code. All external resources (tiles, fonts) use HTTPS.

## Development Workflow

1. **Local Development**: Run `npm run dev` for Vite dev server on port 3000
2. **Type Checking**: Run `npm run type-check` for TypeScript validation without emit
3. **Unit Testing**: Run `npm test` for fast business logic verification
4. **Integration Testing**: Run `npm run test:integration` for full rendering tests (requires 2GB memory)
5. **Build**: Run `npm run build` for production bundle with WASM verification
6. **Preview**: Run `npm run preview` to test production build locally

## Key Files Reference

**Entry Point**: `src/index.tsx` initializes React root with StrictMode

**Main App**: `src/App.tsx` orchestrates MapComponent and ControlsPanel with state coordination

**Export Pipeline**: `src/services/exportService.ts` → `src/utils/exportHelpers.ts` → `image-stitch`

**Track Processing**: `src/services/gpxProcessor.ts` with format-specific parsers

**Database Layer**: `src/services/db.ts` with IndexedDB abstraction

**State Hooks**: `src/hooks/useTrackManagement.ts` and `src/hooks/useExportState.ts`

**Test Setup**: `tests/unit/setup.ts` and `tests/integration/setup.ts`

## Deployment

Application is deployed to Cloudflare Pages with automatic builds on main branch. No server-side rendering or API endpoints. All routes serve the same `index.html` for client-side routing. WASM files must be served with correct MIME types.

---

This codebase prioritizes type safety, test coverage, and clean separation of concerns. Changes should maintain these standards while avoiding over-engineering. Write code that is obvious to read, efficient to execute, and straightforward to test.
