# Test Organization

## Directory Structure

```
tests/
├── unit/           # Unit tests with mocks
│   ├── setup.ts    # Minimal setup (jsdom, no leaflet-node)
│   └── *.test.ts   # Unit tests
└── integration/    # Integration tests with real leaflet-node
    ├── setup.ts    # Full setup (jsdom + leaflet-node + canvas polyfills)
    └── *.test.ts   # Integration tests
```

## Unit Tests (`tests/unit/`)

**Purpose:** Test logic in isolation with mocked dependencies

**Setup:** Minimal jsdom environment
- DOM APIs available
- localStorage available
- NO leaflet-node (mock it if needed)
- Use mocks freely

**Examples:**
- `colorAssignment.test.ts` - Pure logic
- `exportService.test.ts` - Mocks exportHelpers, image-stitch
- `mapCalculations.test.ts` - Math functions
- React component tests with mocked hooks

## Integration Tests (`tests/integration/`)

**Purpose:** Test real functionality with minimal mocking

**Setup:** jsdom + leaflet-node
- Real Leaflet via leaflet-node
- Real canvas with polyfilled methods
- localStorage available
- Only mock external services (APIs, file system)

**Examples:**
- `leaflet-node-*.test.ts` - Test leaflet-node features
- `subdivision-rendering.test.ts` - Real map rendering
- `export-labels.test.ts` - Real label rendering

## Key Rules

### Unit Tests
✅ Mock external dependencies
✅ Fast, isolated tests
✅ Test logic without I/O

### Integration Tests
✅ Use real leaflet-node (never mock)
✅ Use real canvas operations
✅ Test actual workflows
❌ Don't mock canvas, DOM, or leaflet

## Running Tests

```bash
npm test                  # Run all (unit + integration)
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # With coverage
```

## Common Issues

**localStorage error:** All tests now use jsdom (has localStorage)
**Canvas errors:** Integration tests have canvas polyfills in setup.ts
**Leaflet undefined:** Check you're in integration/ not unit/
