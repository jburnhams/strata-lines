# Testing Guide

This project uses Vitest for comprehensive test coverage of business logic, utilities, and components.

## Test Types

### Unit Tests
Core business logic and utility functions:
- GPX/TCX/FIT file parsing
- Track processing and generation
- Utility functions
- Database operations

### Component Tests
React component rendering and behavior:
- MapComponent rendering
- Map initialization
- Track visualization
- Export bounds handling

**Location**: `tests/` directory
**Framework**: Vitest with Happy-DOM and React Testing Library

## Running Tests

```bash
# Run all tests in watch mode
npm test

# Run tests in watch mode (automatically re-run on file changes)
npm run test:watch

# Run tests once with coverage report
npm run test:coverage

# Open interactive test UI
npm run test:ui
```

## Test Coverage Requirements

The project enforces the following coverage thresholds:
- **Lines**: 80%
- **Functions**: 85%
- **Branches**: 70%
- **Statements**: 80%

Coverage reports are generated in:
- Text output (console)
- HTML report: `coverage/index.html`
- JSON: `coverage/coverage-final.json`
- LCOV: `coverage/lcov.info`

## CI/CD Integration

Tests run automatically in GitHub Actions on:
- Push to `main` branch
- Pull requests to `main` branch
- Node.js versions: 20.x, 22.x, 24.x

The CI pipeline:
1. Installs dependencies
2. Builds the project
3. Runs tests with coverage
4. Uploads coverage report (Node 24.x only)

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../services/myService';

describe('My Service', () => {
  it('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

### Component Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MyComponent } from '../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { container } = render(<MyComponent />);
    expect(container.querySelector('.my-element')).toBeTruthy();
  });
});
```

## Manual Testing

For integration testing with real browser behavior (map rendering, export functionality, etc.):

### Local Testing
```bash
npm run dev
# Open http://localhost:3000 in your browser
```

### Preview Deployment Testing
When you push changes, Cloudflare Pages automatically creates preview deployments:
- Check preview URL in Cloudflare Pages dashboard or PR comments
- Test map rendering on initial load
- Test export functionality with yellow selection box
- Test on different devices/browsers

### Known Fixed Issues

#### Map Rendering (FIXED in MapComponent.tsx)
- **Issue**: Map initially rendered with incorrect dimensions on page load
- **Fix**: Added `MapSizeManager` component that invalidates map size after mount

#### Export Bounds (FIXED in App.tsx)
- **Issue**: Exported map area didn't match yellow selection box
- **Fix**: Updated export to use precise pixel coordinate calculations instead of `fitBounds()`

## Performance

- All tests complete in ~5 seconds
- CI pipeline runs in ~1-2 minutes (without heavy browser installation)

## Debugging Tests

### Run Specific Tests
```bash
# Run only tests matching a pattern
npm test -- --grep "map rendering"

# Run a specific file
npm test tests/MapComponent.test.tsx
```

### Debug Mode
```bash
# Run with debug output
npm test -- --reporter=verbose
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
