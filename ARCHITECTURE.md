# StrataLines Architecture

## Overview

StrataLines has been transformed from a runtime-transpiled application to a modern, build-first web application optimized for performance, testability, and deployment to global CDNs.

## Architecture Transformation

### Previous Architecture (Runtime Transpilation)
- Import maps loading dependencies from CDN
- TypeScript transpiled at runtime
- No build process
- Larger bundle sizes
- No tree-shaking

### Current Architecture (Build-First)
- Pre-compiled TypeScript → JavaScript
- Optimized Vite bundling
- Tree-shaking removes unused code
- 70%+ test coverage
- Ready for Cloudflare Pages deployment

## Key Components

### Build System
- **TypeScript**: Strict mode with full type checking
- **Vite**: Fast bundling with hot module replacement
- **Tree-shaking**: Eliminates dead code
- **Code splitting**: Optimizes load performance

### Testing Infrastructure
- **Vitest**: Modern, fast testing framework
- **Coverage**: Targeting 70%+ (lines, functions, statements), 60%+ (branches)
- **42 passing tests**: Comprehensive test suites
- **Mocked dependencies**: Isolated unit tests

### Deployment
- **Cloudflare Pages**: Global CDN distribution
- **Static output**: No server required
- **Security headers**: CSP, XSS protection
- **Optimized bundles**: ~275KB gzipped

## Module Structure

### Services Layer
- `gpxProcessor.ts`: Multi-format file parsing (GPX/TCX/FIT)
- `gpxGenerator.ts`: GPX export functionality
- `utils.ts`: Color conversion and geographic utilities
- `db.ts`: IndexedDB persistence layer

### Component Layer
- React functional components with hooks
- TypeScript props with full type safety
- Separated concerns (UI vs business logic)

## Performance Optimizations

- Initial bundle: 275KB gzipped
- CDN delivery via Cloudflare
- IndexedDB for offline storage
- Lazy loading capabilities

## Development Workflow

```
Development → Testing → Coverage → Build → Deploy
npm run dev   npm test   70%+       npm build   Cloudflare
```

## Quality Gates

✅ All 42 tests passing
✅ Code coverage target: 70%+ (lines, functions, statements), 60%+ (branches)
✅ TypeScript strict mode
✅ Production build successful

