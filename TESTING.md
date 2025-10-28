# Testing Guide

This project includes comprehensive testing coverage with both unit tests and end-to-end (E2E) integration tests.

## Test Types

### Unit Tests (Vitest)
Unit tests cover the core business logic and utility functions:
- GPX/TCX/FIT file parsing
- Track processing and generation
- Utility functions
- Database operations

**Location**: `tests/` directory
**Framework**: Vitest with Happy-DOM

### E2E Integration Tests (Playwright)
End-to-end tests verify the complete application behavior in a real browser:
- Map rendering and initialization
- Map resizing and responsiveness
- Track visualization
- Export functionality
- Selection box manipulation

**Location**: `e2e/` directory
**Framework**: Playwright Test

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode (automatically re-run on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Open interactive test UI
npm run test:ui
```

### E2E Tests

**Prerequisites**: Install Playwright browsers (only needed once):
```bash
npm run playwright:install
# Or install all browsers:
npx playwright install
```

**Running E2E tests**:
```bash
# Run all E2E tests (headless mode)
npm run test:e2e

# Run with browser UI visible
npm run test:e2e:headed

# Open interactive Playwright UI
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug
```

### Run All Tests

```bash
# Run both unit tests with coverage and E2E tests
npm run test:all
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

The CI pipeline:
1. Installs dependencies
2. Installs Playwright Chromium browser
3. Builds the project
4. Runs unit tests with coverage
5. Runs E2E tests
6. Uploads test reports as artifacts

## Writing Tests

### Unit Tests Example

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

### E2E Tests Example

```typescript
import { test, expect } from '@playwright/test';

test('should render map correctly', async ({ page }) => {
  await page.goto('/');
  const map = page.locator('.leaflet-container');
  await expect(map).toBeVisible();
});
```

## Known Issues

### Map Rendering (FIXED)
- **Issue**: Map initially rendered with incorrect dimensions on page load
- **Fix**: Added `MapSizeManager` component that invalidates map size after mount

### Export Bounds (FIXED)
- **Issue**: Exported map area didn't match yellow selection box
- **Fix**: Updated export to use precise pixel coordinate calculations instead of `fitBounds()`

## Debugging E2E Tests

### View Test Reports
After running E2E tests, view the HTML report:
```bash
npx playwright show-report
```

### Screenshots and Videos
Failed tests automatically capture:
- Screenshots (saved in `test-results/`)
- Video recordings (if enabled in config)
- Trace files for debugging

### Debug Specific Test
```bash
# Run only tests matching a pattern
npx playwright test --grep "map rendering"

# Debug a specific file
npx playwright test e2e/map-rendering.spec.ts --debug
```

## Browser Selection

By default, E2E tests run on:
- Chromium (Desktop)
- Chromium (Mobile - Pixel 5)

To test other browsers, uncomment them in `playwright.config.ts`:
```typescript
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
],
```

## Performance

- Unit tests complete in ~5 seconds
- E2E tests complete in ~30-60 seconds depending on system

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
