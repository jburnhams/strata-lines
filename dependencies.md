# StrataLines Dependencies

## Overview: Build-First Architecture

StrataLines uses a modern, build-first frontend architecture powered by Vite. All application code and dependencies are pre-compiled, bundled, and optimized before deployment:

1. **TypeScript Compilation**: Application code is type-checked and transpiled to JavaScript at build time
2. **Vite Bundling**: Dependencies are bundled together with application code into optimized chunks
3. **Tree-shaking**: Only the code that's actually used is included in the final bundle
4. **Code Splitting**: JavaScript is split into optimal chunks for faster loading
5. **Production Optimization**: Minification, compression, and other optimizations are applied

This approach provides:
- **Faster load times**: Pre-compiled, minified code
- **Better performance**: Optimized bundles with dead code eliminated
- **CDN deployment**: Static assets ready for global distribution
- **Offline support**: IndexedDB provides data persistence

All dependencies are installed via npm and bundled during the build process.

---

## Core Dependencies

### UI & Rendering

**React** (`react@19.2.0`, `react-dom@19.2.0`)
- **Role**: Modern UI library for building component-based interfaces
- **Usage**: Manages the entire application component tree, state via hooks (`useState`, `useEffect`), and rendering lifecycle
- **Why React 19**: Latest stable version with improved performance and concurrent features

**TypeScript** (`typescript@5.8.x`)
- **Role**: Static type checking and enhanced developer experience
- **Usage**: Provides compile-time type safety, better IDE autocomplete, and self-documenting code
- **Configuration**: Strict mode enabled in `tsconfig.json`

### Mapping

**Leaflet** (`leaflet@1.9.4`)
- **Role**: Open-source interactive mapping library
- **Usage**: Core mapping engine that renders tile layers, draws track polylines, handles map interactions (pan, zoom)
- **Features**: Multiple tile layer providers, vector graphics, event handling

**React Leaflet** (`react-leaflet@5.0.0`)
- **Role**: React wrapper components for Leaflet
- **Usage**: Provides declarative React components (`<MapContainer>`, `<TileLayer>`, `<Polyline>`) instead of imperative Leaflet API
- **Benefit**: Integrates Leaflet seamlessly into React's component model

### Data Parsing & Processing

**GPX Parser** (`gpxparser@3.0.8`)
- **Role**: Specialized library for parsing GPX (GPS Exchange Format) XML files
- **Usage**: Reads `.gpx` files and extracts track names, coordinates, metadata
- **Format**: Standard XML-based GPS data format

**Garmin FIT SDK** (`@garmin/fitsdk@21.178.0`)
- **Role**: Official JavaScript SDK for decoding Garmin's FIT binary format
- **Usage**: Parses `.fit` files from Garmin devices and other fitness trackers
- **Format**: Flexible and Interoperable Data Transfer (FIT) protocol - binary format for GPS and fitness data

**Pako** (`pako@2.1.0`)
- **Role**: High-performance JavaScript implementation of zlib compression
- **Usage**: Client-side decompression of `.gz` files (e.g., `track.gpx.gz`, `activity.fit.gz`)
- **Benefit**: Handles compressed files entirely in browser without server-side processing

### Export Functionality

**HTML to Canvas** (`html2canvas@1.4.1`)
- **Role**: DOM-to-image conversion library
- **Usage**: Captures off-screen Leaflet map renders and converts them to PNG images for high-resolution export
- **Features**: Renders map tiles, tracks, and overlays into a single image

**JSZip** (`jszip@3.10.1`)
- **Role**: JavaScript library for creating and manipulating ZIP archives
- **Usage**:
  - "Download All Tracks" feature: Bundles multiple GPX files into a single ZIP
  - "Export to ZIP" feature: Packages map tiles and images for large exports

### Storage

**IndexedDB** (Browser API - No package required)
- **Role**: Browser-native database for client-side data persistence
- **Usage**: Stores uploaded tracks locally for offline access and session persistence
- **Advantages**:
  - No storage size limits (unlike localStorage's 5MB)
  - Asynchronous API (non-blocking)
  - Can store complex objects and binary data
- **Implementation**: Custom service in `services/db.ts`

---

## Development Dependencies

### Build System

**Vite** (`vite@6.4.1`)
- **Role**: Next-generation frontend build tool
- **Features**:
  - Lightning-fast hot module replacement (HMR)
  - Optimized production builds
  - Native ESM support
  - Built-in TypeScript support
- **Usage**: Development server and production bundler

**@vitejs/plugin-react** (`@vitejs/plugin-react@5.1.0`)
- **Role**: Official Vite plugin for React support
- **Features**: React Fast Refresh, JSX transformation

### Testing Infrastructure

**Vitest** (`vitest@4.0.4`)
- **Role**: Modern, fast unit testing framework
- **Features**:
  - Native ESM support
  - Vite-powered (shares build config)
  - Jest-compatible API
  - Built-in TypeScript support
  - Watch mode with smart re-running
- **Usage**: All unit and integration tests

**@vitest/coverage-v8** (`@vitest/coverage-v8@4.0.4`)
- **Role**: Code coverage provider using V8's native coverage
- **Features**: Fast, accurate coverage reports
- **Output**: HTML, JSON, LCOV, text formats
- **Thresholds**: 70% coverage required for lines, functions, statements; 60% for branches

**@vitest/ui** (`@vitest/ui@4.0.4`)
- **Role**: Interactive web-based UI for Vitest
- **Usage**: Visual test debugging and exploration
- **Command**: `npm run test:ui`

**happy-dom** (`happy-dom@20.0.8`)
- **Role**: Lightweight DOM implementation for testing
- **Features**:
  - 30x faster than jsdom
  - Sufficient DOM API for component testing
  - Better Node.js 20+ compatibility
- **Usage**: Test environment for Vitest (configured in `vitest.config.ts`)

**jsdom** (`jsdom@27.0.1`)
- **Role**: More complete DOM implementation (alternative to happy-dom)
- **Usage**: Available as fallback if more complete DOM API needed
- **Note**: Currently not primary test environment but kept as dependency

### Testing Utilities

**@testing-library/react** (`@testing-library/react@16.3.0`)
- **Role**: React component testing utilities
- **Philosophy**: Test components as users interact with them
- **Features**: `render()`, `screen`, user event simulation
- **Best Practice**: Query by accessible roles, labels, text

**@testing-library/jest-dom** (`@testing-library/jest-dom@6.9.1`)
- **Role**: Custom Jest/Vitest matchers for DOM testing
- **Examples**: `toBeInTheDocument()`, `toHaveTextContent()`, `toBeVisible()`
- **Integration**: Auto-loaded in `tests/setup.ts`

**@testing-library/user-event** (`@testing-library/user-event@14.6.1`)
- **Role**: Advanced user interaction simulation
- **Features**: More realistic than `fireEvent` - simulates actual user actions
- **Examples**: `userEvent.click()`, `userEvent.type()`, `userEvent.upload()`

### TypeScript Type Definitions

**@types/react** (`@types/react@19.2.2`)
- **Role**: TypeScript definitions for React

**@types/react-dom** (`@types/react-dom@19.2.2`)
- **Role**: TypeScript definitions for ReactDOM

**@types/leaflet** (`@types/leaflet@1.9.21`)
- **Role**: TypeScript definitions for Leaflet

**@types/pako** (`@types/pako@2.0.4`)
- **Role**: TypeScript definitions for pako

**@types/node** (`@types/node@22.18.12`)
- **Role**: TypeScript definitions for Node.js APIs
- **Usage**: Needed for path resolution, file system types in config files

---

## Dependency Management

### Installation

```bash
# Clean install (CI/CD)
npm ci

# Regular install
npm install

# Install specific dependency
npm install <package-name>

# Install dev dependency
npm install -D <package-name>
```

### Updates

```bash
# Check for outdated packages
npm outdated

# Update all dependencies (within semver range)
npm update

# Update to latest versions (breaking changes possible)
npx npm-check-updates -u
npm install
```

### Security

```bash
# Check for vulnerabilities
npm audit

# Auto-fix vulnerabilities
npm audit fix

# Force fix (may include breaking changes)
npm audit fix --force
```

### Version Pinning

- **Production dependencies**: Using caret ranges (`^x.y.z`) - allows minor and patch updates
- **Dev dependencies**: Using caret ranges (`^x.y.z`)
- **Lock file**: `package-lock.json` ensures reproducible installs

### Notable Transitive Dependencies

Some deprecation warnings may appear from transitive dependencies of `jsdom`:
- `request@2.88.2` - deprecated HTTP library (jsdom dependency)
- `uuid@3.4.0` - old UUID version (jsdom dependency)
- `w3c-hr-time`, `domexception`, `abab` - jsdom internals being replaced

**Impact**: These warnings are not critical as they:
- Only affect test environment
- Don't appear in production builds
- Will be resolved when jsdom updates its dependencies

---

## Bundle Size & Performance

### Production Bundle

After running `npm run build`, the optimized bundle is:
- **Total JavaScript**: ~275KB gzipped
- **Vendor chunks**: Separated for better caching
- **Application code**: Code-split for optimal loading

### Optimization Techniques

1. **Tree-shaking**: Vite removes unused exports from all libraries
2. **Code splitting**: Dynamic imports create separate chunks
3. **Minification**: Terser minifies all JavaScript
4. **CSS optimization**: PostCSS processes and minifies styles
5. **Asset optimization**: Images and other assets are optimized

### Lazy Loading

While currently not implemented, the architecture supports:
- Dynamic component imports: `const Component = lazy(() => import('./Component'))`
- Route-based code splitting
- On-demand library loading

---

## Compatibility

### Browser Support

**Minimum versions**:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

**Required features**:
- ES2022 JavaScript features
- IndexedDB
- File API
- Canvas API
- ESM (ES Modules)

### Node.js Support

**Development**:
- Node.js 20.x (LTS) - recommended
- Node.js 22.x - tested and supported
- Node.js 18.x - deprecated, removed from CI

**CI/CD**:
- Tests run on Node.js 20.x and 22.x
- GitHub Actions workflow in `.github/workflows/node.js.yml`

---

## Architecture Benefits

### Compared to CDN-based (import maps) Architecture

**Previous approach** (import maps from CDN):
- Dependencies loaded from external CDN at runtime
- No build step required
- Larger total download size
- No tree-shaking
- Reliant on external CDN availability

**Current approach** (Vite build):
- ✅ All dependencies bundled and optimized
- ✅ Tree-shaking removes unused code
- ✅ Smaller final bundle size
- ✅ Faster load times (pre-compiled)
- ✅ Offline-capable after initial load
- ✅ Full control over deployment
- ✅ Comprehensive testing possible
- ✅ Better production caching strategies

---

## Related Documentation

- **PROJECT_SETUP.md**: Complete setup and development guide
- **ARCHITECTURE.md**: High-level architecture overview
- **README.md**: User-facing quick start guide
- **package.json**: Full dependency list with versions
