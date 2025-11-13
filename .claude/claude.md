# Claude AI Assistant Instructions for Strata Lines

## Project Overview
Strata Lines is a web application for visualizing GPS tracks on maps with export capabilities using Leaflet and leaflet-node for server-side rendering.

## Important Documentation

Before working with tests, **always read**:
- [Test Organization Guide](.claude/test-organization.md) - Explains test setup, categories, and best practices

## Key Technologies

- **Leaflet** - Map rendering library
- **leaflet-node** - Server-side Leaflet with real canvas support (@napi-rs/canvas)
- **React** - UI framework
- **Jest** - Testing framework
- **jsdom** - Test environment (with real canvas override)

## Test Environment

All tests run in **jsdom environment** with:
- Real canvas from `@napi-rs/canvas` (not jsdom's incomplete canvas)
- localStorage support (required by leaflet-node)
- DOM APIs for component testing

**NEVER** add `@jest-environment node` to test files - it breaks localStorage support.

## Working with Tests

1. **Unit tests** - Mock dependencies, test logic in isolation
2. **Integration tests** - Use real leaflet-node, minimal mocks

See [Test Organization Guide](.claude/test-organization.md) for full details.

## Common Commands

```bash
npm test                    # Run all tests
npm run test:unit          # Run unit tests only
npm run test:coverage      # Run with coverage
npm run dev                 # Start dev server
npm run build              # Build for production
```

## Code Style

- TypeScript with strict mode
- Functional React components with hooks
- Descriptive variable names
- Comments for complex logic

## When Fixing Test Issues

1. Check if `@jest-environment node` is present (should not be!)
2. Verify `tests/setup.ts` properly overrides HTMLCanvasElement
3. For unit tests: mock dependencies
4. For integration tests: use real leaflet-node

See troubleshooting section in [Test Organization Guide](.claude/test-organization.md).
