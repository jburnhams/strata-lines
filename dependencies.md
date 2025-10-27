# StrataLines Dependencies

## Overview: A "Build-less" Architecture

StrataLines employs a modern, "build-less" frontend architecture. Instead of using a traditional bundler like Webpack or Vite to package all application code and dependencies into a few large JavaScript files, it relies on native browser features:

1.  **ES Modules (ESM)**: The application code is written in standard JavaScript modules (`import`/`export`), which modern browsers can understand and load natively.
2.  **Import Map**: A special `<script type="importmap">` tag in `index.html` acts as a lookup table for the browser. It maps "bare module specifiers" (like `react` or `leaflet`) to full CDN URLs.

When the browser encounters `import React from 'react'`, it consults the import map and fetches the React library directly from the specified CDN URL. This approach simplifies the development setup, eliminates a slow build step, and leverages the browser's own module loader and caching mechanisms.

All third-party dependencies are loaded from the `aistudiocdn.com` content delivery network.

---

## Core Dependencies

### UI & Rendering

-   **React (`react`, `react-dom`)**
    -   **Role**: The fundamental UI library for building the application's component-based interface.
    -   **Usage**: Manages the entire component tree, application state (via hooks like `useState` and `useEffect`), and the rendering lifecycle. It provides the declarative structure for the entire application.

-   **Tailwind CSS**
    -   **Role**: A utility-first CSS framework used for all styling.
    -   **Usage**: It's loaded directly via a `<script>` tag from its CDN. Tailwind allows for rapid and consistent styling of components directly in the JSX, eliminating the need for separate CSS files.

### Mapping

-   **Leaflet (`leaflet`)**
    -   **Role**: A powerful and lightweight open-source library for interactive maps.
    -   **Usage**: It's the core mapping engine that handles rendering tile layers, drawing vector shapes (the track polylines), and managing map interactions like panning and zooming.

-   **React Leaflet (`react-leaflet`)**
    -   **Role**: A crucial bridge providing React components that wrap Leaflet's imperative API.
    -   **Usage**: This library allows us to manage the map in a declarative, React-friendly way. We use components like `<MapContainer>`, `<TileLayer>`, and `<Polyline>` instead of manually manipulating the Leaflet map object.

### Data Parsing & Processing

-   **GPX Parser (`gpxparser`)**
    -   **Role**: A specialized library for parsing the XML structure of GPX files.
    -   **Usage**: Used in the `gpxProcessor.ts` service to read `.gpx` files and extract the track name and a list of latitude/longitude coordinates.

-   **Garmin FIT SDK (`@garmin/fitsdk`)**
    -   **Role**: The official JavaScript SDK from Garmin for decoding the binary FIT (Flexible and Interoperable Data Transfer) protocol.
    -   **Usage**: Used in `gpxProcessor.ts` to parse `.fit` files, a common format from Garmin GPS devices and other fitness trackers.

-   **Pako (`pako`)**
    -   **Role**: A high-performance JavaScript implementation of the zlib compression library.
    -   **Usage**: It allows the application to handle `.gz` compressed files entirely on the client side. When a user uploads a `track.gpx.gz`, Pako decompresses it in the browser before passing the content to the appropriate parser.

### Export Functionality

-   **HTML to Canvas (`html2canvas`)**
    -   **Role**: The core engine behind the high-resolution image export feature.
    -   **Usage**: It programmatically captures a DOM element (an off-screen Leaflet map) and renders it onto an HTML `<canvas>` element. This canvas is then converted into a downloadable PNG image. It's essential for creating the stitched, high-resolution final output.

-   **JSZip (`jszip`)**
    -   **Role**: A library for creating, reading, and editing `.zip` files in JavaScript.
    -   **Usage**: Powers two key features: the "Download All Tracks" button (which creates a zip archive of all tracks as individual GPX files) and the advanced "Export to ZIP" functionality (which packages all rendered map tiles and stitched layer images for large exports).
