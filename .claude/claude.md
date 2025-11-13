# Claude AI Assistant Instructions

## Project Overview
Web app for visualizing GPS tracks on maps with export capabilities using Leaflet and leaflet-node.

## Important: Read First
**[Test Organization](.claude/test-organization.md)** - Test structure and best practices

## Test Structure

- `tests/unit/` - Unit tests with mocks, minimal setup
- `tests/integration/` - Integration tests with real leaflet-node, no mocking canvas/DOM

**Key:** Unit tests mock dependencies; integration tests use real leaflet-node and canvas.

## Commands

```bash
npm test                  # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run dev               # Dev server
npm run build             # Production build
```

## Critical Rules

1. **Never add `@jest-environment node`** - breaks localStorage
2. **Unit tests** - Mock freely
3. **Integration tests** - Never mock canvas, DOM, or leaflet
4. **Both use jsdom** - Provides localStorage and DOM APIs

See [Test Organization](.claude/test-organization.md) for full details.
