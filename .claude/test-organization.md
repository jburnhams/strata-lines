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

**Purpose:** Test specific classes/functions in isolation with mocked dependencies

**Characteristics:**
- **Many tests** - cover all edge cases, error paths, and branches
- **Shallow** - test ONE specific class or function
- **Fast** - no I/O, no slow dependencies
- **Isolated** - mock all external dependencies

**Setup:** Minimal jsdom environment
- DOM APIs available
- localStorage available
- **NO leaflet-node** - never load it in unit tests
- **NO real canvas** - use mocks for canvas operations
- Use mocks freely

**Critical Rule:** Unit tests should NOT import or load leaflet-node. This keeps them fast and isolated.

**Examples:**
- `colorAssignment.test.ts` - Pure logic with many edge cases
- `exportService.test.ts` - Tests performPngExport() with mocked helpers, canvas
- `mapCalculations.test.ts` - Math functions with various inputs
- React component tests with mocked hooks

**Philosophy:** If it's not covered by integration tests, keep unit tests. Test ALL edge cases but just for the specific function.

## Integration Tests (`tests/integration/`)

**Purpose:** Test real end-to-end workflows with minimal mocking

**Characteristics:**
- **Fewer tests** - focus on critical user workflows
- **Deep** - test full end-to-end flows
- **Real** - use actual implementations (leaflet-node, canvas, etc.)
- **Slower** - acceptable since fewer tests

**Setup:** jsdom + leaflet-node
- Real Leaflet via leaflet-node
- Real canvas via @napi-rs/canvas (through leaflet-node)
- localStorage available
- Only mock external services (APIs, file system)

**Critical Rule:** Integration tests MUST use real leaflet-node and real canvas. Never mock these.

**Examples:**
- `leaflet-node-*.test.ts` - Test leaflet-node features end-to-end
- `subdivision-rendering.test.ts` - Full map rendering workflow
- `export-labels.test.ts` - Complete label rendering process

**Philosophy:** Fewer tests but each one exercises a complete user-facing workflow.

## Key Rules

### Unit Tests
✅ Mock external dependencies
✅ Fast, isolated tests
✅ Test logic without I/O
✅ Mock canvas operations (createCanvas, getContext, toBlob, etc.)
❌ **NEVER load leaflet-node in unit tests**
❌ **NEVER load @napi-rs/canvas in unit tests**
❌ Don't use real implementations that slow down tests

### Integration Tests
✅ Use real leaflet-node (never mock)
✅ Use real canvas operations via leaflet-node
✅ Test actual workflows
✅ Use `createTestMap()` and `cleanupTestMaps()` from leaflet-node/testing
❌ Don't mock canvas, DOM, or leaflet
❌ **NEVER mock leaflet-node** - if you need mocks, it's a unit test

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
