# StrataLines - Complete Project Setup Guide

This document provides a comprehensive overview of the project setup, development workflow, and technical architecture. It's designed to be useful for both human developers and AI assistants working on this codebase.

## Table of Contents

- [Quick Start](#quick-start)
- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing Strategy](#testing-strategy)
- [Build System](#build-system)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Generate coverage report
npm run test:coverage

# Build for production
npm run build
```

## Project Overview

**StrataLines** is a browser-based GPS track visualization tool that supports multiple file formats (GPX, TCX, FIT) and provides interactive mapping capabilities with export functionality.

### Key Features
- Multi-format GPS file parsing (GPX, TCX, FIT)
- Gzip compression support for all file types
- Interactive Leaflet-based mapping
- IndexedDB for persistent track storage
- High-resolution map export
- GPX export functionality
- Full TypeScript type safety

## Technology Stack

### Core Technologies

#### Frontend Framework
- **React 19.2.0**: UI component framework
- **TypeScript 5.8.x**: Static typing and compilation
- **Vite 6.x**: Build tool and development server

#### Mapping Libraries
- **Leaflet 1.9.4**: Interactive mapping engine
- **React Leaflet 5.0.0**: React bindings for Leaflet

#### File Processing
- **gpxparser 3.0.8**: GPX file parsing
- **@garmin/fitsdk 21.x**: FIT file decoding
- **pako 2.1.0**: Gzip compression/decompression

#### Export & Utilities
- **html2canvas 1.4.1**: Map screenshot generation
- **jszip 3.10.1**: ZIP file creation
- **IndexedDB**: Browser storage API (native)

### Development Tools

#### Testing
- **Vitest 4.0.4**: Unit testing framework
- **@vitest/coverage-v8**: Code coverage reporting
- **@vitest/ui**: Interactive test UI
- **happy-dom 20.0.8**: Lightweight DOM implementation for tests
- **@testing-library/react 16.3.0**: React component testing utilities
- **@testing-library/jest-dom 6.9.1**: Custom Jest matchers

#### Build & Type Checking
- **@vitejs/plugin-react 5.x**: Vite React plugin
- **TypeScript compiler**: Type checking and compilation

### Node.js Version
- **Minimum**: Node.js 20.x
- **Recommended**: Node.js 20.x or 22.x
- **CI/CD**: Tests run on both 20.x and 22.x

## Project Structure

```
strata-lines/
├── .github/
│   └── workflows/
│       └── node.js.yml          # CI/CD pipeline configuration
├── components/                   # React UI components
│   ├── ControlsPanel.tsx        # Track management controls
│   ├── MapComponent.tsx         # Main map display component
│   └── DraggableBoundsBox.tsx   # Export area selection
├── services/                     # Core business logic (services layer)
│   ├── db.ts                    # IndexedDB operations
│   ├── gpxProcessor.ts          # Multi-format file parsing
│   ├── gpxGenerator.ts          # GPX export functionality
│   └── utils.ts                 # Utility functions (colors, geo calc)
├── tests/                        # Test suites
│   ├── setup.ts                 # Test environment configuration
│   ├── db.test.ts               # Database service tests
│   ├── gpxProcessor.test.ts     # File processor tests
│   ├── gpxGenerator.test.ts     # GPX generator tests
│   └── utils.test.ts            # Utility function tests
├── public/                       # Static assets
│   └── _headers                 # Cloudflare Pages security headers
├── App.tsx                       # Root application component
├── index.tsx                     # Application entry point
├── index.html                    # HTML template
├── types.ts                      # TypeScript type definitions
├── constants.ts                  # Application constants
├── vite.config.ts               # Vite build configuration
├── vitest.config.ts             # Vitest test configuration
├── tsconfig.json                # TypeScript compiler options
├── wrangler.toml                # Cloudflare Pages deployment config
├── package.json                 # Dependencies and scripts
├── README.md                    # User-facing documentation
├── ARCHITECTURE.md              # Architecture overview
├── dependencies.md              # Dependency documentation
└── PROJECT_SETUP.md             # This file
```

## Development Workflow

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd strata-lines
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   Note: You may see deprecation warnings from transitive dependencies (jsdom). These are not critical and come from test dependencies.

3. **Verify installation**
   ```bash
   npm run type-check
   npm test
   ```

### Development Server

```bash
npm run dev
```

- Runs on `http://localhost:5173` by default
- Hot Module Replacement (HMR) enabled
- React Fast Refresh for component updates
- TypeScript compilation in watch mode

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start development server with HMR |
| `build` | `tsc && vite build` | Type check and build for production |
| `preview` | `vite preview` | Preview production build locally |
| `test` | `vitest` | Run tests in watch mode |
| `test:ui` | `vitest --ui` | Open interactive test UI |
| `test:coverage` | `vitest run --coverage` | Generate coverage report |
| `test:watch` | `vitest --watch` | Run tests in watch mode (explicit) |
| `type-check` | `tsc --noEmit` | Run TypeScript type checking only |
| `lint` | `tsc --noEmit` | Alias for type-check |

## Testing Strategy

### Test Framework: Vitest

Vitest is configured with:
- **Environment**: happy-dom (lightweight, fast)
- **Global test utilities**: `describe`, `it`, `expect` available globally
- **Setup file**: `tests/setup.ts` configures testing-library

### Coverage Configuration

Located in `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  include: ['services/**/*.ts'],
  exclude: [
    'node_modules/',
    'tests/',
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
    'vite.config.ts',
    'vitest.config.ts',
    'dist/',
    'metadata.json'
  ],
  thresholds: {
    lines: 70,
    functions: 70,
    branches: 60,
    statements: 70
  }
}
```

### Coverage Targets

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 60%
- **Statements**: 70%

### Current Coverage Status

Run `npm run test:coverage` to see current coverage. As of latest run:
- **db.ts**: Needs tests (IndexedDB operations)
- **gpxProcessor.ts**: Partially covered, needs edge case tests
- **utils.ts**: Well covered, minor gaps in edge cases
- **gpxGenerator.ts**: 100% coverage

### Running Tests

```bash
# Run all tests once
npm test -- --run

# Watch mode (default)
npm test

# Coverage report (HTML + terminal)
npm run test:coverage

# Interactive UI
npm run test:ui
```

### Writing Tests

Tests are located in `tests/` directory and use the pattern `*.test.ts`.

Example test structure:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { functionToTest } from '../services/module';

describe('Module Name', () => {
  describe('functionToTest', () => {
    it('should handle normal case', () => {
      const result = functionToTest(input);
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      // Test implementation
    });
  });
});
```

### Testing IndexedDB

When testing `db.ts`, note that happy-dom provides a basic IndexedDB implementation. Tests should:
1. Mock IndexedDB operations or use the provided implementation
2. Test error handling (database errors, transaction failures)
3. Test all CRUD operations
4. Clean up after each test

## Build System

### Vite Configuration

**File**: `vite.config.ts`

Key features:
- React plugin with Fast Refresh
- Path aliases: `@/` points to project root
- Build optimizations enabled
- Code splitting for optimal chunk sizes

### TypeScript Configuration

**File**: `tsconfig.json`

Compiler options:
- **Target**: ES2022
- **Module**: ESNext
- **Strict mode**: Enabled
- **JSX**: react-jsx (React 17+ transform)
- **Module resolution**: bundler
- **Experimental decorators**: Enabled for library compatibility

### Build Process

```bash
npm run build
```

Steps:
1. TypeScript compilation (`tsc`)
   - Type checks all files
   - Generates no output (`noEmit: true`)
   - Fails if type errors exist
2. Vite build
   - Bundles all application code
   - Tree-shakes unused code
   - Minifies JavaScript
   - Optimizes assets
   - Outputs to `dist/`

### Build Output

The `dist/` directory contains:
- `index.html`: Entry point
- `assets/`: JavaScript bundles, CSS, and static assets
- Optimized for CDN deployment
- Gzip-compressed assets

## Deployment

### Cloudflare Pages

**Configuration**: `wrangler.toml`

```toml
name = "stratalines"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"
```

**Deployment steps**:
1. Build: `npm run build`
2. Deploy: `wrangler pages publish dist/` or use Cloudflare Pages Git integration

**Environment**:
- Node.js 20+ required
- Build command: `npm run build`
- Build output: `dist`

### CI/CD Pipeline

**File**: `.github/workflows/node.js.yml`

**Triggers**:
- Push to `main` branch
- Pull requests to `main` branch

**Jobs**:
1. Checkout code
2. Setup Node.js (20.x and 22.x matrix)
3. Install dependencies (`npm ci`)
4. Build (`npm run build`)
5. Run tests (`npm test`)

**Status**: All tests must pass before merge

### Security Headers

**File**: `public/_headers`

The deployment includes security headers for all routes:
- Content Security Policy (CSP)
- XSS Protection
- Frame Options
- Content Type Options

## Troubleshooting

### Common Issues

#### 1. Dependencies not installing

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 2. TypeScript errors

```bash
# Run type checker to see all errors
npm run type-check
```

#### 3. Tests failing

```bash
# Run tests with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test tests/db.test.ts
```

#### 4. Coverage not meeting thresholds

```bash
# Generate detailed coverage report
npm run test:coverage

# View HTML report
open coverage/index.html
```

#### 5. Build errors

```bash
# Clean build
rm -rf dist
npm run build
```

### Deprecation Warnings

The project may show npm deprecation warnings from transitive dependencies (e.g., `jsdom`, `request`, `uuid`). These are:
- Coming from test dependencies (jsdom)
- Not affecting production builds
- Not security critical
- Will be resolved when upstream packages update

### Performance Issues

If development server is slow:
1. Check Node.js version (20.x or 22.x recommended)
2. Clear Vite cache: `rm -rf node_modules/.vite`
3. Restart dev server

## Key Architectural Decisions

### 1. Build-First Architecture

**Decision**: Use Vite build process instead of runtime transpilation

**Rationale**:
- Faster load times (pre-compiled code)
- Tree-shaking eliminates unused code
- Better performance in production
- Easier deployment to CDNs
- Comprehensive testing possible

### 2. Vitest over Jest

**Decision**: Use Vitest for testing

**Rationale**:
- Native ESM support
- Faster than Jest
- Better Vite integration
- Similar API to Jest (easy migration)
- Built-in coverage with v8

### 3. happy-dom over jsdom

**Decision**: Use happy-dom for test environment

**Rationale**:
- 30x faster than jsdom
- Sufficient DOM API coverage for our needs
- Better compatibility with Node.js 20+
- Actively maintained

### 4. IndexedDB for Storage

**Decision**: Use browser IndexedDB instead of localStorage

**Rationale**:
- No storage size limits (unlike localStorage's 5MB)
- Can store binary data efficiently
- Asynchronous API (non-blocking)
- Better for large track datasets

### 5. TypeScript Strict Mode

**Decision**: Enable all strict mode checks

**Rationale**:
- Catches bugs at compile time
- Better IDE autocomplete
- Self-documenting code
- Easier refactoring

## Environment Variables

Currently, the project does not use environment variables. All configuration is:
- **Constants**: Defined in `constants.ts`
- **Build-time**: Configured in `vite.config.ts`
- **Runtime**: No environment-specific settings

If environment variables are needed in the future:
1. Create `.env` file (add to `.gitignore`)
2. Use Vite's `import.meta.env` API
3. Prefix with `VITE_` for client-side access

## Code Style & Conventions

### Naming Conventions
- **Components**: PascalCase (e.g., `MapComponent.tsx`)
- **Services**: camelCase (e.g., `gpxProcessor.ts`)
- **Types**: PascalCase interfaces (e.g., `Track`, `TrackPoint`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DB_NAME`)

### File Organization
- **Components**: One component per file
- **Services**: Group related functions
- **Tests**: Mirror source file structure
- **Types**: Shared types in `types.ts`, local types in component files

### TypeScript Usage
- Always define return types for exported functions
- Use interfaces for object shapes
- Avoid `any` type (use `unknown` if necessary)
- Prefer type inference for local variables

## Additional Resources

- **README.md**: User-facing documentation and quick start
- **ARCHITECTURE.md**: High-level architectural overview
- **dependencies.md**: Detailed dependency documentation (being updated)
- **Vite Docs**: https://vitejs.dev/
- **Vitest Docs**: https://vitest.dev/
- **React Leaflet**: https://react-leaflet.js.org/

## For AI Assistants

When working on this codebase:

1. **Before making changes**:
   - Run `npm run type-check` to verify types
   - Run `npm test` to ensure tests pass
   - Check coverage with `npm run test:coverage`

2. **When adding features**:
   - Add corresponding tests in `tests/` directory
   - Update type definitions in `types.ts` if needed
   - Maintain or improve code coverage thresholds
   - Update documentation if architecture changes

3. **Coverage priorities**:
   - `db.ts` currently has 0% coverage - needs complete test suite
   - `gpxProcessor.ts` needs edge case testing
   - All new code should include tests

4. **Common tasks**:
   - Adding file format support: Update `gpxProcessor.ts` and add tests
   - New UI features: Create component in `components/` with React hooks
   - Storage changes: Modify `db.ts` and update tests
   - Export features: Update `gpxGenerator.ts` or create new export service

5. **Testing guidelines**:
   - Use happy-dom for DOM testing
   - Mock IndexedDB operations in `db.test.ts`
   - Use Testing Library for component tests
   - Maintain 70%+ coverage on services layer
