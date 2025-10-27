# StrataLines - GPS Track Visualizer

<div align="center">
<img width="1200" height="475" alt="StrataLines Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A modern, browser-based GPS track visualization tool that supports GPX, TCX, and FIT files. StrataLines allows you to upload, visualize, and analyze multiple GPS tracks on an interactive map with customizable styling and export capabilities.

## Features

- **Multiple Format Support**: Import GPX, TCX, and FIT files
- **Compressed File Support**: Automatically handles gzipped files (`.gpx.gz`, `.tcx.gz`, `.fit.gz`)
- **Interactive Map**: Pan, zoom, and explore your tracks on multiple tile layer options
- **Track Management**: Toggle visibility, rename, and delete tracks
- **Custom Styling**: Adjust colors, line thickness, and visual properties
- **Export Functionality**: Export tracks as GPX files or map screenshots
- **Persistent Storage**: Tracks are saved in IndexedDB for offline access
- **Comprehensive Testing**: 70%+ code coverage with automated tests

## Architecture

StrataLines uses a modern build-first architecture:

### Build Process
- **TypeScript**: Strict type checking with full compilation
- **Vite**: Fast, optimized bundling for production
- **Tree-shaking**: Only includes code that's actually used
- **Code splitting**: Optimized chunk sizes for faster loading

### Testing Infrastructure
- **Vitest**: Fast, modern testing framework with watch mode
- **Coverage Reports**: Automated code coverage analysis (70%+ coverage)
- **Unit Tests**: Comprehensive test suites for all core modules
- **CI/CD Ready**: Automated testing in GitHub Actions

### Deployment
- **Cloudflare Pages**: Optimized for global CDN distribution
- **Static Build**: No server-side rendering required
- **Progressive Enhancement**: Works offline after initial load

## Quick Start

### Prerequisites
- Node.js 20+ (or 22.x)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd strata-lines

# Install dependencies
npm install
```

### Development

```bash
# Start development server with hot reload
npm run dev

# The app will be available at http://localhost:5173
```

### Testing

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Open coverage report UI
npm run test:ui
```

### Building for Production

```bash
# Type check and build
npm run build

# Preview production build locally
npm run preview
```

## Project Structure

```
strata-lines/
├── components/          # React components
│   ├── ControlsPanel.tsx
│   ├── MapComponent.tsx
│   └── DraggableBoundsBox.tsx
├── services/           # Core business logic
│   ├── db.ts          # IndexedDB operations
│   ├── gpxProcessor.ts # File parsing (GPX/TCX/FIT)
│   ├── gpxGenerator.ts # GPX export
│   └── utils.ts       # Utility functions
├── tests/             # Test suites
│   ├── setup.ts       # Test configuration
│   ├── db.test.ts
│   ├── gpxProcessor.test.ts
│   ├── gpxGenerator.test.ts
│   └── utils.test.ts
├── types.ts           # TypeScript type definitions
├── constants.ts       # App constants
├── App.tsx           # Main application component
├── index.tsx         # Application entry point
├── index.html        # HTML template
├── vite.config.ts    # Vite build configuration
├── vitest.config.ts  # Vitest test configuration
├── tsconfig.json     # TypeScript configuration
├── wrangler.toml     # Cloudflare Pages configuration
└── public/           # Static assets
    └── _headers      # Security headers
```

## Core Modules

### GPX Processor (`services/gpxProcessor.ts`)
Handles parsing of multiple GPS file formats:
- **GPX**: Standard GPS exchange format
- **TCX**: Garmin Training Center XML
- **FIT**: Garmin FIT binary format
- **Compressed files**: Automatic gzip decompression

### Track Utilities (`services/utils.ts`)
Color manipulation and geographic calculations:
- Hex/RGB/HSV color conversions
- Random color generation
- Track bounds calculation

### GPX Generator (`services/gpxGenerator.ts`)
Exports tracks to standard GPX format with proper XML structure and CDATA escaping.

### Database Service (`services/db.ts`)
IndexedDB operations for persistent track storage:
- Add/delete tracks
- Retrieve all tracks
- Clear database

## Testing

The project includes comprehensive test coverage:

- **Unit Tests**: All core modules have dedicated test suites
- **Integration Tests**: File processing workflows
- **Mock Data**: Realistic test fixtures for GPX, TCX formats
- **Coverage Thresholds**: Minimum 70% coverage enforced

Run tests with coverage:
```bash
npm run test:coverage
```

View the HTML coverage report:
```bash
open coverage/index.html
```

## Deployment

### Cloudflare Pages

The project is configured for Cloudflare Pages deployment:

1. **Build Command**: `npm run build`
2. **Build Output Directory**: `dist`
3. **Node Version**: 18+

The `wrangler.toml` file contains the configuration.

### Manual Deployment

```bash
# Build the project
npm run build

# The dist/ folder contains the deployable assets
# Upload to any static hosting service
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires support for:
- ES2022
- IndexedDB
- File API
- Web Workers

## Performance

- **Initial Load**: ~275KB gzipped JavaScript
- **Offline Support**: IndexedDB for track storage
- **Lazy Loading**: Components loaded on demand
- **Tree Shaking**: Unused code automatically removed

## Security

- Content Security Policy headers
- XSS protection
- No inline scripts
- Secure cookie handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Submit a pull request

## Development Tips

### Hot Module Replacement (HMR)
Changes to React components, styles, and most TypeScript files will hot reload without losing state.

### Type Checking
Run TypeScript type checking without building:
```bash
npm run type-check
```

### Debugging Tests
Use the Vitest UI for interactive debugging:
```bash
npm run test:ui
```

### Code Coverage
Aim for 70%+ coverage on new code. The CI will fail if coverage drops below thresholds.

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Leaflet](https://leafletjs.com/) - Interactive map library
- [React Leaflet](https://react-leaflet.js.org/) - React components for Leaflet
- [Vite](https://vitejs.dev/) - Next-generation frontend tooling
- [Vitest](https://vitest.dev/) - Blazing fast unit test framework
